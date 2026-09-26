import { Tracks, makeSpotifyLayer } from "@spotify-effect/core";
import { Effect } from "effect";
import { Server } from "foldkit/experimental";

import { Flags, init, view } from "./main";

const trackForBuild = Effect.gen(function* () {
  const clientId = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
  const trackId = process.env["SPOTIFY_TRACK_ID"];
  if (!clientId || !clientSecret || !trackId) {
    return "Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_TRACK_ID before building to embed a track.";
  }
  const track = yield* Effect.gen(function* () {
    const tracks = yield* Tracks;
    return yield* tracks.getTrack(trackId);
  }).pipe(Effect.provide(makeSpotifyLayer({ clientId, clientSecret })));
  return `${track.name} — ${track.artists.map((artist) => artist.name).join(", ")}`;
}).pipe(Effect.catch(() => Effect.succeed("Spotify could not load this track during the build.")));

export const prerenderPaths: ReadonlyArray<string> = ["/", "/about"];

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const track = yield* trackForBuild;
      const renderedApplication = yield* Server.renderToString(
        { routing: {}, Flags, init, view },
        { url: request.url, flags: { track }, buildId: import.meta.env.FOLDKIT_BUILD_ID },
      );

      return Server.Rendered(renderedApplication);
    }),
  );
