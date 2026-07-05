// Minimal XMLHttpRequest mock whose responses are controllable from tests.
// Tests register a route (method + url substring) with a handler; send()
// invokes onload synchronously with the registered response.

function createXhrMock() {
  const routes = [];
  const requests = [];

  function route(method, urlSubstring, handler) {
    routes.push({ method, urlSubstring, handler });
  }

  function findRoute(method, url) {
    return routes.find(
      (r) =>
        r.method === method &&
        url.indexOf(r.urlSubstring) !== -1
    );
  }

  class XMLHttpRequest {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.responseText = '';
      this.onload = null;
      this.onerror = null;
      this._method = null;
      this._url = null;
    }

    open(method, url) {
      this._method = method;
      this._url = url;
      this.readyState = 1;
    }

    send(_body) {
      requests.push({ method: this._method, url: this._url });

      const route = findRoute(this._method, this._url);
      if (!route) {
        if (typeof this.onerror === 'function') {
          this.onerror(new Error(`No mock route for ${this._method} ${this._url}`));
        }
        return;
      }

      const { status = 200, body = '' } = route.handler(this._url) || {};
      this.status = status;
      this.responseText = body;
      this.readyState = 4;

      if (typeof this.onload === 'function') {
        this.onload();
      }
    }
  }

  return {
    XMLHttpRequest,
    route,
    requests,
  };
}

module.exports = { createXhrMock };
