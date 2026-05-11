import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, Paging, Track } from "../model/SpotifyObjects";
import type { PersonalizationOptions } from "../model/SpotifyOptions";

export class Personalization extends Context.Service<
  Personalization,
  {
    readonly getMyTopArtists: (
      options?: PersonalizationOptions,
    ) => Effect.Effect<Paging<Artist>, SpotifyRequestError>;
    readonly getMyTopTracks: (
      options?: PersonalizationOptions,
    ) => Effect.Effect<Paging<Track>, SpotifyRequestError>;
  }
>()("spotify-effect/Personalization") {}
