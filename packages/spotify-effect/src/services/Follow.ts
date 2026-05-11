import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, CursorBasedPaging } from "../model/SpotifyObjects";
import type { FollowPlaylistOptions, GetFollowedArtistsOptions } from "../model/SpotifyOptions";

export class Follow extends Context.Service<
  Follow,
  {
    readonly getFollowedArtists: (
      options?: GetFollowedArtistsOptions,
    ) => Effect.Effect<CursorBasedPaging<Artist>, SpotifyRequestError>;
    readonly followArtists: (
      artistIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly unfollowArtists: (
      artistIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly followUsers: (
      userIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly unfollowUsers: (
      userIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly isFollowingArtists: (
      artistIds: ReadonlyArray<string>,
    ) => Effect.Effect<boolean[], SpotifyRequestError>;
    readonly isFollowingUsers: (
      userIds: ReadonlyArray<string>,
    ) => Effect.Effect<boolean[], SpotifyRequestError>;
    readonly followPlaylist: (
      playlistId: string,
      options?: FollowPlaylistOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly unfollowPlaylist: (playlistId: string) => Effect.Effect<void, SpotifyRequestError>;
    readonly areFollowingPlaylist: (
      playlistId: string,
      userIds: ReadonlyArray<string>,
    ) => Effect.Effect<boolean[], SpotifyRequestError>;
  }
>()("spotify-effect/Follow") {}
