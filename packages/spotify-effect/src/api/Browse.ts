import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Category } from "../model/SpotifyObjects";
import { CategorySchema } from "../model/SpotifyObjectSchemas";
import type {
  GetCategoriesOptions,
  GetCategoryOptions,
  GetCategoryPlaylistsOptions,
  GetFeaturedPlaylistsOptions,
  GetNewReleasesOptions,
} from "../model/SpotifyOptions";
import type {
  GetAvailableGenreSeedsResponse,
  GetCategoriesResponse,
  GetCategoryPlaylistsResponse,
  GetFeaturedPlaylistsResponse,
  GetNewReleasesResponse,
} from "../model/SpotifyResponses";
import {
  GetAvailableGenreSeedsResponseSchema,
  GetCategoriesResponseSchema,
  GetCategoryPlaylistsResponseSchema,
  GetFeaturedPlaylistsResponseSchema,
  GetNewReleasesResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Browse } from "../services/Browse";
import {
  SpotifyRequest,
  type SpotifyRequestOptions,
  type SpotifyRequestService,
} from "../services/SpotifyRequest";

const buildQuery = (
  options: Record<string, string | number | undefined> | undefined,
): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) query[key] = value;
  }
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class BrowseApi {
  constructor(private readonly request: SpotifyRequestService) {}

  public getCategories(
    options?: GetCategoriesOptions,
  ): Effect.Effect<GetCategoriesResponse["categories"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/browse/categories", GetCategoriesResponseSchema, buildQuery(options))
      .pipe(Effect.map((response) => response.categories));
  }

  public getCategory(
    categoryId: string,
    options?: GetCategoryOptions,
  ): Effect.Effect<Category, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/browse/categories/${categoryId}`,
      CategorySchema,
      buildQuery(options),
    );
  }

  public getCategoryPlaylists(
    categoryId: string,
    options?: GetCategoryPlaylistsOptions,
  ): Effect.Effect<GetCategoryPlaylistsResponse["playlists"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema(
        `/browse/categories/${categoryId}/playlists`,
        GetCategoryPlaylistsResponseSchema,
        buildQuery(options),
      )
      .pipe(Effect.map((response) => response.playlists));
  }

  public getFeaturedPlaylists(
    options?: GetFeaturedPlaylistsOptions,
  ): Effect.Effect<GetFeaturedPlaylistsResponse, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/browse/featured-playlists",
      GetFeaturedPlaylistsResponseSchema,
      buildQuery(options),
    );
  }

  public getNewReleases(
    options?: GetNewReleasesOptions,
  ): Effect.Effect<GetNewReleasesResponse["albums"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/browse/new-releases", GetNewReleasesResponseSchema, buildQuery(options))
      .pipe(Effect.map((response) => response.albums));
  }

  public getAvailableGenreSeeds(): Effect.Effect<
    GetAvailableGenreSeedsResponse["genres"],
    SpotifyRequestError
  > {
    return this.request
      .getJsonWithSchema(
        "/recommendations/available-genre-seeds",
        GetAvailableGenreSeedsResponseSchema,
      )
      .pipe(Effect.map((response) => response.genres));
  }
}

export const layer = Layer.effect(
  Browse,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new BrowseApi(request);

    return {
      getCategories: api.getCategories.bind(api),
      getCategory: api.getCategory.bind(api),
      getCategoryPlaylists: api.getCategoryPlaylists.bind(api),
      getFeaturedPlaylists: api.getFeaturedPlaylists.bind(api),
      getNewReleases: api.getNewReleases.bind(api),
      getAvailableGenreSeeds: api.getAvailableGenreSeeds.bind(api),
    };
  }),
);
