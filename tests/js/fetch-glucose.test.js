const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadIndex } = require('./harness/load');

const fixturePath = path.resolve(__dirname, 'fixtures', 'sgv.json');
const fixtureBody = fs.readFileSync(fixturePath, 'utf8');

test('fetchGlucose success: onSuccess receives a GlucoseModel', () => {
  const env = loadIndex();
  env.xhr.route('GET', 'sgv.json', () => ({ status: 200, body: fixtureBody }));

  let successModel = null;
  let errorMessage = null;
  env.fetchGlucose(
    (m) => { successModel = m; },
    (msg) => { errorMessage = msg; }
  );

  assert.equal(errorMessage, null, 'onError should not be called');
  assert.ok(successModel, 'onSuccess should be called with a model');
  const expectedCount = JSON.parse(fixtureBody).length;
  assert.equal(successModel.count(), expectedCount);
  assert.equal(successModel.latestMgdl(), 153);
  assert.equal(successModel.latestMmol(), 8.5);
});

test('fetchGlucose on HTTP 500 calls onError', () => {
  const env = loadIndex();
  env.xhr.route('GET', 'sgv.json', () => ({ status: 500, body: 'boom' }));

  let called = false;
  let errorMessage = null;
  env.fetchGlucose(
    () => { called = true; },
    (msg) => { errorMessage = msg; }
  );

  assert.equal(called, false, 'onSuccess should not be called');
  assert.ok(errorMessage.indexOf('500') !== -1, 'error should mention status, got: ' + errorMessage);
});

test('fetchGlucose on malformed JSON calls onError', () => {
  const env = loadIndex();
  env.xhr.route('GET', 'sgv.json', () => ({ status: 200, body: '{ not json' }));

  let called = false;
  let errorMessage = null;
  env.fetchGlucose(
    () => { called = true; },
    (msg) => { errorMessage = msg; }
  );

  assert.equal(called, false, 'onSuccess should not be called');
  assert.ok(errorMessage.indexOf('parse') !== -1, 'error should mention parse, got: ' + errorMessage);
});

test('fetchGlucose on network error (no route) calls onError', () => {
  const env = loadIndex();
  // No route registered -> xhr.onerror fires.

  let called = false;
  let errorMessage = null;
  env.fetchGlucose(
    () => { called = true; },
    (msg) => { errorMessage = msg; }
  );

  assert.equal(called, false, 'onSuccess should not be called');
  assert.ok(errorMessage.indexOf('Network') !== -1, 'error should mention network, got: ' + errorMessage);
});

test('fetchGlucose on empty array calls onError', () => {
  const env = loadIndex();
  env.xhr.route('GET', 'sgv.json', () => ({ status: 200, body: '[]' }));

  let called = false;
  let errorMessage = null;
  env.fetchGlucose(
    () => { called = true; },
    (msg) => { errorMessage = msg; }
  );

  assert.equal(called, false, 'onSuccess should not be called');
  assert.ok(errorMessage.indexOf('empty') !== -1, 'error should mention empty, got: ' + errorMessage);
});

test('ready event on HTTP 500 sends error_code (GLUCOSE_HTTP=2) via sendAppMessage', (t) => {
  // Mock timers so the auto-update loop armed by the ready handler can't keep
  // the Node process alive after the test finishes.
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const { pebble, xhr, consoleLogs } = loadIndex();
  xhr.route('GET', 'sgv.json', () => ({ status: 500, body: 'boom' }));

  pebble.fire('ready');

  assert.equal(pebble.messages.length, 1, 'expected one sendAppMessage call');
  assert.deepEqual(pebble.messages[0].message, { error_code: 2 });
  assert.ok(
    consoleLogs.some((l) => l.indexOf('500') !== -1),
    'expected a log mentioning HTTP 500, got: ' + JSON.stringify(consoleLogs)
  );
});

test('ready event on network error sends error_code (GLUCOSE_NETWORK=1) via sendAppMessage', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const { pebble, xhr } = loadIndex();
  // No route registered -> xhr.onerror fires.

  pebble.fire('ready');

  assert.equal(pebble.messages.length, 1, 'expected one sendAppMessage call');
  assert.deepEqual(pebble.messages[0].message, { error_code: 1 });
});
