import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type {
  Paging,
  Playlist,
  PlaylistDetails,
  PlaylistItem,
  SimplifiedPlaylist,
} from "../model/SpotifyObjects";
import type {
  AddItemsToPlaylistOptions,
  CreatePlaylistOptions,
  GetMyPlaylistsOptions,
  GetPlaylistItemsOptions,
  GetPlaylistOptions,
  GetUserPlaylistsOptions,
} from "../model/SpotifyOptions";
import type { SnapshotIdResponse } from "../model/SpotifyResponses";

export class Playlists extends Context.Service<
  Playlists,
  {
    readonly getPlaylist: (
      playlistId: string,
      options?: GetPlaylistOptions,
    ) => Effect.Effect<Playlist, SpotifyRequestError>;
    readonly getPlaylistItems: (
      playlistId: string,
      options?: GetPlaylistItemsOptions,
    ) => Effect.Effect<Paging<PlaylistItem>, SpotifyRequestError>;
    readonly getMyPlaylists: (
      options?: GetMyPlaylistsOptions,
    ) => Effect.Effect<Paging<SimplifiedPlaylist>, SpotifyRequestError>;
    readonly getUserPlaylists: (
      userId: string,
      options?: GetUserPlaylistsOptions,
    ) => Effect.Effect<Paging<SimplifiedPlaylist>, SpotifyRequestError>;
    readonly createPlaylist: (
      userId: string,
      name: string,
      options?: CreatePlaylistOptions,
    ) => Effect.Effect<Playlist, SpotifyRequestError>;
    readonly addItemsToPlaylist: (
      playlistId: string,
      uris: ReadonlyArray<string>,
      options?: AddItemsToPlaylistOptions,
    ) => Effect.Effect<SnapshotIdResponse, SpotifyRequestError>;
    readonly removePlaylistItems: (
      playlistId: string,
      uris: ReadonlyArray<string>,
      snapshotId?: string,
    ) => Effect.Effect<SnapshotIdResponse, SpotifyRequestError>;
    readonly changePlaylistDetails: (
      playlistId: string,
      details: PlaylistDetails,
    ) => Effect.Effect<void, SpotifyRequestError>;
  }
>()("spotify-effect/Playlists") {}
