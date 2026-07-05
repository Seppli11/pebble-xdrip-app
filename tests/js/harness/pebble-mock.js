// Minimal mock of the Pebble global for testing pkjs code.
// Records event listeners and captures sendAppMessage calls.

function createPebbleMock() {
  const listeners = {};
  const messages = [];

  return {
    listeners,
    messages,

    addEventListener(event, handler) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    },

    sendAppMessage(message, onSuccess, onError) {
      messages.push({ message, onSuccess, onError });
      if (typeof onSuccess === 'function') onSuccess();
    },

    // Test helper: fire all registered listeners for an event.
    fire(event, ...args) {
      const handlers = listeners[event] || [];
      handlers.forEach((h) => h(...args));
    },
  };
}

module.exports = { createPebbleMock };
