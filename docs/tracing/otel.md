# OpenTelemetry Notes

## What already works in this repo

`@spotify-effect/core` now emits Effect tracing spans in the shared request and auth layers.

Important versioning note:

- in Effect v4 beta, most of the old `@effect/platform` surface has moved into `effect`
- OpenTelemetry integration is still a separate concern and the most practical local path in this repo is the example-side Node tracing setup

That means these operations are already instrumented at the Effect level:

- Spotify API requests
- token endpoint exchanges
- auth invalidation / retry paths
- rate-limit metadata on traced requests

The examples can opt in to tracing with `SPOTIFY_EFFECT_TRACE=1`.

## Easiest way to see spans locally

Use the console exporter via the example apps.

### Basic example

```sh
SPOTIFY_EFFECT_TRACE=1 bun run example:basic -- --access-token <token> <track-id>
```

or:

```sh
SPOTIFY_EFFECT_TRACE=1 bun run example:basic -- --client-id <id> --client-secret <secret> <track-id>
```

### Browser example

```sh
SPOTIFY_EFFECT_TRACE=1 bun run example:browser
```

This enables the Node-side telemetry layer used by the local Bun server behind the browser example.

## What you will see

With tracing enabled, the examples use a console span exporter. You should see spans printed for:

- `spotify.request /tracks/...`
- `spotify.request /me`
- `spotify.auth.token`
- auth invalidation/retry behavior

## Collector options

There are two practical local setups.

### Option 1: Console spans only

Use the built-in example tracing toggle with `SPOTIFY_EFFECT_TRACE=1`.

This is the fastest way to confirm that spans are being emitted at all.

### Option 2: Local collector + trace UI

If you want an actual collector and trace viewer, use an OpenTelemetry Collector plus Jaeger or Tempo.

One simple stack is:

- OpenTelemetry Collector
- Jaeger all-in-one

Example `docker-compose.yml`:

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.57
    ports:
      - "16686:16686"
      - "4317:4317"
      - "14318:4318"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.101.0
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./otel-collector.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"
      - "14318:4318"
```

Example `otel-collector.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

Then open Jaeger at:

```text
http://localhost:16686
```

There is also a ready-to-run setup checked into this repo:

- `examples/otel/docker-compose.yml`
- `examples/otel/otel-collector.yaml`

## How to wire a real exporter in this repo

The package helper currently uses a console exporter so examples are easy to run.

For a real collector, point the examples at your OTLP HTTP endpoint with `OTEL_EXPORTER_OTLP_ENDPOINT`.

That is the right next step if you want:

- traces sent to a collector
- dashboards and search
- production-grade trace export

## Suggested next enhancement

If you want the examples to export directly to a collector instead of printing spans, the next small enhancement is:

- keep OTLP export behind env vars like `OTEL_EXPORTER_OTLP_ENDPOINT`
- keep console export as the zero-config default

## Dependency traps

### `@opentelemetry/sdk-trace-node` not found after bumping `@effect/opentelemetry`

**Observed:** `ERR_MODULE_NOT_FOUND: Cannot find package '@opentelemetry/sdk-trace-node'` during `@examples/sveltekit` build (vite SSR).

**Why:** `@effect/opentelemetry/NodeSdk` internally imports `@opentelemetry/sdk-trace-node`, but this transitive dependency wasn't declared in `@spotify-effect/otel-node`. Bun's lockfile didn't place it where the runtime could find it.

**Fix:** Add `"@opentelemetry/sdk-trace-node": "^2.6.0"` to `packages/otel-node/package.json` dependencies. This must stay in sync with `@effect/opentelemetry` version bumps — check the new version's NodeSdk imports when upgrading.
