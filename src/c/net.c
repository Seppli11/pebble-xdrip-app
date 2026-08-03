#include "net.h"

#include <stdbool.h>
#include <pebble.h>
#include <stdint.h>
#include "message_keys.auto.h"

static NetDataUpdateHandler data_update_handler = NULL;
static NetErrorHandler error_handler = NULL;

// No-data timeout: if we don't receive either glucose data or an error_code
// within this many milliseconds, we fire ERROR_GLUCOSE_TIMEOUT.
#define NET_NO_DATA_TIMEOUT_MS (30 * 1000)
static AppTimer *s_no_data_timer = NULL;

void net_set_data_update_handler(NetDataUpdateHandler handler) {
    data_update_handler = handler;
}

void net_set_error_handler(NetErrorHandler handler) {
    error_handler = handler;
}

static void invoke_data_update_handler() {
    if(data_update_handler) {
        data_update_handler();
    }
}

static void invoke_error_handler(ErrorCode error) {
    if(error_handler) {
        error_handler(error);
    }
}

static void prv_no_data_timeout_handler(void *context) {
    s_no_data_timer = NULL;
    APP_LOG(APP_LOG_LEVEL_WARNING, "No glucose data received within timeout");
    invoke_error_handler(ERROR_GLUCOSE_TIMEOUT);
}

void net_cancel_timeout(void) {
    if (s_no_data_timer) {
        app_timer_cancel(s_no_data_timer);
        s_no_data_timer = NULL;
    }
}

void net_start_timeout(void) {
    net_cancel_timeout();
    s_no_data_timer = app_timer_register(NET_NO_DATA_TIMEOUT_MS,
                                         prv_no_data_timeout_handler, NULL);
}


static int32_t glucose = -1;

int32_t net_get_glucose() {
    return glucose;
}

static int32_t reading_time = 0;

int32_t net_get_reading_time() {
    return reading_time;
}

static NetDirection direction = NET_DIRECTION_UNKNOWN;

NetDirection net_get_direction() {
    return direction;
}

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Received message");

  Tuple *error_code_tuple = dict_find(iter, MESSAGE_KEY_error_code);
  if(error_code_tuple) {
    ErrorCode code = (ErrorCode)error_code_tuple->value->int32;
    APP_LOG(APP_LOG_LEVEL_WARNING, "Received error_code: %d", code);
    net_cancel_timeout();
    invoke_error_handler(code);
    return;
  }

  Tuple *glucose_tuple = dict_find(iter, MESSAGE_KEY_glucose);
  if(glucose_tuple) {
    glucose = glucose_tuple->value->int32;
    APP_LOG(APP_LOG_LEVEL_INFO, "Received glucose: %d", glucose);
  }

  Tuple *direction_code_tuple = dict_find(iter, MESSAGE_KEY_direction);
  if(direction_code_tuple) {
    direction = (NetDirection)direction_code_tuple->value->int32;
    APP_LOG(APP_LOG_LEVEL_INFO, "Received direction code: %d", direction);
  }

  Tuple *date_tuple = dict_find(iter, MESSAGE_KEY_sgv_date);
  if(date_tuple) {
    reading_time = date_tuple->value->int32;
    APP_LOG(APP_LOG_LEVEL_INFO, "Received reading date: %d", reading_time);
  }

  // Success path: glucose (or at least direction) arrived, so the pkjs fetch
  // worked. Cancel the no-data timeout.
  if(glucose_tuple || direction_code_tuple) {
    net_cancel_timeout();
  }
  invoke_data_update_handler();
}

static void inbox_dropped_handler(AppMessageResult reason, void *context) {
}

static void outbox_sent_handler(DictionaryIterator *iter, void *context) {
}

static void outbox_failed_handler(DictionaryIterator *iter, AppMessageResult reason, void *context) {
}

void net_init() {
    app_message_register_inbox_received(inbox_received_handler);
    app_message_register_inbox_dropped(inbox_dropped_handler);
    app_message_register_outbox_sent(outbox_sent_handler);
    app_message_register_outbox_failed(outbox_failed_handler);

    app_message_open(app_message_inbox_size_maximum(),
                     app_message_outbox_size_maximum());

    // Start the no-data timeout only if we have a phone connection; without
    // one pkjs can't run, so a timeout would never be satisfied anyway (the
    // UI layer reports the no-phone error in that case).
    if (connection_service_peek_pebble_app_connection()) {
        net_start_timeout();
    }
}
