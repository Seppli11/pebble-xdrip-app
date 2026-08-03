#include <stdint.h>
#include "errors.h"

typedef enum {
    NET_DIRECTION_FLAT = 0,
    NET_DIRECTION_FORTY_FIVE_UP = 1,
    NET_DIRECTION_FORTY_FIVE_DOWN = 2,
    NET_DIRECTION_SINGLE_UP = 3,
    NET_DIRECTION_SINGLE_DOWN = 4,
    NET_DIRECTION_DOUBLE_UP = 5,
    NET_DIRECTION_DOUBLE_DOWN = 6,
    NET_DIRECTION_UNKNOWN = -1,
} NetDirection;


int32_t net_get_glucose();
NetDirection net_get_direction();
// Unix seconds of the latest CGM reading (from the sgv record's `date` field),
// 0 until the first reading arrives. Used to display reading time and age.
int32_t net_get_reading_time();

typedef void (*NetDataUpdateHandler)(void);
void net_set_data_update_handler(NetDataUpdateHandler handler);

typedef void (*NetErrorHandler)(ErrorCode error);
void net_set_error_handler(NetErrorHandler handler);

void net_init();
// Cancel the no-data timeout timer (call when an error is handled locally
// before the timer fires, or when the watch reports its own error and the
// pkjs timeout no longer applies).
void net_cancel_timeout(void);
// Start (or restart) the no-data timeout timer.
void net_start_timeout(void);
