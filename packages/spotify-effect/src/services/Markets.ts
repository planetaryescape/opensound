import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";

export class Markets extends Context.Service<
  Markets,
  {
    readonly getMarkets: () => Effect.Effect<string[], SpotifyRequestError>;
  }
>()("spotify-effect/Markets") {}
