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

test('ready event sends latest glucose (85 = 8.5 mmol/L × 10), direction (FortyFiveUp = 1) and reading date via sendAppMessage', (t) => {
  // Mock timers so the auto-update loop armed by the ready handler can't keep
  // the Node process alive after the test finishes.
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const { pebble, xhr, consoleLogs } = loadIndex();
  xhr.route('GET', 'sgv.json', () => ({ status: 200, body: fixtureBody }));

  pebble.fire('ready');

  assert.equal(pebble.messages.length, 1, 'expected one sendAppMessage call');
  assert.deepEqual(pebble.messages[0].message, { glucose: 85, direction: 1, sgv_date: 1783018997 });
  assert.ok(
    consoleLogs.some((l) => l.indexOf('PebbleKit JS ready') !== -1),
    'expected ready log line, got: ' + JSON.stringify(consoleLogs)
  );
  assert.ok(
    consoleLogs.some((l) => l.indexOf('Latest glucose') !== -1),
    'expected latest glucose log line, got: ' + JSON.stringify(consoleLogs)
  );
});

// Auto-update loop tests. The loop is driven by (mocked) timers: after each
// fetch completes the next attempt is scheduled 60 s later.

test('auto-update: a second fetch happens ~60s after a successful one and sends fresh data', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { pebble, xhr } = loadIndex();
  xhr.route('GET', 'sgv.json', () => ({ status: 200, body: fixtureBody }));

  pebble.fire('ready');
  assert.equal(pebble.messages.length, 1, 'initial fetch should send one message');

  t.mock.timers.tick(60000);
  assert.equal(pebble.messages.length, 2, 'next update should fire one minute later');
  assert.deepEqual(pebble.messages[1].message, { glucose: 85, direction: 1, sgv_date: 1783018997 });
});

test('auto-update: a failed fetch does not stop the loop; the next success sends data', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { pebble, xhr } = loadIndex();
  let calls = 0;
  xhr.route('GET', 'sgv.json', () => {
    calls++;
    if (calls === 1) {
      return { status: 500, body: 'boom' };
    }
    return { status: 200, body: fixtureBody };
  });

  pebble.fire('ready');
  assert.equal(pebble.messages.length, 1, 'initial failed fetch should send an error');
  assert.deepEqual(pebble.messages[0].message, { error_code: 2 }, 'expected GLUCOSE_HTTP');

  t.mock.timers.tick(60000);
  assert.equal(pebble.messages.length, 2, 'loop should retry after the error');
  assert.deepEqual(pebble.messages[1].message, { glucose: 85, direction: 1, sgv_date: 1783018997 });
});

test('auto-update: no second fetch starts while one is still in flight', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { pebble, xhr } = loadIndex();
  xhr.route('GET', 'sgv.json', () => ({ status: 200, body: fixtureBody, delay: 10000 }));

  // Firing 'ready' twice is the re-entrancy case the in-flight guard protects
  // against: the second call must not start another fetch.
  pebble.fire('ready');
  pebble.fire('ready');
  assert.equal(xhr.requests.length, 1, 'only one fetch may be in flight');

  t.mock.timers.tick(10000); // let the in-flight fetch complete
  assert.equal(pebble.messages.length, 1);

  t.mock.timers.tick(60000); // next cycle, one minute after completion
  assert.equal(xhr.requests.length, 2);
});

test('auto-update: a hung fetch triggers the watchdog error and the loop continues', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { pebble, xhr } = loadIndex();
  let calls = 0;
  xhr.route('GET', 'sgv.json', () => {
    calls++;
    if (calls === 1) {
      return { hang: true }; // never responds
    }
    return { status: 200, body: fixtureBody };
  });

  pebble.fire('ready');
  assert.equal(pebble.messages.length, 0, 'nothing sent while the fetch is hung');

  t.mock.timers.tick(45000); // watchdog (FETCH_WATCHDOG_MS) fires
  assert.equal(pebble.messages.length, 1, 'watchdog should report a network error');
  assert.deepEqual(pebble.messages[0].message, { error_code: 1 }, 'expected GLUCOSE_NETWORK');

  t.mock.timers.tick(60000); // next attempt, one minute after the watchdog
  assert.equal(pebble.messages.length, 2, 'loop should continue after the watchdog error');
  assert.deepEqual(pebble.messages[1].message, { glucose: 85, direction: 1, sgv_date: 1783018997 });
});
