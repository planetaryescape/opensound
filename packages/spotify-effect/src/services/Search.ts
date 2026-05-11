import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { SearchType } from "../model/SpotifyObjects";
import type { SearchOptions } from "../model/SpotifyOptions";
import type { SearchResponse } from "../model/SpotifyResponses";

export class Search extends Context.Service<
  Search,
  {
    readonly search: (
      query: string,
      types: ReadonlyArray<SearchType>,
      options?: SearchOptions,
    ) => Effect.Effect<SearchResponse, SpotifyRequestError>;
  }
>()("spotify-effect/Search") {}
