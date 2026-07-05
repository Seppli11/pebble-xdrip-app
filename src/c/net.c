#include "net.h"

#include <stdbool.h>
#include <pebble.h>
#include <stdint.h>
#include "message_keys.auto.h"

static NetDataUpdateHandler data_update_handler = NULL;

void net_set_data_update_handler(NetDataUpdateHandler handler) {
    data_update_handler = handler;
}

static void invoke_data_update_handler() {
    if(data_update_handler) {
        data_update_handler();
    }
}


static int32_t glucose = -1;

int32_t net_get_glucose() {
    return glucose;
}

static NetDirection direction = NET_DIRECTION_UNKNOWN;

NetDirection net_get_direction() {
    return direction;
}

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Received message");
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
}
