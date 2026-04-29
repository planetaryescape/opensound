# @spotify-effect/core

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

## 0.4.0

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

## 0.2.0

### Minor Changes

- Refactor the public API around Effect-native services and layers.

  - Add `ServiceMap.Service` contracts for auth, session, request, and each Spotify domain module
  - Add `makeSpotifyLayer` as the primary composition entrypoint for consumers
  - Export live domain layers and service tags instead of the old `SpotifyWebApi` facade and `*Api` classes
  - Migrate the examples to the new layer-first API, including SvelteKit and browser flows
  - Replace facade/class tests with service-runtime coverage across the composed layer graph

  This release removes the previous OO-style surface and replaces it with the new service/layer API.

## 0.1.0

### Minor Changes

- 465e01e: Add Effect-native Spotify auth flows and browser examples for access-token, client-credentials, and PKCE-driven user flows.
