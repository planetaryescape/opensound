# Spotify track · Foldkit SSG

A statically generated Foldkit application using `@spotify-effect/core` to fetch
a Spotify track during the build. Both `/` and `/about` are prerendered with the
track name and artists in public hydration Flags; credentials never enter the
HTML or client bundle. The counter demonstrates client updates after hydration.

Set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_TRACK_ID` **during
the build** to embed a track. Without them, the generated pages display setup
instructions. Rebuild to refresh the track; static hosting does not contact
Spotify at request time. Never put the client secret in a browser environment
variable.

## Getting Started

```bash
bun install
bun dev
```

## Building and previewing

```bash
bun run build
bun run preview
```

The build is one `vite build`. `@foldkit/vite-plugin` builds the client bundle,
builds the server bundle, and generates a page for every path
`src/entry.server.ts` lists, all from that one command.

## The build id

The build id does not make hydration correct. It makes hydration refuse when it
would otherwise be incorrect.

The generated page carries the id, and the client bundle carries its own copy.
Hydration compares the two before it reads the Flags payload or adopts DOM.
When they differ, startup stops and the document body is marked `inert`,
`aria-hidden`, and `data-foldkit-refused`. A nondismissable modal shield covers
its controls and existing top-layer content, then takes focus without closing
author-owned dialogs. Nothing moves, so no custom element reconnects and no
frame reloads.

Without that check, stale HTML from an earlier deployment can be hydrated by the
newer client. Where the old markup happens to line up with the new markup,
an input the old page called `email` can be adopted for whatever the new build
puts in that position, carrying what the visitor typed into it.

The comparison happens when a client boots against a page. A tab whose client
is already running when a deployment lands is not rechecked.

`vite.config.ts` takes care of this: it produces one id per build, and the one
`vite build` that reads it hands that id to the client and the server alike.
Supply `FOLDKIT_BUILD_ID` when you want the served id to name a deployment you
can look up later:

```bash
FOLDKIT_BUILD_ID="$CI_DEPLOYMENT_ID" bun run build
```

The id is public HTML and must never contain a secret or be derived from one.
Every step of one deployment must share an id. By contrast, two deployments
must never share one. Reusing an id produces no warning: the ids agree, so
hydration proceeds. When in doubt, leave `FOLDKIT_BUILD_ID` unset and let the
build generate one.

## Learn More

- [Foldkit Documentation](https://foldkit.dev)
- [Effect Documentation](https://effect.website)
