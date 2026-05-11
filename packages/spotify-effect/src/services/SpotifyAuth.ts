import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { TOKEN_URL } from "../constants";
import {
  SpotifyConfigurationError,
  SpotifyParseError,
  SpotifyRateLimitError,
  makeSpotifyHttpError,
  mapHttpClientError,
  type SpotifyRequestError,
} from "../errors/SpotifyError";
import { decodeSpotifyAccountsErrorBody } from "../model/SpotifyErrorSchemas";
import type {
  GetRefreshableUserTokensResponse,
  GetRefreshedAccessTokenResponse,
  GetTemporaryAppTokensResponse,
} from "../model/SpotifyAuthorization";
import {
  GetRefreshableUserTokensResponseSchema,
  GetRefreshedAccessTokenResponseSchema,
  GetTemporaryAppTokensResponseSchema,
} from "../model/SpotifyAuthorizationSchema";
import { SpotifyConfig } from "./SpotifyConfig";

export type SpotifyAuthService = SpotifyAuth["Service"];

const encodeClientCredentials = (value: string): string => {
  const btoaFn = Reflect.get(globalThis, "btoa");

  if (typeof btoaFn === "function") {
    return btoaFn(value);
  }

  const bufferCtor = Reflect.get(globalThis, "Buffer");

  if (
    typeof bufferCtor === "function" &&
    "from" in bufferCtor &&
    typeof bufferCtor.from === "function"
  ) {
    return bufferCtor.from(value).toString("base64");
  }

  throw new Error("Base64 encoding is not available in this runtime");
};

const parseJson = (value: string): unknown => {
  if (value.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const parseRetryAfterSeconds = (retryAfter: string | undefined): number => {
  if (retryAfter === undefined) {
    return 0;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
};

const getRequiredConfig = (options: { readonly clientId: string; readonly clientSecret: string }) =>
  Effect.gen(function* () {
    if (options.clientId.length === 0 || options.clientSecret.length === 0) {
      return yield* new SpotifyConfigurationError({
        message: "clientId and clientSecret are required for this auth flow",
      });
    }

    const authorization = yield* Effect.try({
      try: () => `Basic ${encodeClientCredentials(`${options.clientId}:${options.clientSecret}`)}`,
      catch: (cause) =>
        new SpotifyConfigurationError({
          message: cause instanceof Error ? cause.message : "Failed to encode client credentials",
        }),
    });

    return {
      authorization,
    };
  });

const getRefreshConfig = (options: { readonly clientId: string; readonly clientSecret: string }) =>
  Effect.gen(function* () {
    if (options.clientSecret.length > 0) {
      const config = yield* getRequiredConfig(options);

      return {
        authorization: config.authorization,
        body: {},
      };
    }

    if (options.clientId.length === 0) {
      return yield* new SpotifyConfigurationError({
        message: "clientId is required for refresh token exchange",
      });
    }

    return {
      authorization: undefined,
      body: {
        client_id: options.clientId,
      },
    };
  });

const requestToken = <A>(options: {
  readonly body: Readonly<Record<string, string>>;
  readonly authorization?: string;
  readonly schema: Schema.Top & { readonly Type: A };
}): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient> =>
  Effect.withSpan(
    Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan({
        "spotify.auth.grant_type": options.body.grant_type,
        "spotify.auth.uses_client_secret": options.authorization !== undefined,
      });

      const response = yield* HttpClient.post(TOKEN_URL, {
        headers: {
          ...(options.authorization === undefined
            ? null
            : { Authorization: options.authorization }),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: HttpClientRequest.bodyUrlParams(options.body)(HttpClientRequest.empty).body,
      }).pipe(Effect.mapError(mapHttpClientError));

      yield* Effect.annotateCurrentSpan({
        "spotify.http.status_code": response.status,
        "spotify.http.method": response.request.method,
        "spotify.http.url": response.request.url,
        ...(response.status === 429 && response.headers["retry-after"] !== undefined
          ? { "spotify.http.retry_after": response.headers["retry-after"] }
          : null),
      });

      if (response.status < 200 || response.status >= 300) {
        if (response.status === 429) {
          return yield* new SpotifyRateLimitError({
            method: response.request.method,
            url: response.request.url,
            retryAfterSeconds: parseRetryAfterSeconds(response.headers["retry-after"]),
          });
        }

        const text = yield* response.text.pipe(Effect.mapError(mapHttpClientError));
        const body = parseJson(text);
        const decodedError = decodeSpotifyAccountsErrorBody(body);

        return yield* makeSpotifyHttpError({
          status: response.status,
          method: response.request.method,
          url: response.request.url,
          ...(decodedError.body === undefined ? null : { body: decodedError.body }),
          ...(decodedError.message === undefined ? null : { apiMessage: decodedError.message }),
        });
      }

      return yield* response.json.pipe(
        Effect.mapError(mapHttpClientError),
        Effect.flatMap((body) =>
          Effect.try({
            try: () => Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)(body),
            catch: (cause) =>
              new SpotifyParseError({
                cause,
                method: response.request.method,
                url: response.request.url,
                description: "Failed to decode Spotify token response",
              }),
          }),
        ),
      );
    }),
    "spotify.auth.token",
  );

const createSpotifyAuth = (config: {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}) => ({
  getRefreshableUserTokens: (code: string) =>
    Effect.gen(function* () {
      if (config.redirectUri.length === 0) {
        return yield* new SpotifyConfigurationError({
          message: "redirectUri is required for authorization code exchange",
        });
      }

      const authConfig = yield* getRequiredConfig(config);

      return yield* requestToken<GetRefreshableUserTokensResponse>({
        authorization: authConfig.authorization,
        schema: GetRefreshableUserTokensResponseSchema,
        body: {
          code,
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri,
        },
      });
    }),
  getRefreshableUserTokensWithPkce: (options: {
    readonly clientId: string;
    readonly code: string;
    readonly codeVerifier: string;
  }) =>
    Effect.gen(function* () {
      if (config.redirectUri.length === 0) {
        return yield* new SpotifyConfigurationError({
          message: "redirectUri is required for PKCE authorization code exchange",
        });
      }

      return yield* requestToken<GetRefreshableUserTokensResponse>({
        schema: GetRefreshableUserTokensResponseSchema,
        body: {
          client_id: options.clientId,
          code: options.code,
          code_verifier: options.codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri,
        },
      });
    }),
  getRefreshedAccessToken: (refreshToken: string) =>
    Effect.gen(function* () {
      const refreshConfig = yield* getRefreshConfig(config);

      return yield* requestToken<GetRefreshedAccessTokenResponse>({
        schema: GetRefreshedAccessTokenResponseSchema,
        body: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          ...refreshConfig.body,
        },
        ...(refreshConfig.authorization === undefined
          ? null
          : { authorization: refreshConfig.authorization }),
      });
    }),
  getTemporaryAppTokens: () =>
    Effect.gen(function* () {
      const authConfig = yield* getRequiredConfig(config);

      return yield* requestToken<GetTemporaryAppTokensResponse>({
        authorization: authConfig.authorization,
        schema: GetTemporaryAppTokensResponseSchema,
        body: {
          grant_type: "client_credentials",
        },
      });
    }),
});

export class SpotifyAuth extends Context.Service<
  SpotifyAuth,
  {
    readonly getRefreshableUserTokens: (
      code: string,
    ) => Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError>;
    readonly getRefreshableUserTokensWithPkce: (options: {
      readonly clientId: string;
      readonly code: string;
      readonly codeVerifier: string;
    }) => Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError>;
    readonly getRefreshedAccessToken: (
      refreshToken: string,
    ) => Effect.Effect<GetRefreshedAccessTokenResponse, SpotifyRequestError>;
    readonly getTemporaryAppTokens: () => Effect.Effect<
      GetTemporaryAppTokensResponse,
      SpotifyRequestError
    >;
  }
>()("spotify-effect/SpotifyAuth") {
  static readonly make = Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const config = yield* SpotifyConfig;
    const auth = createSpotifyAuth(config);
    const provideClient = <A>(
      effect: Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient>,
    ) => Effect.provideService(effect, HttpClient.HttpClient, client);

    return {
      getRefreshableUserTokens: (code: string) => provideClient(auth.getRefreshableUserTokens(code)),
      getRefreshableUserTokensWithPkce: (options: { readonly clientId: string; readonly code: string; readonly codeVerifier: string }) =>
        provideClient(auth.getRefreshableUserTokensWithPkce(options)),
      getRefreshedAccessToken: (refreshToken: string) =>
        provideClient(auth.getRefreshedAccessToken(refreshToken)),
      getTemporaryAppTokens: () => provideClient(auth.getTemporaryAppTokens()),
    };
  });

  static readonly layer = Layer.effect(this, this.make);
}
