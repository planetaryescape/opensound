import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type {
  CurrentlyPlaying,
  CurrentlyPlayingContext,
  CursorBasedPaging,
  Device,
  PlayHistory,
  QueueObject,
  RepeatState,
} from "../model/SpotifyObjects";
import type {
  DeviceIdOptions,
  GetCurrentlyPlayingTrackOptions,
  GetPlaybackInfoOptions,
  GetRecentlyPlayedTracksOptions,
  PlayOptions,
  TransferPlaybackOptions,
} from "../model/SpotifyOptions";

export class Player extends Context.Service<
  Player,
  {
    readonly getPlaybackInfo: (
      options?: GetPlaybackInfoOptions,
    ) => Effect.Effect<CurrentlyPlayingContext, SpotifyRequestError>;
    readonly getMyDevices: () => Effect.Effect<Device[], SpotifyRequestError>;
    readonly getCurrentlyPlayingTrack: (
      options?: GetCurrentlyPlayingTrackOptions,
    ) => Effect.Effect<CurrentlyPlaying, SpotifyRequestError>;
    readonly getRecentlyPlayedTracks: (
      options?: GetRecentlyPlayedTracksOptions,
    ) => Effect.Effect<CursorBasedPaging<PlayHistory>, SpotifyRequestError>;
    readonly getQueue: () => Effect.Effect<QueueObject, SpotifyRequestError>;
    readonly transferPlayback: (
      deviceId: string,
      options?: TransferPlaybackOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly play: (options?: PlayOptions) => Effect.Effect<void, SpotifyRequestError>;
    readonly pause: (options?: DeviceIdOptions) => Effect.Effect<void, SpotifyRequestError>;
    readonly seek: (
      positionMs: number,
      options?: DeviceIdOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly setRepeat: (
      state: RepeatState,
      options?: DeviceIdOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly setVolume: (
      volumePercent: number,
      options?: DeviceIdOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly setShuffle: (
      state: boolean,
      options?: DeviceIdOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly skipToNext: (options?: DeviceIdOptions) => Effect.Effect<void, SpotifyRequestError>;
    readonly skipToPrevious: (
      options?: DeviceIdOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly addToQueue: (
      uri: string,
      options?: DeviceIdOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
  }
>()("spotify-effect/Player") {}
