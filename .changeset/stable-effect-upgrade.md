---
"@spotify-effect/core": minor
"@spotify-effect/browser": minor
"@spotify-effect/otel-node": minor
---

Build against stable Effect 4.1.4 and update HTTP imports to the stable `effect/http` paths. Core and browser consumers can use Effect 4.0.6 or newer; the telemetry package requires Effect 4.1.4 or newer.

Accept nullable album-track preview URLs so consumers no longer need to patch the response decoder.
