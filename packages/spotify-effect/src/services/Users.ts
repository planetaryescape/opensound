import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { PrivateUser, PublicUser } from "../model/SpotifyObjects";

export class Users extends Context.Service<
  Users,
  {
    readonly getCurrentUserProfile: () => Effect.Effect<PrivateUser, SpotifyRequestError>;
    readonly getUser: (userId: string) => Effect.Effect<PublicUser, SpotifyRequestError>;
  }
>()("spotify-effect/Users") {}
