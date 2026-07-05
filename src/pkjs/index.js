var HOST = "http://localhost:17580";
var GlucoseModel = require('./glucose-model');

function fetchGlucose(onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', HOST + '/sgv.json');

  xhr.onload = function () {
    if (xhr.status !== 200) {
      onError('Failed to fetch glucose: HTTP ' + xhr.status);
      return;
    }

    var data;
    try {
      data = JSON.parse(xhr.responseText);
    } catch (e) {
      onError('Failed to parse glucose response: ' + e.message);
      return;
    }

    if (!data || !data.length) {
      onError('Glucose response was empty');
      return;
    }

    onSuccess(new GlucoseModel(data));
  };

  xhr.onerror = function () {
    onError('Network error while fetching glucose');
  };

  xhr.send();
}

Pebble.addEventListener('ready', function () {
  console.log('PebbleKit JS ready!');
  fetchGlucose(
    function (model) {
      console.log('Latest glucose: ' + model.latestMmol() + ' mmol/L');
      Pebble.sendAppMessage({ 'glucose': model.latestMmolX10(), 'direction': model.latestDirectionCode() });
    },
    function (message) {
      console.log(message);
    }
  );
});

if (typeof module !== 'undefined') {
  module.exports = { fetchGlucose: fetchGlucose };
}
