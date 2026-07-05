// Mirror of src/c/errors.h. pkjs sends these numeric values to the watch
// via AppMessage's `error_code` key; the watch maps them to its ErrorCode enum.

var ErrorCodes = {
  // pkjs-originated errors (glucose fetch failures)
  GLUCOSE_NETWORK: 1,
  GLUCOSE_HTTP: 2,
  GLUCOSE_PARSE: 3,
  GLUCOSE_EMPTY: 4,

  // Watch-originated errors (kept here for reference / future use)
  NO_PHONE_CONNECTION: 100,
  GLUCOSE_TIMEOUT: 101,
};

if (typeof module !== 'undefined') {
  module.exports = ErrorCodes;
}
