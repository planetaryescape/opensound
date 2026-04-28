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

- **`@spotify-effect/core`** — Core SDK with API clients, auth flows, and shared helpers
- **`@spotify-effect/browser`** — Browser-focused package with PKCE/session helpers and `SpotifyBrowser`
- **`@spotify-effect/otel-node`** — Node OpenTelemetry integration

## Examples

- **`examples/basic`** — Node.js example with tracing
- **`examples/browser`** — Browser-based PKCE authentication flow
- **`examples/otel`** — Ready-to-run OpenTelemetry collector stack

## Quick Start

```typescript
import { makeSpotifyLayer, Tracks } from "@spotify-effect/core";
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
