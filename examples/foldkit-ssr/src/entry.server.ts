import { Tracks, makeSpotifyLayer } from "@spotify-effect/core";
import { Effect } from "effect";
import { Server } from "foldkit/experimental";

import { readCountCookie } from "./cookie";
import { Flags, init, view } from "./main";

const flagsForRequest = (cookieHeader: string, track: string): Flags => ({
  initialCount: readCountCookie(cookieHeader),
  renderedAt: new Date().toISOString(),
  renderedOn: "Server",
  track,
});

const trackForRequest = Effect.gen(function* () {
  const clientId = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
  const trackId = process.env["SPOTIFY_TRACK_ID"];
  if (!clientId || !clientSecret || !trackId) {
    return "Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_TRACK_ID to render a track.";
  }

  const track = yield* Effect.gen(function* () {
    const tracks = yield* Tracks;
    return yield* tracks.getTrack(trackId);
  }).pipe(Effect.provide(makeSpotifyLayer({ clientId, clientSecret })));
  return `${track.name} — ${track.artists.map((artist) => artist.name).join(", ")}`;
}).pipe(
  Effect.catch(() =>
    Effect.succeed("Spotify could not load this track. Check the server credentials and track ID."),
  ),
);

// NOTE: the Flags built from this request are serialized into the rendered
// HTML and travel to the browser with it. The hydrating client reads them
// back and calls init with the exact values this render used; the client
// computes no Flags of its own.
// NOTE: a preflight reaches this entry in development and in production alike,
// so an application's CORS policy goes here rather than in the host: it can
// allow one origin for one route and refuse it for another. This answer allows
// nothing and only reports which methods the host forwards.
const preflightResponse = (): Response =>
  new Response(null, {
    status: 204,
    headers: { allow: Server.HOST_METHOD_ANSWERS.allow },
  });

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      if (request.method === "OPTIONS") {
        return Server.Responded(preflightResponse());
      }

      const track = yield* trackForRequest;

      const renderedApplication = yield* Server.renderToString(
        { Flags, init, view },
        {
          flags: flagsForRequest(request.headers.get("cookie") ?? "", track),
          buildId: import.meta.env.FOLDKIT_BUILD_ID,
        },
      );

      return Server.Rendered(renderedApplication, {
        headers: {
          "cache-control": "private, no-store",
          vary: "cookie",
          "x-content-type-options": "nosniff",
        },
      });
    }),
  );
