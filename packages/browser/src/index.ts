import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import {
  Albums,
  Artists,
  Browse,
  Follow,
  Library,
  makeSpotifyLayer,
  Markets,
  Personalization,
  Player,
  Playlists,
  Search,
  SpotifyAuth,
  SpotifyConfigurationError,
  SpotifySession,
  Tracks,
  Users,
  type AuthorizationScope,
  type SpotifyCredentials,
  type SpotifyLayerOptions,
  type SpotifyRequestError,
} from "@spotify-effect/core";
import { getAuthorizationUrl } from "@spotify-effect/core";
import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  makeSpotifyBrowserSession,
  type BrowserRefreshableTokens,
  type SpotifyBrowserSession,
} from "./SpotifyBrowserSession";

const browserHttpClientLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(HttpClient.TracerPropagationEnabled, false),
);

export const makeSpotifyBrowserLayer = (
  options: SpotifyLayerOptions = {},
  credentials: SpotifyCredentials = {},
) =>
  makeSpotifyLayer(
    {
      ...options,
      httpClientLayer: options.httpClientLayer ?? browserHttpClientLayer,
    },
    credentials,
  );

const tokensToRefreshableResponse = (
  tokens: BrowserRefreshableTokens,
): {
  readonly access_token: string;
  readonly token_type: "Bearer";
  readonly expires_in: number;
  readonly scope: string;
  readonly refresh_token: string;
} => ({
  access_token: tokens.accessToken,
  token_type: "Bearer",
  expires_in: Math.max(0, Math.ceil((tokens.accessTokenExpiresAt - Date.now()) / 1000)),
  scope: "",
  refresh_token: tokens.refreshToken,
});

type AlbumsService = Albums["Service"];
type ArtistsService = Artists["Service"];
type BrowseService = Browse["Service"];
type FollowService = Follow["Service"];
type LibraryService = Library["Service"];
type MarketsService = Markets["Service"];
type PersonalizationService = Personalization["Service"];
type PlayerService = Player["Service"];
type PlaylistsService = Playlists["Service"];
type SearchService = Search["Service"];
type TracksService = Tracks["Service"];
type UsersService = Users["Service"];

export interface SpotifyBrowserOptions {
  readonly clientId: string;
  readonly redirectUri?: string;
  readonly httpClientLayer?: SpotifyLayerOptions["httpClientLayer"];
  readonly session: {
    readonly sessionStorage: Storage;
    readonly localStorage: Storage;
    readonly history: History;
  };
}

export class SpotifyBrowser extends Context.Service<
  SpotifyBrowser,
  {
    readonly auth: {
      readonly startPkceLogin: (opts: {
        readonly scopes: ReadonlyArray<AuthorizationScope>;
        readonly redirectUri?: string;
      }) => Effect.Effect<string>;
      readonly exchangeCode: (
        code: string,
      ) => Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError>;
      readonly refreshToken: (
        refreshToken: string,
      ) => Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError>;
      readonly getTokens: () => BrowserRefreshableTokens | undefined;
      readonly setTokens: (tokens: BrowserRefreshableTokens) => void;
      readonly logout: () => void;
      readonly getSession: () => SpotifyBrowserSession;
    };
    readonly albums: AlbumsService;
    readonly artists: ArtistsService;
    readonly browse: BrowseService;
    readonly follow: FollowService;
    readonly library: LibraryService;
    readonly markets: MarketsService;
    readonly personalization: PersonalizationService;
    readonly player: PlayerService;
    readonly playlists: PlaylistsService;
    readonly search: SearchService;
    readonly tracks: TracksService;
    readonly users: UsersService;
  }
>()("spotify-effect/SpotifyBrowser") {
  static layer(options: SpotifyBrowserOptions) {
    const session = makeSpotifyBrowserSession(options.session);
    const getCredentials = (): SpotifyCredentials => {
      const tokens = session.getTokens();

      if (tokens === undefined) {
        return {};
      }

      return {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshToken: tokens.refreshToken,
      };
    };

    const make = Effect.gen(function* () {
      const auth = yield* SpotifyAuth;
      const spotifySession = yield* SpotifySession;
      const albums = yield* Albums;
      const artists = yield* Artists;
      const browse = yield* Browse;
      const follow = yield* Follow;
      const library = yield* Library;
      const markets = yield* Markets;
      const personalization = yield* Personalization;
      const player = yield* Player;
      const playlists = yield* Playlists;
      const search = yield* Search;
      const tracks = yield* Tracks;
      const users = yield* Users;

      return {
        auth: {
          startPkceLogin: (opts: {
            readonly scopes: ReadonlyArray<AuthorizationScope>;
            readonly redirectUri?: string;
          }): Effect.Effect<string> =>
            Effect.gen(function* () {
              const redirectUri =
                opts.redirectUri ?? options.redirectUri ?? `${window.location.origin}/`;
              const verifier = yield* createPkceCodeVerifier();
              const challenge = yield* createPkceCodeChallenge(verifier);

              const url = getAuthorizationUrl(options.clientId, redirectUri, "code", {
                scope: opts.scopes,
                code_challenge: challenge,
                code_challenge_method: "S256",
              });

              session.setPkceState({
                verifier,
                clientId: options.clientId,
                redirectUri,
              });

              return url;
            }),

          exchangeCode: (
            code: string,
          ): Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError> =>
            Effect.gen(function* () {
              const pkceState = session.getPkceState();
              if (!pkceState) {
                return yield* new SpotifyConfigurationError({
                  message: "No stored PKCE state. Start the login flow first.",
                });
              }

              const result = yield* auth.getRefreshableUserTokensWithPkce({
                clientId: pkceState.clientId,
                code,
                codeVerifier: pkceState.verifier,
              });

              const tokens: BrowserRefreshableTokens = {
                accessToken: result.access_token,
                refreshToken: result.refresh_token,
                accessTokenExpiresAt: Date.now() + result.expires_in * 1000,
              };

              yield* spotifySession.setRefreshableUserTokens(result);
              session.setTokens(tokens);
              session.clearCallbackParams(new URL(window.location.href));

              return tokens;
            }),

          refreshToken: (
            refreshToken: string,
          ): Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError> =>
            Effect.gen(function* () {
              const result = yield* auth.getRefreshedAccessToken(refreshToken);

              const existing = session.getTokens();
              const tokens: BrowserRefreshableTokens = {
                accessToken: result.access_token,
                refreshToken: existing?.refreshToken ?? refreshToken,
                accessTokenExpiresAt: Date.now() + result.expires_in * 1000,
              };

              yield* spotifySession.updateRefreshedAccessToken(tokens.refreshToken, result);
              session.setTokens(tokens);

              return tokens;
            }),

          getTokens: (): BrowserRefreshableTokens | undefined => session.getTokens(),

          setTokens: (tokens: BrowserRefreshableTokens): void => {
            Effect.runSync(
              spotifySession.setRefreshableUserTokens(tokensToRefreshableResponse(tokens)),
            );
            session.setTokens(tokens);
          },

          logout: (): void => {
            Effect.runSync(
              spotifySession.setRefreshableUserTokens({
                access_token: "",
                token_type: "Bearer",
                expires_in: 0,
                scope: "",
                refresh_token: "",
              }),
            );
            options.session.sessionStorage.removeItem("spotify-effect:tokens");
            options.session.localStorage.removeItem("spotify-effect:tokens");
          },

          getSession: (): SpotifyBrowserSession => session,
        },
        albums,
        artists,
        browse,
        follow,
        library,
        markets,
        personalization,
        player,
        playlists,
        search,
        tracks,
        users,
      };
    });

    const spotifyLayer = makeSpotifyBrowserLayer(
      {
        clientId: options.clientId,
        redirectUri: options.redirectUri ?? "",
        ...(options.httpClientLayer === undefined
          ? null
          : { httpClientLayer: options.httpClientLayer }),
      },
      getCredentials(),
    );

    return Layer.effect(SpotifyBrowser)(make).pipe(Layer.provideMerge(spotifyLayer));
  }
}

export type SpotifyBrowserClient = SpotifyBrowser["Service"];

export {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  makeSpotifyBrowserSession,
  readAuthorizationCallback,
} from "./SpotifyBrowserSession";
export { getAuthorizationUrl } from "@spotify-effect/core";
export type {
  BrowserAuthorizationCallback,
  BrowserPkceState,
  BrowserRefreshableTokens,
  SpotifyBrowserSession,
} from "./SpotifyBrowserSession";
export type { GetAuthorizationUrlOptions, PKCEExtensionOptions } from "@spotify-effect/core";
export type { SpotifyApiOptions, SpotifyCredentials } from "@spotify-effect/core";
export type { AuthorizationScope } from "@spotify-effect/core";
