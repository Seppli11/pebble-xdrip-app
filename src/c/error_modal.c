#include <pebble.h>

#include "error_modal.h"
#include "errors.h"

#define MODAL_AUTO_DISMISS_MS (60 * 1000)

static Window *s_modal_window;
static TextLayer *s_title_layer;
static TextLayer *s_message_layer;
static ErrorCode s_pending_error = 0;
static bool s_showing;
static AppTimer *s_auto_dismiss_timer;

static void prv_auto_dismiss_handler(void *data);

static void prv_modal_window_unload(Window *window) {
  if (s_auto_dismiss_timer) {
    app_timer_cancel(s_auto_dismiss_timer);
    s_auto_dismiss_timer = NULL;
  }
  text_layer_destroy(s_title_layer);
  s_title_layer = NULL;
  text_layer_destroy(s_message_layer);
  s_message_layer = NULL;
  window_destroy(s_modal_window);
  s_modal_window = NULL;
  s_showing = false;
}

static void prv_modal_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  GFont title_font = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  GFont message_font = fonts_get_system_font(FONT_KEY_GOTHIC_18);

  const int16_t title_height = 2 * (bounds.size.h - 16) / 5;

  s_title_layer = text_layer_create(GRect(0, 16, bounds.size.w, title_height));
  text_layer_set_text_alignment(s_title_layer, GTextAlignmentCenter);
  text_layer_set_font(s_title_layer, title_font);
  text_layer_set_overflow_mode(s_title_layer, GTextOverflowModeWordWrap);
  text_layer_set_background_color(s_title_layer, GColorBlack);
  text_layer_set_text_color(s_title_layer, GColorWhite);
  layer_add_child(window_layer, text_layer_get_layer(s_title_layer));

  s_message_layer = text_layer_create(
      GRect(0, 16 + title_height, bounds.size.w, bounds.size.h - 16 - title_height));
  text_layer_set_text_alignment(s_message_layer, GTextAlignmentCenter);
  text_layer_set_font(s_message_layer, message_font);
  text_layer_set_overflow_mode(s_message_layer, GTextOverflowModeWordWrap);
  text_layer_set_background_color(s_message_layer, GColorBlack);
  text_layer_set_text_color(s_message_layer, GColorWhite);
  layer_add_child(window_layer, text_layer_get_layer(s_message_layer));

  const char *title;
  const char *message;
  switch (s_pending_error) {
    case ERROR_GLUCOSE_NETWORK:
      title = "Fetch Failed";
      message = "Can't reach xDrip.\nCheck it's running.";
      break;
    case ERROR_GLUCOSE_HTTP:
      title = "Fetch Failed";
      message = "Bad response\nfrom xDrip.";
      break;
    case ERROR_GLUCOSE_PARSE:
      title = "Fetch Failed";
      message = "xDrip returned\nan error.";
      break;
    case ERROR_GLUCOSE_EMPTY:
      title = "No Data";
      message = "xDrip returned\nno glucose records.";
      break;
    case ERROR_NO_PHONE_CONNECTION:
      title = "No Phone";
      message = "Connect your phone\nand relaunch.";
      break;
    case ERROR_GLUCOSE_TIMEOUT:
      title = "No Data";
      message = "No glucose received.\nRelaunch later.";
      break;
    default:
      title = "Error";
      message = "Unknown error.";
      break;
  }
  text_layer_set_text(s_title_layer, title);
  text_layer_set_text(s_message_layer, message);
}

void error_modal_show(ErrorCode error) {
  if (s_showing) {
    return;
  }
  s_showing = true;
  s_pending_error = error;

  s_modal_window = window_create();
  window_set_background_color(s_modal_window, GColorBlack);
  window_set_window_handlers(s_modal_window, (WindowHandlers) {
    .load = prv_modal_window_load,
    .unload = prv_modal_window_unload,
  });
  window_stack_push(s_modal_window, true);

  s_auto_dismiss_timer = app_timer_register(MODAL_AUTO_DISMISS_MS, prv_auto_dismiss_handler, NULL);
}

void error_modal_dismiss(void) {
  if (!s_showing || !s_modal_window) {
    return;
  }
  window_stack_remove(s_modal_window, true);
}

static void prv_auto_dismiss_handler(void *data) {
  s_auto_dismiss_timer = NULL;
  error_modal_dismiss();
}
