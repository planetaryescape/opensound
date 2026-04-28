# Browser Example

Small browser playground for manual testing.

Current capabilities:

- paste an access token
- fetch a track by ID in the browser using `@spotify-effect/core` and `@spotify-effect/browser`

Planned for issue `#12`:

- PKCE auth URL generation
- callback handling
- code exchange and refreshable user tokens

Run it from the workspace root with:

```sh
bun run example:browser
```

To turn on tracing for the Bun server behind the browser example:

```sh
SPOTIFY_EFFECT_TRACE=1 bun run example:browser
```

To export to the local collector instead of console spans:

```sh
SPOTIFY_EFFECT_TRACE=1 OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun run example:browser
```

Then open the printed local URL.

If you want to verify Jaeger wiring before touching Spotify auth, click `Ping traced server` in the UI.
That should emit a trace for the `opensound-example-browser` service immediately.

For background on PKCE and Spotify's browser-safe auth flow, see `docs/auth/pkce.md`.
For tracing and collector notes, see `docs/tracing/otel.md`.
