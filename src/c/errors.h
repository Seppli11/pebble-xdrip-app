#pragma once

// Shared error codes between the watch (C) and pkjs (JS). pkjs sends the
// pkjs-originated values (1-4) to the watch via AppMessage's `error_code` key;
// the watch also generates its own errors (100-101) locally.
typedef enum {
  // pkjs-originated errors (glucose fetch failures)
  ERROR_GLUCOSE_NETWORK = 1,
  ERROR_GLUCOSE_HTTP = 2,
  ERROR_GLUCOSE_PARSE = 3,
  ERROR_GLUCOSE_EMPTY = 4,

  // Watch-originated errors
  ERROR_NO_PHONE_CONNECTION = 100,
  ERROR_GLUCOSE_TIMEOUT = 101,
} ErrorCode;
