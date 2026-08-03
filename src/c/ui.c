#include "ui.h"

#include <pebble.h>
#include <time.h>

#include "net.h"
#include "error_modal.h"
#include "errors.h"

#define DIRECTION_GAP 6
#define GLUCOSE_LAYER_Y 72
#define INFO_LINE_Y (GLUCOSE_LAYER_Y + 38)

static Window *window;
static StatusBarLayer *status_bar_layer;
static TextLayer *glucose_text_layer;
static BitmapLayer *direction_bitmap_layer;
static GBitmap *direction_bitmap = NULL;
static GFont s_glucose_font;
static TextLayer *info_text_layer;
static int16_t s_screen_w;
static int16_t s_screen_h;

// Current glucose text and direction, used by layout() to position both layers
// as a centered pair.
static char glucose_text[11];
static NetDirection current_direction = NET_DIRECTION_UNKNOWN;

// Long-lived buffer for the info line. text_layer_set_text() does NOT copy the
// string, so the buffer must outlive the layer (stack buffers are not safe).
static char info_text[32];

// Width of the arrow bitmap for a given direction (0 for UNKNOWN / blank).
static int direction_bitmap_width(NetDirection direction) {
  switch (direction) {
    case NET_DIRECTION_DOUBLE_UP:
    case NET_DIRECTION_DOUBLE_DOWN:
      return 40;  // double arrows are 40 px wide
    case NET_DIRECTION_SINGLE_UP:
    case NET_DIRECTION_SINGLE_DOWN:
    case NET_DIRECTION_FORTY_FIVE_UP:
    case NET_DIRECTION_FORTY_FIVE_DOWN:
    case NET_DIRECTION_FLAT:
      return 20;  // single arrows are 20 px wide
    case NET_DIRECTION_UNKNOWN:
    default:
      return 0;
  }
}

// Reposition the glucose text layer and the direction bitmap layer so the pair
// (text + gap + arrow) is horizontally centered. The glucose text is
// right-aligned within its layer so it hugs the arrow; the arrow layer is sized
// to the arrow bitmap so there is no empty padding shifting the visual center.
static void layout(void) {
  GSize glucose_size = graphics_text_layout_get_content_size(
      glucose_text, s_glucose_font,
      GRect(0, 0, s_screen_w, 100),
      GTextOverflowModeWordWrap, GTextAlignmentLeft);

  int dir_w = direction_bitmap_width(current_direction);
  int pair_width = glucose_size.w + DIRECTION_GAP + dir_w;
  int glucose_x = (s_screen_w - pair_width) / 2;
  int direction_x = glucose_x + glucose_size.w + DIRECTION_GAP;

  layer_set_frame(text_layer_get_layer(glucose_text_layer),
                  GRect(glucose_x, GLUCOSE_LAYER_Y, glucose_size.w, s_screen_h - GLUCOSE_LAYER_Y));
  layer_set_frame(bitmap_layer_get_layer(direction_bitmap_layer),
                  GRect(direction_x, GLUCOSE_LAYER_Y, dir_w, 20));
}

static void prv_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  s_screen_w = bounds.size.w;
  s_screen_h = bounds.size.h;

  s_glucose_font = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);

  glucose_text_layer = text_layer_create(GRect(0, GLUCOSE_LAYER_Y, s_screen_w, s_screen_h - GLUCOSE_LAYER_Y));
  text_layer_set_text(glucose_text_layer, "Loading");
  // Right-align so the text hugs the direction arrow regardless of its width.
  text_layer_set_text_alignment(glucose_text_layer, GTextAlignmentRight);
  text_layer_set_font(glucose_text_layer, s_glucose_font);
  layer_add_child(window_layer, text_layer_get_layer(glucose_text_layer));

  direction_bitmap_layer = bitmap_layer_create(GRect(0, GLUCOSE_LAYER_Y, 0, 20));
  // GCompOpSet makes transparent pixels show the background through the arrow.
  bitmap_layer_set_compositing_mode(direction_bitmap_layer, GCompOpSet);
  bitmap_layer_set_bitmap(direction_bitmap_layer, NULL);
  layer_add_child(window_layer, bitmap_layer_get_layer(direction_bitmap_layer));

  status_bar_layer = status_bar_layer_create();
  layer_add_child(window_layer, status_bar_layer_get_layer(status_bar_layer));

  // Info line under the glucose/arrow pair: reading time + reading age
  // (e.g. "14:32 · 3m ago"). Blank until the first reading arrives.
  info_text_layer = text_layer_create(GRect(0, INFO_LINE_Y, s_screen_w, 20));
  text_layer_set_text_alignment(info_text_layer, GTextAlignmentCenter);
  text_layer_set_font(info_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  // Set colors explicitly: on some firmware the default text color is white,
  // which would be invisible on the white window background.
  text_layer_set_background_color(info_text_layer, GColorClear);
  text_layer_set_text_color(info_text_layer, GColorBlack);
  text_layer_set_text(info_text_layer, "");
  layer_add_child(window_layer, text_layer_get_layer(info_text_layer));

  // Initial layout for "Loading" + blank direction.
  snprintf(glucose_text, sizeof(glucose_text), "Loading");
  layout();
}

static void prv_window_unload(Window *window) {
  text_layer_destroy(glucose_text_layer);
  bitmap_layer_destroy(direction_bitmap_layer);
  text_layer_destroy(info_text_layer);
  if (direction_bitmap) {
    gbitmap_destroy(direction_bitmap);
    direction_bitmap = NULL;
  }
}

void ui_init() {
  window = window_create();

  window_set_window_handlers(window, (WindowHandlers) {
    .load = prv_window_load,
    .unload = prv_window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);

  net_set_data_update_handler(update_ui);

  // Report any error from the net layer as a modal alert.
  net_set_error_handler(error_modal_show);

  // Check the phone connection at launch. If there's no connection, pkjs
  // can't run, so show the no-phone modal. The net no-data timeout is not
  // armed in this case (see net_init).
  //
  // NOTE: For future runtime BT drops while the app is open, hook a
  // connection_service_subscribe() handler here to call
  // error_modal_show(ERROR_NO_PHONE_CONNECTION) on disconnect.
  if (!connection_service_peek_pebble_app_connection()) {
    error_modal_show(ERROR_NO_PHONE_CONNECTION);
  }
}

void ui_deinit() {
  window_destroy(window);
}

static void update_glucose_text(int glucose) {
  int whole = glucose / 10;
  int frac = glucose % 10;

  snprintf(glucose_text, sizeof(glucose_text), "%d.%d mmol/L", whole, frac);
  text_layer_set_text(glucose_text_layer, glucose_text);

  vibes_short_pulse();
}

static void update_direction_bitmap(NetDirection direction) {
  if (direction_bitmap) {
    gbitmap_destroy(direction_bitmap);
    direction_bitmap = NULL;
  }

  uint32_t resource_id = 0;
  switch (direction) {
    case NET_DIRECTION_DOUBLE_UP:        resource_id = RESOURCE_ID_ARROW_DOUBLE_UP;        break;
    case NET_DIRECTION_SINGLE_UP:        resource_id = RESOURCE_ID_ARROW_SINGLE_UP;        break;
    case NET_DIRECTION_FORTY_FIVE_UP:     resource_id = RESOURCE_ID_ARROW_FORTY_FIVE_UP;    break;
    case NET_DIRECTION_FLAT:             resource_id = RESOURCE_ID_ARROW_FLAT;            break;
    case NET_DIRECTION_FORTY_FIVE_DOWN:   resource_id = RESOURCE_ID_ARROW_FORTY_FIVE_DOWN;  break;
    case NET_DIRECTION_SINGLE_DOWN:       resource_id = RESOURCE_ID_ARROW_SINGLE_DOWN;      break;
    case NET_DIRECTION_DOUBLE_DOWN:       resource_id = RESOURCE_ID_ARROW_DOUBLE_DOWN;      break;
    case NET_DIRECTION_UNKNOWN:           resource_id = 0;                                 break;
  }

  if (resource_id) {
    direction_bitmap = gbitmap_create_with_resource(resource_id);
  }
  bitmap_layer_set_bitmap(direction_bitmap_layer, direction_bitmap);

  current_direction = direction;
}

// Render "<reading time> · <age>" under the glucose value. Age is the age of
// the CGM reading itself (from the sgv date), not the age of the fetch.
static void update_info_line(void) {
  int32_t reading_time = net_get_reading_time();
  if (reading_time <= 0) {
    text_layer_set_text(info_text_layer, "");
    return;
  }

  time_t t = (time_t)reading_time;
  struct tm *ltm = localtime(&t);
  char time_str[6];
  strftime(time_str, sizeof(time_str), clock_is_24h_style() ? "%H:%M" : "%I:%M", ltm);

  int age_seconds = (int)(time(NULL) - t);
  if (age_seconds < 0) {
    age_seconds = 0;  // guard against phone/watch clock skew
  }
  int age_minutes = age_seconds / 60;

  // Compact age so the line always fits on screen (a very stale reading would
  // otherwise overflow the 144 px-wide display).
  char age_str[16];
  if (age_minutes < 1) {
    snprintf(age_str, sizeof(age_str), "just now");
  } else if (age_minutes < 60) {
    snprintf(age_str, sizeof(age_str), "%dm ago", age_minutes);
  } else if (age_minutes < 24 * 60) {
    snprintf(age_str, sizeof(age_str), "%dh %dm ago", age_minutes / 60, age_minutes % 60);
  } else {
    snprintf(age_str, sizeof(age_str), "%dd ago", age_minutes / (24 * 60));
  }

  snprintf(info_text, sizeof(info_text), "%s | %s", time_str, age_str);
  text_layer_set_text(info_text_layer, info_text);
}

void update_ui() {
  APP_LOG(APP_LOG_LEVEL_INFO, "Update glucose to: %d", net_get_glucose());
  update_glucose_text(net_get_glucose());
  update_direction_bitmap(net_get_direction());
  update_info_line();
  layout();

  // A successful update means the last error is resolved: clear the modal.
  error_modal_dismiss();
}
