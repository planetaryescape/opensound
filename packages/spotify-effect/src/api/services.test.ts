import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { describe, expect, it } from "vitest";
import { makeSpotifyLayer } from "../makeSpotifyLayer";
import { albumFixture } from "../fixtures/albumFixture";
import { artistFixture, getArtistTopTracksFixture } from "../fixtures/artistFixture";
import { audioFeaturesFixture } from "../fixtures/audioFixture";
import { getCategoriesFixture } from "../fixtures/categoryFixture";
import { currentUserProfileFixture } from "../fixtures/currentUserProfileFixture";
import { devicesResponseFixture, queueFixture } from "../fixtures/playerFixture";
import { getMyPlaylistsFixture, playlistFixture } from "../fixtures/playlistFixture";
import { searchFixture } from "../fixtures/searchFixture";
import { trackFixture } from "../fixtures/trackFixture";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { Albums } from "../services/Albums";
import { Artists } from "../services/Artists";
import { Browse } from "../services/Browse";
import { Follow } from "../services/Follow";
import { Library } from "../services/Library";
import { Markets } from "../services/Markets";
import { Personalization } from "../services/Personalization";
import { Player } from "../services/Player";
import { Playlists } from "../services/Playlists";
import { Search } from "../services/Search";
import { Tracks } from "../services/Tracks";
import { Users } from "../services/Users";

type SpotifyAppLayer = ReturnType<typeof makeSpotifyLayer>;
type SpotifyAppServices = Layer.Success<SpotifyAppLayer>;

const runWithLayer = <A, E>(
  response: Response,
  effect: Effect.Effect<A, E, SpotifyAppServices>,
  options: Parameters<typeof makeSpotifyLayer>[0] = {},
  credentials: Parameters<typeof makeSpotifyLayer>[1] = { accessToken: "token" },
) => {
  const testClient = makeTestHttpClient(() => response);
  const runtime = ManagedRuntime.make(
    makeSpotifyLayer({ ...options, httpClientLayer: testClient.layer }, credentials),
  );

  return {
    requests: testClient.requests,
    result: runtime.runPromise(effect).finally(() => runtime.dispose()),
  };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("service layers", () => {
  it("wires Albums through the composed layer", async () => {
    const { result, requests } = runWithLayer(
      jsonResponse(albumFixture),
      Effect.gen(function* () {
        const albums = yield* Albums;
        return yield* albums.getAlbum(albumFixture.id);
      }),
    );

    expect(await result).toEqual(albumFixture);
    expect(requests[0]?.url).toBe(`https://api.spotify.com/v1/albums/${albumFixture.id}`);
  });

  it.each([null, "https://cdn.example/preview.mp3"])(
    "decodes album tracks with preview_url %s",
    async (previewUrl) => {
      const response = {
        ...albumFixture.tracks,
        items: albumFixture.tracks.items.map((track) => ({
          ...track,
          preview_url: previewUrl,
        })),
      };
      const { result, requests } = runWithLayer(
        jsonResponse(response),
        Effect.gen(function* () {
          const albums = yield* Albums;
          return yield* albums.getAlbumTracks(albumFixture.id);
        }),
      );

      expect(await result).toEqual(response);
      expect(requests[0]?.url).toBe(
        `https://api.spotify.com/v1/albums/${albumFixture.id}/tracks`,
      );
    },
  );

  it("rejects malformed album-track preview URLs", async () => {
    const { result } = runWithLayer(
      jsonResponse({
        ...albumFixture.tracks,
        items: albumFixture.tracks.items.map((track) => ({ ...track, preview_url: 42 })),
      }),
      Effect.gen(function* () {
        const albums = yield* Albums;
        return yield* albums.getAlbumTracks(albumFixture.id);
      }),
    );

    await expect(result).rejects.toMatchObject({ _tag: "SpotifyParseError" });
  });

  it("wires Artists through the composed layer", async () => {
    const { result, requests } = runWithLayer(
      jsonResponse(getArtistTopTracksFixture),
      Effect.gen(function* () {
        const artists = yield* Artists;
        return yield* artists.getArtistTopTracks(artistFixture.id, "US");
      }),
    );

    expect(await result).toEqual(getArtistTopTracksFixture.tracks);
    expect(requests[0]?.url).toContain(`/artists/${artistFixture.id}/top-tracks`);
  });

  it("wires Browse through the composed layer", async () => {
    const { result } = runWithLayer(
      jsonResponse(getCategoriesFixture),
      Effect.gen(function* () {
        const browse = yield* Browse;
        return yield* browse.getCategories();
      }),
    );

    expect(await result).toEqual(getCategoriesFixture.categories);
  });

  it("wires Follow through the composed layer", async () => {
    const followedArtists = {
      artists: {
        href: "https://api.spotify.com/v1/me/following?type=artist",
        items: [artistFixture],
        limit: 10,
        next: null,
        cursors: { after: artistFixture.id },
        total: 1,
      },
    };
    const { result } = runWithLayer(
      jsonResponse(followedArtists),
      Effect.gen(function* () {
        const follow = yield* Follow;
        return yield* follow.getFollowedArtists({ limit: 10 });
      }),
    );

    expect(await result).toEqual(followedArtists.artists);
  });

  it("wires Library through the composed layer", async () => {
    const savedAlbums = {
      href: "https://api.spotify.com/v1/me/albums",
      items: [{ added_at: "2024-01-01T00:00:00Z", album: albumFixture }],
      limit: 20,
      next: null,
      offset: 0,
      previous: null,
      total: 1,
    };
    const { result } = runWithLayer(
      jsonResponse(savedAlbums),
      Effect.gen(function* () {
        const library = yield* Library;
        return yield* library.getSavedAlbums();
      }),
    );

    expect(await result).toEqual(savedAlbums);
  });

  it("wires Markets through the composed layer", async () => {
    const { result } = runWithLayer(
      jsonResponse({ markets: ["US", "ZA"] }),
      Effect.gen(function* () {
        const markets = yield* Markets;
        return yield* markets.getMarkets();
      }),
      {},
      { accessToken: "token" },
    );

    expect(await result).toEqual(["US", "ZA"]);
  });

  it("wires Personalization through the composed layer", async () => {
    const topTracks = {
      href: "https://api.spotify.com/v1/me/top/tracks",
      items: [trackFixture],
      limit: 20,
      next: null,
      offset: 0,
      previous: null,
      total: 1,
    };
    const { result } = runWithLayer(
      jsonResponse(topTracks),
      Effect.gen(function* () {
        const personalization = yield* Personalization;
        return yield* personalization.getMyTopTracks();
      }),
    );

    expect(await result).toEqual(topTracks);
  });

  it("wires Player through the composed layer", async () => {
    const { result: devicesResult } = runWithLayer(
      jsonResponse(devicesResponseFixture),
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getMyDevices();
      }),
    );
    const { result: queueResult } = runWithLayer(
      jsonResponse(queueFixture),
      Effect.gen(function* () {
        const player = yield* Player;
        return yield* player.getQueue();
      }),
    );

    expect(await devicesResult).toEqual(devicesResponseFixture.devices);
    expect(await queueResult).toEqual(queueFixture);
  });

  it("wires Playlists through the composed layer", async () => {
    const { result: playlistResult } = runWithLayer(
      jsonResponse(playlistFixture),
      Effect.gen(function* () {
        const playlists = yield* Playlists;
        return yield* playlists.getPlaylist(playlistFixture.id);
      }),
    );
    const { result: myPlaylistsResult } = runWithLayer(
      jsonResponse(getMyPlaylistsFixture),
      Effect.gen(function* () {
        const playlists = yield* Playlists;
        return yield* playlists.getMyPlaylists();
      }),
    );

    expect(await playlistResult).toEqual(playlistFixture);
    expect(await myPlaylistsResult).toEqual(getMyPlaylistsFixture);
  });

  it("wires Search through the composed layer", async () => {
    const { result, requests } = runWithLayer(
      jsonResponse(searchFixture),
      Effect.gen(function* () {
        const search = yield* Search;
        return yield* search.search("nick drake", ["artist"]);
      }),
    );

    expect(await result).toEqual(searchFixture);
    expect(requests[0]?.url).toContain("/search");
  });

  it("wires Tracks through the composed layer", async () => {
    const { result } = runWithLayer(
      jsonResponse(audioFeaturesFixture),
      Effect.gen(function* () {
        const tracks = yield* Tracks;
        return yield* tracks.getAudioFeaturesForTrack(trackFixture.id);
      }),
    );

    expect(await result).toEqual(audioFeaturesFixture);
  });

  it("wires Users through the composed layer", async () => {
    const { result } = runWithLayer(
      jsonResponse(currentUserProfileFixture),
      Effect.gen(function* () {
        const users = yield* Users;
        return yield* users.getCurrentUserProfile();
      }),
    );

    expect(await result).toEqual(currentUserProfileFixture);
  });
});
