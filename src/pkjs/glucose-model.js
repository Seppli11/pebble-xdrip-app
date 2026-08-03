// Stores raw glucose records (sgv in mg/dL) and provides accessors that
// derive mmol/L values on demand. Records are assumed newest-first, as
// returned by the xDrip /sgv.json endpoint.

var MGDL_TO_MMOL = 18.0182;

function GlucoseModel(records) {
  this.records = records || [];
}

GlucoseModel.prototype.count = function () {
  return this.records.length;
};

GlucoseModel.prototype.getMgdl = function (index) {
  return this.records[index].sgv;
};

GlucoseModel.prototype.getMmol = function (index) {
  return Math.round((this.getMgdl(index) / MGDL_TO_MMOL) * 10) / 10;
};

GlucoseModel.prototype.getDirection = function (index) {
  return this.records[index].direction;
};

// mmol/L × 10 as an integer, for sending to the watch (Pebble AppMessage
// only supports integers; 5.6 mmol/L is sent as 56).
GlucoseModel.prototype.getMmolX10 = function (index) {
  return Math.round((this.getMgdl(index) / MGDL_TO_MMOL) * 10);
};

GlucoseModel.prototype.latest = function () {
  return this.records[0];
};

// Reading timestamp as unix seconds (sgv records store `date` in ms), for
// sending to the watch so it can display the reading time and age.
GlucoseModel.prototype.getDateSeconds = function (index) {
  return Math.floor(this.records[index].date / 1000);
};

GlucoseModel.prototype.latestDateSeconds = function () {
  return this.getDateSeconds(0);
};

GlucoseModel.prototype.latestMgdl = function () {
  return this.getMgdl(0);
};

GlucoseModel.prototype.latestMmol = function () {
  return this.getMmol(0);
};

GlucoseModel.prototype.latestMmolX10 = function () {
  return this.getMmolX10(0);
};

GlucoseModel.prototype.latestDirectionCode = function () {
  return GlucoseModel.directionToCode(this.getDirection(0));
};

GlucoseModel.directionToCode = function(direction) {
  switch (direction) {
    case "Flat":
      return 0;
    case "FortyFiveUp":
      return 1;
    case "FortyFiveDown":
      return 2;
    case "SingleUp":
      return 3;
    case "SingleDown":
      return 4;
    case "DoubleUp":
      return 5;
    case "DoubleDown":
      return 6;
    default:
      console.warn("Unknown direction: " + direction);
      return -1;
  }
}

if (typeof module !== 'undefined') {
  module.exports = GlucoseModel;
}
