import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Album, Paging, SimplifiedTrack } from "../model/SpotifyObjects";
import type { GetAlbumTracksOptions, MarketOptions } from "../model/SpotifyOptions";
import type { GetAlbumsResponse } from "../model/SpotifyResponses";

export class Albums extends Context.Service<
  Albums,
  {
    readonly getAlbum: (
      albumId: string,
      options?: MarketOptions,
    ) => Effect.Effect<Album, SpotifyRequestError>;
    readonly getAlbums: (
      albumIds: ReadonlyArray<string>,
      options?: MarketOptions,
    ) => Effect.Effect<GetAlbumsResponse["albums"], SpotifyRequestError>;
    readonly getAlbumTracks: (
      albumId: string,
      options?: GetAlbumTracksOptions,
    ) => Effect.Effect<Paging<SimplifiedTrack>, SpotifyRequestError>;
  }
>()("spotify-effect/Albums") {}
