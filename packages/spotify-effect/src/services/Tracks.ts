import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { AudioAnalysis, AudioFeatures, Track } from "../model/SpotifyObjects";
import type { MarketOptions } from "../model/SpotifyOptions";
import type {
  GetAudioFeaturesForTracksResponse,
  GetTracksResponse,
} from "../model/SpotifyResponses";

export class Tracks extends Context.Service<
  Tracks,
  {
    readonly getTrack: (
      trackId: string,
      options?: MarketOptions,
    ) => Effect.Effect<Track, SpotifyRequestError>;
    readonly getTracks: (
      trackIds: ReadonlyArray<string>,
      options?: MarketOptions,
    ) => Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError>;
    readonly getAudioAnalysisForTrack: (
      trackId: string,
    ) => Effect.Effect<AudioAnalysis, SpotifyRequestError>;
    readonly getAudioFeaturesForTrack: (
      trackId: string,
    ) => Effect.Effect<AudioFeatures, SpotifyRequestError>;
    readonly getAudioFeaturesForTracks: (
      trackIds: ReadonlyArray<string>,
    ) => Effect.Effect<GetAudioFeaturesForTracksResponse["audio_features"], SpotifyRequestError>;
  }
>()("spotify-effect/Tracks") {}
