# opensound

A monorepo for open source music tooling, with the Spotify Web API SDK as one product in the `spotify-effect` family.

## What is this?

This is an **isomorphic** (works in both Node.js and browser environments) Effect-based wrapper around the Spotify Web API, inspired by [spotify-web-api-ts](https://github.com/inferrinizzard/spotify-web-api). It provides:

- **Type-safe API calls** with full TypeScript support
- **Functional error handling** using Effect's composable error management
- **Built-in retries & batching** via Effect's request resolvers
- **OpenTelemetry tracing** for observability (optional, via `SPOTIFY_EFFECT_TRACE=1`)
- **PKCE OAuth flow** support for browser-based authentication
- **Comprehensive test coverage** with Vitest

## Packages

- **`@planetaryescape/opensound`**: Core SDK with API clients, auth flows, and shared helpers
- **`@planetaryescape/opensound/browser`**: PKCE/session helpers and `SpotifyBrowser`
- **`@planetaryescape/opensound/otel-node`**: Optional Node OpenTelemetry integration

These are entry points of one JSR package. Internal Bun workspaces retain their existing `@spotify-effect/*` names.

## Standalone tools

- **[gbpm](tools/gbpm):** A Rust/FFmpeg CLI for preparing MP3 mixes and still-image MP4 videos from job files, with optional intro overlays and explicit metadata. Its binary releases are independent of the Spotify SDK.

## Examples

- **`examples/basic`** — Node.js example with tracing
- **`examples/browser`** — Browser-based PKCE authentication flow
- **`examples/solid`** — Deployable SolidJS browser example for PKCE and authenticated API smoke tests
- **`examples/otel`** — Ready-to-run OpenTelemetry collector stack

The SolidJS example is continuously deployed from `main` to
[`example.spotify.opensound.dev`](https://example.spotify.opensound.dev). Enter a Spotify client ID
whose redirect URIs include `https://example.spotify.opensound.dev/` to smoke test PKCE, session
refresh, profile requests, and library requests against the deployed packages.

## Installation

`effect` is a required peer dependency. Install the matching stable release with the SDK:

```sh
bun x jsr add @planetaryescape/opensound --bun
bun add effect@4.1.4
```

If `effect` is not installed, your package manager may report a missing peer dependency and the application may fail to resolve `effect` at runtime.

## Quick Start

```typescript
import { makeSpotifyLayer, Tracks } from "@planetaryescape/opensound";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const tracks = yield* Tracks;
  const track = yield* tracks.getTrack("4iV5W9uYEdYUVa79Axb7Rh");

  return track;
}).pipe(Effect.provide(makeSpotifyLayer({}, { accessToken: "your-access-token" })));

Effect.runPromise(program);
```

## Learning Resources

- [Intro To Effect, Part 1: What Is Effect?](https://ybogomolov.me/01-effect-intro)
- [Effect Introduction](https://github.com/antoine-coulon/effect-introduction)
- [Generic batching & retries examples](https://gist.github.com/mikearnaldi/4a13fe6f51b28ad0b07fd7bbe3f4c49a)

## Observability

Request and auth flows emit Effect tracing spans at shared boundaries. Enable local tracing with `SPOTIFY_EFFECT_TRACE=1`. See `docs/tracing/otel.md` for setup notes and `examples/otel/` for a ready-to-run collector stack.

## Additional Notes

See `docs/` for more detailed documentation.
