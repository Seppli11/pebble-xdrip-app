# pebble-xdrip-app

A Pebble watchapp/watchface written in C using the Pebble SDK.

## Building & running

```sh
pebble build                          # build for all targetPlatforms
pebble install --emulator emery       # install on the emery emulator
pebble install --phone <ip>           # install to a paired phone
```

## Target platforms

`targetPlatforms` in `package.json` controls which watches you build for. The
modern Pebble hardware is **emery** (Pebble Time 2), **gabbro** (Pebble Round
2), and **flint** (Pebble 2 Duo); the original Pebble platforms (aplite,
basalt, chalk, diorite) are included by default for backwards compatibility.

## Project layout

```
src/c/           C source for the watchapp
src/pkjs/        PebbleKit JS (phone-side) source, if any
worker_src/c/    Background worker source, if any
resources/       Images, fonts, and other bundled resources
package.json     Project metadata (UUID, platforms, resources, message keys)
wscript          Build rules — usually no need to edit
```

By default this project is configured as a watchapp. To make it a watchface,
set `pebble.watchapp.watchface` to `true` in `package.json`.

## Documentation

Full SDK docs, tutorials, and API reference: <https://developer.repebble.com>

## Testing the pkjs (phone-side JS)

The PebbleKit JS source in `src/pkjs/` runs in a Pebble-specific runtime. A
lightweight, dependency-free harness mocks `Pebble`, `XMLHttpRequest`, and
`console` so `src/pkjs/index.js` can be loaded and exercised under Node.

```sh
npm run test:js          # runs tests/js/**/*.test.js
```

Add new tests alongside `tests/js/index.test.js`. The harness lives in
`tests/js/harness/` — `load.js` installs the mocks and loads the source
file as-is; `pebble-mock.js` and `xhr-mock.js` provide the fakes. The
`XMLHttpRequest` mock can serve fixture data from `tests/js/fixtures/`
(e.g. `sgv.json`) via `xhr.route(method, urlSubstring, handler)`.
