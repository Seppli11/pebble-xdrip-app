#include <stdint.h>

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

typedef void (*NetDataUpdateHandler)(void);
void net_set_data_update_handler(NetDataUpdateHandler handler);

void net_init();
