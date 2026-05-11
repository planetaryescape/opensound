# @spotify-effect/otel-node

## 0.6.2

### Patch Changes

- Bump effect to 4.0.0-beta.65 and adapt service signatures

## 0.6.1

### Patch Changes

- Fix: Replace workspace protocol with npm version in @spotify-effect/browser dependencies for npm install compatibility

## 0.6.0

### Minor Changes

- dc1c59f: feat: release browser session sync and tracing improvements

  Classify auth and request errors more accurately, sync browser sessions with stored credentials, and add stream pagination SSE support with matching docs updates.

  This release also reflects the move of the Spotify Effect package family to the `planetaryescape` org.

## 0.5.0

### Minor Changes

- 2478815: Rename the public package family to the scoped `@spotify-effect/*` namespace.
  - Rename the main SDK package from `spotify-effect` to `@spotify-effect/core`
  - Publish browser helpers from `@spotify-effect/browser`
  - Keep OpenTelemetry support in `@spotify-effect/otel-node`
  - Keep all published packages on the same semver version using a fixed changeset group

## 0.2.0

### Minor Changes

- e220cdf: Split Node OpenTelemetry support into `@spotify-effect/otel-node`

  **Breaking change for `@spotify-effect/core`:** `makeSpotifyNodeTelemetryLayer`, `getOtlpTraceExporterUrl`, and `SpotifyNodeTelemetryOptions` are no longer exported from `@spotify-effect/core`. The core package now depends only on `effect`.

  **Migration:** Import from `@spotify-effect/otel-node` instead:

  ```ts
  // Before
  import {
    makeSpotifyNodeTelemetryLayer,
    getOtlpTraceExporterUrl,
  } from "@spotify-effect/core";

  // After
  import {
    makeNodeTelemetryLayer,
    getOtlpTraceExporterUrl,
  } from "@spotify-effect/otel-node";
  ```

  `makeNodeTelemetryLayer` accepts a `serviceName` string and an optional `options` object with a `batch` boolean to select between `SimpleSpanProcessor` (default) and `BatchSpanProcessor`. It reads `OTEL_EXPORTER_OTLP_ENDPOINT` from the environment automatically.
