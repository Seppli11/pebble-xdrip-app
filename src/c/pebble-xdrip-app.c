#include <pebble.h>

#include "net.h"
#include "ui.h"


static void prv_init(void) {
  ui_init();
  net_init();
}

static void prv_deinit(void) {
  ui_deinit();
}

int main(void) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Starting Pebble Xdrip App");
  prv_init();

  app_event_loop();
  prv_deinit();
}
