var HOST = "http://localhost:17580";
var GlucoseModel = require('./glucose-model');
var ErrorCodes = require('./error-codes');

// Auto-update schedule: after every fetch completes (success or error) the
// next attempt is scheduled this many ms later. Because the next cycle is
// only scheduled after the previous one finished (or was declared dead by
// the watchdog), at most one fetch is ever in flight.
var AUTO_UPDATE_INTERVAL_MS = 60000;

// If a fetch has not completed within this long, treat it as a network error
// and schedule the next attempt. Keeps the loop alive if the XHR hangs.
// Must be shorter than AUTO_UPDATE_INTERVAL_MS.
var FETCH_WATCHDOG_MS = 45000;

var fetchInFlight = false;
var fetchAbandoned = false;
var fetchWatchdog = null;

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

function sendData(model) {
  Pebble.sendAppMessage({
    'glucose': model.latestMmolX10(),
    'direction': model.latestDirectionCode(),
    'sgv_date': model.latestDateSeconds()
  });
}

// Marks the current cycle as finished and cancels its watchdog. Only one
// cycle runs at a time; the next is scheduled in scheduleNext().
function finishFetch() {
  fetchInFlight = false;
  if (fetchWatchdog) {
    clearTimeout(fetchWatchdog);
    fetchWatchdog = null;
  }
}

function scheduleNext() {
  setTimeout(fetchAndSchedule, AUTO_UPDATE_INTERVAL_MS);
}

// Runs one fetch cycle: fetches, reports the result to the watch (data or
// error), then schedules the next cycle one minute later. The loop survives
// errors, so the next successful update clears the watch-side error.
function fetchAndSchedule() {
  if (fetchInFlight) {
    return;
  }
  fetchInFlight = true;
  fetchAbandoned = false;

  // Watchdog: if the XHR never completes, report a network error and keep
  // the loop going. Late XHR callbacks after this point are ignored via
  // fetchAbandoned, so a stalled request can't double-report or double-arm.
  fetchWatchdog = setTimeout(function () {
    fetchAbandoned = true;
    finishFetch();
    console.log('Glucose fetch timed out');
    sendError(ErrorCodes.GLUCOSE_NETWORK);
    scheduleNext();
  }, FETCH_WATCHDOG_MS);

  fetchGlucose(
    function (model) {
      if (fetchAbandoned) {
        return;
      }
      console.log('Latest glucose: ' + model.latestMmol() + ' mmol/L');
      finishFetch();
      sendData(model);
      scheduleNext();
    },
    function (message, code) {
      if (fetchAbandoned) {
        return;
      }
      // Log the detailed message for debugging; send only the code to the
      // watch so it can show a short user-facing error.
      console.log(message);
      finishFetch();
      sendError(code);
      scheduleNext();
    }
  );
}

Pebble.addEventListener('ready', function () {
  console.log('PebbleKit JS ready!');
  // Initial fetch starts the loop; it also self-heals if the JS environment
  // is restarted while the watchapp is still open.
  fetchAndSchedule();
});

if (typeof module !== 'undefined') {
  module.exports = { fetchGlucose: fetchGlucose };
}
