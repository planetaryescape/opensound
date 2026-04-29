import { ServiceMap } from "effect";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, Paging, SimplifiedAlbum } from "../model/SpotifyObjects";
import type { GetArtistAlbumsOptions } from "../model/SpotifyOptions";
import type {
  GetArtistTopTracksResponse,
  GetArtistsResponse,
  GetRelatedArtistsResponse,
} from "../model/SpotifyResponses";

export class Artists extends ServiceMap.Service<
  Artists,
  {
    readonly getArtist: (artistId: string) => Effect.Effect<Artist, SpotifyRequestError>;
    readonly getArtists: (
      artistIds: ReadonlyArray<string>,
    ) => Effect.Effect<GetArtistsResponse["artists"], SpotifyRequestError>;
    readonly getArtistAlbums: (
      artistId: string,
      options?: GetArtistAlbumsOptions,
    ) => Effect.Effect<Paging<SimplifiedAlbum>, SpotifyRequestError>;
    readonly getArtistTopTracks: (
      artistId: string,
      country: string,
    ) => Effect.Effect<GetArtistTopTracksResponse["tracks"], SpotifyRequestError>;
    readonly getRelatedArtists: (
      artistId: string,
    ) => Effect.Effect<GetRelatedArtistsResponse["artists"], SpotifyRequestError>;
  }
>()("spotify-effect/Artists") {}
