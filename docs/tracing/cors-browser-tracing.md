# CORS Failure on Spotify Token Exchange (Browser)

## Problem

While trying to test a browser only use of the package, I bumped into our beloved CORS error while trying to log in.

![CORS failure on token exchange in spotify-effect solid example](images/cors-token-failure.png)

## Root Cause

Effect's `FetchHttpClient` injects **trace propagation headers** (`B3`, `Traceparent`) into every outgoing HTTP request by default. These are non-simple headers under the CORS spec, which forces the browser to send a **preflight OPTIONS request** before the actual POST.

Spotify's token endpoint supports CORS for simple requests (`Content-Type: application/x-www-form-urlencoded` with no custom headers), but rejects the preflight — so the request never reaches the server.

For proof, DiscoverQuickly hits the exact same `accounts.spotify.com/api/token` endpoint directly from the browser and gets a 200 OK — because it doesn't send tracing headers:

![DiscoverQuickly successfully calling the token endpoint](images/discoverquickly-token-success.png)

And its subsequent API calls to `api.spotify.com` also work fine (CORS is fully supported there):

![DiscoverQuickly calling api.spotify.com successfully](images/discoverquickly-api-success.png)

A POST to `accounts.spotify.com/api/token` with only `Content-Type: application/x-www-form-urlencoded` is a [CORS simple request](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#simple_requests) — no preflight needed. Adding `B3` or `Traceparent` makes it a preflighted request, which Spotify blocks.

## Current Fix (Example-Level)

Consumers create a custom `httpClientLayer` with tracer propagation disabled:

```ts
import * as Layer from "effect/Layer";
import { FetchHttpClient, HttpClient } from "effect/http";

const browserHttpClientLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(HttpClient.TracerPropagationEnabled, false),
);

makeSpotifyLayer({ httpClientLayer: browserHttpClientLayer });
```

This works but requires every browser consumer to know about and apply this workaround.

## Library-Level Fix Options

### Option 1: Disable propagation on token requests only

In `SpotifyAuth.ts`, the `requestToken` function makes the call to `accounts.spotify.com/api/token`. Wrap the HTTP call to disable trace propagation for this specific request:

```ts
const requestToken = <A>(options: { ... }) =>
  Effect.gen(function* () {
    const response = yield* HttpClient.post(TOKEN_URL, { ... }).pipe(
      Effect.provideService(HttpClient.TracerPropagationEnabled, false),
      Effect.mapError(mapHttpClientError),
    );
    // ...
  });
```

**Pros:** Surgical — only affects the one endpoint that needs it. API data requests (`api.spotify.com`) keep tracing.
**Cons:** Need to verify `Effect.provideService` works at the individual effect level inside the HTTP client pipeline.

### Option 2: Export a browser-ready layer

Export a pre-configured browser layer from the library:

```ts
// in makeSpotifyLayer.ts or a new browser entry
export const browserHttpClientLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(HttpClient.TracerPropagationEnabled, false),
);
```

**Pros:** Simple, discoverable, one import for browser consumers.
**Cons:** Disables tracing on all requests, not just the problematic token endpoint.

### Option 3: Auto-detect browser environment

In `makeSpotifyLayer`, default to disabling tracer propagation when no custom `httpClientLayer` is provided and `FetchHttpClient.layer` is used (implying browser):

```ts
const defaultLayer =
  options.httpClientLayer ??
  Layer.mergeAll(FetchHttpClient.layer, Layer.succeed(HttpClient.TracerPropagationEnabled, false));
```

**Pros:** Zero-config for browser consumers — just works.
**Cons:** Also affects Node.js consumers using FetchHttpClient. Could be refined with a `browser: true` option.

### Recommendation

**Option 1** is the most precise — token requests to `accounts.spotify.com` should never carry trace headers regardless of environment, since the endpoint doesn't accept preflighted requests. It fixes the problem at the source without affecting API data requests where tracing is useful.

If Option 1 doesn't work cleanly with Effect's service provision model, **Option 2** (exported browser layer) is the pragmatic fallback.

## Some reading material I found

- [http.dev](https://http.dev/)'s [X-B3-TraceId](https://http.dev/x-b3-traceid). Sidenote, what a cool domain name!
