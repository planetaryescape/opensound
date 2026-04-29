import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, Paging, SimplifiedAlbum } from "../model/SpotifyObjects";
import { ArtistSchema } from "../model/SpotifyObjectSchemas";
import type { GetArtistAlbumsOptions } from "../model/SpotifyOptions";
import type { GetArtistsResponse, GetArtistTopTracksResponse, GetRelatedArtistsResponse } from "../model/SpotifyResponses";
import {
  GetArtistAlbumsResponseSchema,
  GetArtistsResponseSchema,
  GetArtistTopTracksResponseSchema,
  GetRelatedArtistsResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Artists } from "../services/Artists";
import {
  SpotifyRequest,
  type SpotifyRequestOptions,
  type SpotifyRequestService,
} from "../services/SpotifyRequest";

const withArtistAlbumsQuery = (
  options?: GetArtistAlbumsOptions,
): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number> = {};
  if (options.include_groups !== undefined) query.include_groups = options.include_groups.join(",");
  if (options.country !== undefined) query.country = options.country;
  if (options.limit !== undefined) query.limit = options.limit;
  if (options.offset !== undefined) query.offset = options.offset;
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class ArtistsApi {
  constructor(private readonly request: SpotifyRequestService) {}

  public getArtist(artistId: string): Effect.Effect<Artist, SpotifyRequestError> {
    return this.request.getJsonWithSchema(`/artists/${artistId}`, ArtistSchema);
  }

  public getArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<GetArtistsResponse["artists"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/artists", GetArtistsResponseSchema, {
        query: { ids: artistIds.join(",") },
      })
      .pipe(Effect.map((response) => response.artists));
  }

  public getArtistAlbums(
    artistId: string,
    options?: GetArtistAlbumsOptions,
  ): Effect.Effect<Paging<SimplifiedAlbum>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/artists/${artistId}/albums`,
      GetArtistAlbumsResponseSchema,
      withArtistAlbumsQuery(options),
    );
  }

  public getArtistTopTracks(
    artistId: string,
    country: string,
  ): Effect.Effect<GetArtistTopTracksResponse["tracks"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema(`/artists/${artistId}/top-tracks`, GetArtistTopTracksResponseSchema, {
        query: { market: country },
      })
      .pipe(Effect.map((response) => response.tracks));
  }

  public getRelatedArtists(
    artistId: string,
  ): Effect.Effect<GetRelatedArtistsResponse["artists"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema(`/artists/${artistId}/related-artists`, GetRelatedArtistsResponseSchema)
      .pipe(Effect.map((response) => response.artists));
  }
}

export const layer = Layer.effect(
  Artists,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new ArtistsApi(request);

    return {
      getArtist: api.getArtist.bind(api),
      getArtists: api.getArtists.bind(api),
      getArtistAlbums: api.getArtistAlbums.bind(api),
      getArtistTopTracks: api.getArtistTopTracks.bind(api),
      getRelatedArtists: api.getRelatedArtists.bind(api),
    };
  }),
);
