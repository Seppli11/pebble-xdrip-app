var HOST = "http://localhost:17580";
var GlucoseModel = require('./glucose-model');
var ErrorCodes = require('./error-codes');

function fetchGlucose(onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', HOST + '/sgv.json');

  xhr.onload = function () {
    if (xhr.status !== 200) {
      onError('Failed to fetch glucose: HTTP ' + xhr.status, ErrorCodes.GLUCOSE_HTTP);
      return;
    }

    var data;
    try {
      data = JSON.parse(xhr.responseText);
    } catch (e) {
      onError('Failed to parse glucose response: ' + e.message, ErrorCodes.GLUCOSE_PARSE);
      return;
    }

    if (!data || !data.length) {
      onError('Glucose response was empty', ErrorCodes.GLUCOSE_EMPTY);
      return;
    }

    onSuccess(new GlucoseModel(data));
  };

  xhr.onerror = function () {
    onError('Network error while fetching glucose', ErrorCodes.GLUCOSE_NETWORK);
  };

  xhr.send();
}

function sendError(code) {
  Pebble.sendAppMessage({ 'error_code': code });
}

Pebble.addEventListener('ready', function () {
  console.log('PebbleKit JS ready!');
  fetchGlucose(
    function (model) {
      console.log('Latest glucose: ' + model.latestMmol() + ' mmol/L');
      Pebble.sendAppMessage({ 'glucose': model.latestMmolX10(), 'direction': model.latestDirectionCode() });
    },
    function (message, code) {
      // Log the detailed message for debugging; send only the code to the
      // watch so it can show a short user-facing error.
      console.log(message);
      sendError(code);
    }
  );
});

if (typeof module !== 'undefined') {
  module.exports = { fetchGlucose: fetchGlucose };
}
