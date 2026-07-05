const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadIndex } = require('./harness/load');

const fixturePath = path.resolve(__dirname, 'fixtures', 'sgv.json');
const fixtureBody = fs.readFileSync(fixturePath, 'utf8');

test('index.js registers a ready listener on Pebble', () => {
  const { pebble } = loadIndex();
  assert.ok(
    pebble.listeners.ready && pebble.listeners.ready.length > 0,
    'expected a "ready" listener to be registered'
  );
});

test('ready event sends latest glucose (85 = 8.5 mmol/L × 10) and direction (FortyFiveUp = 1) via sendAppMessage', () => {
  const { pebble, xhr, consoleLogs } = loadIndex();
  xhr.route('GET', 'sgv.json', () => ({ status: 200, body: fixtureBody }));

  pebble.fire('ready');

  assert.equal(pebble.messages.length, 1, 'expected one sendAppMessage call');
  assert.deepEqual(pebble.messages[0].message, { glucose: 85, direction: 1 });
  assert.ok(
    consoleLogs.some((l) => l.indexOf('PebbleKit JS ready') !== -1),
    'expected ready log line, got: ' + JSON.stringify(consoleLogs)
  );
  assert.ok(
    consoleLogs.some((l) => l.indexOf('Latest glucose') !== -1),
    'expected latest glucose log line, got: ' + JSON.stringify(consoleLogs)
  );
});
