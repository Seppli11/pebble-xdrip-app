// Loads src/pkjs/index.js in a Node environment with mocked globals.
// Returns the recorded Pebble listeners/messages and the xhr mocks so tests
// can drive behavior without touching the real Pebble runtime.

const path = require('path');
const { createPebbleMock } = require('./pebble-mock');
const { createXhrMock } = require('./xhr-mock');

function loadIndex() {
  const pebble = createPebbleMock();
  const xhr = createXhrMock();

  const consoleLogs = [];
  const consoleSpy = {
    log: (...args) => consoleLogs.push(args.join(' ')),
    warn: (...args) => consoleLogs.push('[warn] ' + args.join(' ')),
    error: (...args) => consoleLogs.push('[error] ' + args.join(' ')),
  };

  // Save and override globals.
  const saved = {
    Pebble: global.Pebble,
    XMLHttpRequest: global.XMLHttpRequest,
    console: global.console,
  };

  global.Pebble = pebble;
  global.XMLHttpRequest = xhr.XMLHttpRequest;
  global.console = consoleSpy;

  // Clear require cache so each load is fresh.
  const indexPath = path.resolve(__dirname, '..', '..', '..', 'src', 'pkjs', 'index.js');
  delete require.cache[require.resolve(indexPath)];
  const indexExports = require(indexPath);

  // Globals remain installed so tests can fire Pebble listeners after
  // loading. Each loadIndex() call reassigns them, so cross-test pollution
  // is not a concern.

  return {
    pebble,
    xhr,
    consoleLogs,
    fetchGlucose: indexExports.fetchGlucose,
  };
}

module.exports = { loadIndex };
