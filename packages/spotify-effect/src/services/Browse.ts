import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Category } from "../model/SpotifyObjects";
import type {
  GetCategoriesOptions,
  GetCategoryOptions,
  GetCategoryPlaylistsOptions,
  GetFeaturedPlaylistsOptions,
  GetNewReleasesOptions,
} from "../model/SpotifyOptions";
import type {
  GetCategoriesResponse,
  GetCategoryPlaylistsResponse,
  GetFeaturedPlaylistsResponse,
  GetNewReleasesResponse,
} from "../model/SpotifyResponses";

export class Browse extends Context.Service<
  Browse,
  {
    readonly getCategories: (
      options?: GetCategoriesOptions,
    ) => Effect.Effect<GetCategoriesResponse["categories"], SpotifyRequestError>;
    readonly getCategory: (
      categoryId: string,
      options?: GetCategoryOptions,
    ) => Effect.Effect<Category, SpotifyRequestError>;
    readonly getCategoryPlaylists: (
      categoryId: string,
      options?: GetCategoryPlaylistsOptions,
    ) => Effect.Effect<GetCategoryPlaylistsResponse["playlists"], SpotifyRequestError>;
    readonly getFeaturedPlaylists: (
      options?: GetFeaturedPlaylistsOptions,
    ) => Effect.Effect<GetFeaturedPlaylistsResponse, SpotifyRequestError>;
    readonly getNewReleases: (
      options?: GetNewReleasesOptions,
    ) => Effect.Effect<GetNewReleasesResponse["albums"], SpotifyRequestError>;
    readonly getAvailableGenreSeeds: () => Effect.Effect<
      ReadonlyArray<string>,
      SpotifyRequestError
    >;
  }
>()("spotify-effect/Browse") {}
