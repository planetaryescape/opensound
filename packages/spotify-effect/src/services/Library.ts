import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Paging, SavedAlbum, SavedTrack } from "../model/SpotifyObjects";
import type {
  GetSavedAlbumsOptions,
  GetSavedTracksOptions,
  RemoveSavedShowsOptions,
} from "../model/SpotifyOptions";

export class Library extends Context.Service<
  Library,
  {
    readonly getSavedAlbums: (
      options?: GetSavedAlbumsOptions,
    ) => Effect.Effect<Paging<SavedAlbum>, SpotifyRequestError>;
    readonly getSavedTracks: (
      options?: GetSavedTracksOptions,
    ) => Effect.Effect<Paging<SavedTrack>, SpotifyRequestError>;
    readonly areAlbumsSaved: (
      albumIds: ReadonlyArray<string>,
    ) => Effect.Effect<boolean[], SpotifyRequestError>;
    readonly areTracksSaved: (
      trackIds: ReadonlyArray<string>,
    ) => Effect.Effect<boolean[], SpotifyRequestError>;
    readonly saveAlbums: (
      albumIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly saveTracks: (
      trackIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly removeSavedAlbums: (
      albumIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly removeSavedTracks: (
      trackIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly removeSavedShows: (
      showIds: ReadonlyArray<string>,
      options?: RemoveSavedShowsOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
  }
>()("spotify-effect/Library") {}
