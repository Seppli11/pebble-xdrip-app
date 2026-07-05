const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const GlucoseModel = require('../../src/pkjs/glucose-model');

const fixturePath = path.resolve(__dirname, 'fixtures', 'sgv.json');
const records = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('count matches fixture length', () => {
  const model = new GlucoseModel(records);
  assert.equal(model.count(), records.length);
});

test('getMgdl returns the raw sgv at the index', () => {
  const model = new GlucoseModel(records);
  assert.equal(model.getMgdl(0), 153);
  assert.equal(model.getMgdl(1), 146);
});

test('getMmol returns sgv / 18.0182 rounded to one decimal', () => {
  const model = new GlucoseModel(records);
  // 153 / 18.0182 = 8.4909... -> 8.5
  assert.equal(model.getMmol(0), 8.5);
  // 146 / 18.0182 = 8.1025... -> 8.1
  assert.equal(model.getMmol(1), 8.1);
});

test('latest returns the first record (newest-first)', () => {
  const model = new GlucoseModel(records);
  assert.equal(model.latest(), records[0]);
  assert.equal(model.latest().sgv, 153);
});

test('latestMmol and latestMgdl match index 0', () => {
  const model = new GlucoseModel(records);
  assert.equal(model.latestMgdl(), model.getMgdl(0));
  assert.equal(model.latestMmol(), model.getMmol(0));
});

test('getMmolX10 returns mmol/L × 10 as an integer for the watch', () => {
  const model = new GlucoseModel(records);
  // 153 / 18.0182 = 8.4909 -> ×10 = 84.909 -> rounded = 85
  assert.equal(model.getMmolX10(0), 85);
  assert.equal(model.latestMmolX10(), 85);
  // 5.6 mmol/L (≈ 101 mg/dL) -> 56
  const model2 = new GlucoseModel([{ sgv: 101 }]);
  assert.equal(model2.latestMmolX10(), 56);
});


test('latestDirection returns last direction', () => {
  const model = new GlucoseModel(records);
  assert.equal(model.latestDirectionCode(), 1);
});

test('getDirection returns proper direction', () => {
  const model = new GlucoseModel(records);
  assert.equal(model.getDirection(2), "Flat");
});

test('empty input yields count 0', () => {
  const model = new GlucoseModel([]);
  assert.equal(model.count(), 0);
});
