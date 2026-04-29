import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import { ServiceMap } from "effect";
import { HttpClient, HttpClientRequest, type HttpClientResponse } from "effect/unstable/http";
import {
  SpotifyConfigurationError,
  SpotifyParseError,
  SpotifyRateLimitError,
  isRetryableError,
  makeSpotifyHttpError,
  mapHttpClientError,
  type SpotifyRequestError,
} from "../errors/SpotifyError";
import { decodeSpotifyApiErrorBody } from "../model/SpotifyErrorSchemas";
import { SpotifyAuth } from "./SpotifyAuth";
import { SpotifyConfig, type SpotifyRetryConfig } from "./SpotifyConfig";
import { SpotifySession } from "./SpotifySession";

const spotifyApiBaseUrl = "https://api.spotify.com/v1";

type QueryValue = string | number | boolean | ReadonlyArray<string | number | boolean> | undefined;
type SyncDecodableSchema = Schema.Top & { readonly DecodingServices: never };
type DecodableSchema<A> = Schema.Top & { readonly Type: A };

export type { SpotifyRetryConfig };

export interface SpotifyRequestOptions {
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
}

export type SpotifyRequestService = ServiceMap.Service.Shape<typeof SpotifyRequest>;

const defaultRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

const buildUrl = (path: string): string =>
  new URL(path.startsWith("/") ? path.slice(1) : path, `${spotifyApiBaseUrl}/`).toString();

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

const decodeVoidResponse = (
  _response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<void, SpotifyRequestError> => Effect.void;

const decodeSuccessResponse = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<unknown, SpotifyRequestError> =>
  Effect.gen(function* () {
    const body = yield* response.json.pipe(Effect.mapError(mapHttpClientError));

    return body;
  });

const parseRetryAfterSeconds = (retryAfter: string | undefined): number => {
  if (retryAfter === undefined) {
    return 0;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
};

const decodeSuccessResponseWithSchema = <A>(
  response: HttpClientResponse.HttpClientResponse,
  schema: DecodableSchema<A>,
): Effect.Effect<A, SpotifyRequestError> =>
  Effect.gen(function* () {
    const body = yield* response.json.pipe(Effect.mapError(mapHttpClientError));
    const decode = Schema.decodeUnknownSync(
      schema as unknown as SyncDecodableSchema & { readonly Type: A },
    );

    return yield* Effect.try({
      try: () => decode(body),
      catch: (cause) =>
        new SpotifyParseError({
          cause,
          method: response.request.method,
          url: response.request.url,
          description: "Failed to decode Spotify API response",
        }),
    });
  });

const decodeFailureResponse = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<never, SpotifyRequestError> =>
  Effect.gen(function* () {
    const text = yield* response.text.pipe(Effect.mapError(mapHttpClientError));
    const body = parseJson(text);
    const decodedError = decodeSpotifyApiErrorBody(body);

    return yield* makeSpotifyHttpError({
      status: response.status,
      method: response.request.method,
      url: response.request.url,
      ...(decodedError.body === undefined ? null : { body: decodedError.body }),
      ...(decodedError.message === undefined ? null : { apiMessage: decodedError.message }),
    });
  });

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface AccessTokenResolver {
  getAccessToken(): Effect.Effect<string, SpotifyRequestError, HttpClient.HttpClient>;
  invalidateAccessToken(): Effect.Effect<void>;
}

const setUrlParams = (
  request: HttpClientRequest.HttpClientRequest,
  query: Readonly<Record<string, QueryValue>>,
) => HttpClientRequest.setUrlParams(request, query as Record<string, string>);

const sendRequest = (
  accessToken: string,
  path: string,
  method: HttpMethod = "GET",
  options?: SpotifyRequestOptions,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  SpotifyRequestError,
  HttpClient.HttpClient
> => {
  if (method === "GET") {
    return HttpClient.get(buildUrl(path), {
      acceptJson: true,
      headers: { Authorization: `Bearer ${accessToken}` },
      urlParams: options?.query,
    }).pipe(Effect.mapError(mapHttpClientError));
  }

  const makeReq =
    method === "POST"
      ? HttpClientRequest.post
      : method === "PUT"
        ? HttpClientRequest.put
        : HttpClientRequest.delete;

  let request = makeReq(buildUrl(path)).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(accessToken),
  );

  if (options?.query) {
    request = setUrlParams(request, options.query);
  }

  if (options?.body !== undefined) {
    request = HttpClientRequest.bodyJsonUnsafe(request, options.body);
  }

  return HttpClient.execute(request).pipe(Effect.mapError(mapHttpClientError));
};

const annotateResponse = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<void> =>
  Effect.annotateCurrentSpan({
    "spotify.http.status_code": response.status,
    "spotify.http.method": response.request.method,
    "spotify.http.url": response.request.url,
    ...(response.status === 429 && response.headers["retry-after"] !== undefined
      ? { "spotify.http.retry_after": response.headers["retry-after"] }
      : null),
  });

type DecodeFn<A> = (
  response: HttpClientResponse.HttpClientResponse,
) => Effect.Effect<A, SpotifyRequestError>;

const executeRequest = <A>(
  accessToken: string,
  path: string,
  decode: DecodeFn<A>,
  method: HttpMethod = "GET",
  options?: SpotifyRequestOptions,
): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const response = yield* sendRequest(accessToken, path, method, options);
    yield* annotateResponse(response);

    if (response.status >= 200 && response.status < 300) {
      return yield* decode(response);
    }

    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(response.headers["retry-after"]);

      if (retryAfterSeconds > 0) {
        yield* Effect.sleep(`${retryAfterSeconds} seconds`);
      }

      return yield* new SpotifyRateLimitError({
        method: response.request.method,
        url: response.request.url,
        retryAfterSeconds,
      });
    }

    return yield* decodeFailureResponse(response);
  });

const withRetry = <A, R>(
  effect: Effect.Effect<A, SpotifyRequestError, R>,
  retryConfig: typeof defaultRetryConfig,
  attemptRef: Ref.Ref<number>,
): Effect.Effect<A, SpotifyRequestError, R> =>
  Effect.gen(function* () {
    let lastError: SpotifyRequestError | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      yield* Ref.set(attemptRef, attempt);
      yield* Effect.annotateCurrentSpan({ "spotify.retry.attempt": attempt });

      const result = yield* effect.pipe(
        Effect.matchEffect({
          onFailure: (error) => Effect.succeed({ _tag: "Error" as const, error }),
          onSuccess: (value) => Effect.succeed({ _tag: "Success" as const, value }),
        }),
      );

      if (result._tag === "Success") {
        return result.value;
      }

      lastError = result.error;

      if (!isRetryableError(result.error)) {
        return yield* result.error;
      }

      if (attempt < retryConfig.maxRetries) {
        const delayMs = Math.min(
          retryConfig.baseDelayMs * Math.pow(2, attempt),
          retryConfig.maxDelayMs,
        );
        yield* Effect.sleep(`${delayMs} millis`);
      }
    }

    yield* Effect.annotateCurrentSpan({ "spotify.retry.exhausted": true });

    if (lastError !== undefined) {
      return yield* lastError;
    }

    return yield* new SpotifyConfigurationError({
      message: "Retry exhausted before a request error was captured",
    });
  });

const makeRequestWithAuthRetry = <A>(
  accessTokenResolver: AccessTokenResolver,
  path: string,
  decode: DecodeFn<A>,
  retryConfig: typeof defaultRetryConfig,
  method: HttpMethod = "GET",
  options?: SpotifyRequestOptions,
): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const attemptRef = yield* Ref.make(0);

    const tryWithToken = (token: string) =>
      withRetry(executeRequest(token, path, decode, method, options), retryConfig, attemptRef);

    const accessToken = yield* accessTokenResolver.getAccessToken();

    const result = yield* tryWithToken(accessToken).pipe(
      Effect.matchEffect({
        onFailure: (error) => Effect.succeed({ _tag: "Error" as const, error }),
        onSuccess: (value) => Effect.succeed({ _tag: "Success" as const, value }),
      }),
    );

    if (result._tag === "Error") {
      if (result.error._tag === "SpotifyHttpError" && result.error.status === 401) {
        yield* Effect.annotateCurrentSpan({ "spotify.auth.retry_on_unauthorized": true });
        yield* Effect.withSpan(
          accessTokenResolver.invalidateAccessToken(),
          "spotify.auth.invalidate",
        );

        const freshToken = yield* accessTokenResolver.getAccessToken();
        return yield* tryWithToken(freshToken);
      }
      return yield* result.error;
    }

    return result.value;
  });

const createSpotifyRequest = (
  accessTokenResolver: AccessTokenResolver,
  retry?: SpotifyRetryConfig,
) => {
  const retryConfig = {
    ...defaultRetryConfig,
    ...retry,
  };

  const withSpanAttrs = (
    path: string,
    method: HttpMethod,
    options?: SpotifyRequestOptions,
    usesSchema = false,
  ) => ({
    attributes: {
      "spotify.request.path": path,
      "spotify.request.method": method,
      "spotify.request.has_query": options?.query !== undefined,
      ...(usesSchema ? { "spotify.request.uses_schema": true } : null),
    },
  });

  return {
    getJson: (path: string, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          decodeSuccessResponse,
          retryConfig,
          "GET",
          options,
        ),
        `spotify.request GET ${path}`,
        withSpanAttrs(path, "GET", options),
      ),
    getJsonWithSchema: <A>(
      path: string,
      schema: DecodableSchema<A>,
      options?: SpotifyRequestOptions,
    ) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          (response) => decodeSuccessResponseWithSchema(response, schema),
          retryConfig,
          "GET",
          options,
        ),
        `spotify.request GET ${path}`,
        withSpanAttrs(path, "GET", options, true),
      ),
    postJsonWithSchema: <A>(
      path: string,
      schema: DecodableSchema<A>,
      options?: SpotifyRequestOptions,
    ) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          (response) => decodeSuccessResponseWithSchema(response, schema),
          retryConfig,
          "POST",
          options,
        ),
        `spotify.request POST ${path}`,
        withSpanAttrs(path, "POST", options, true),
      ),
    postJson: (path: string, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          decodeVoidResponse,
          retryConfig,
          "POST",
          options,
        ),
        `spotify.request POST ${path}`,
        withSpanAttrs(path, "POST", options),
      ),
    putJson: (path: string, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          decodeVoidResponse,
          retryConfig,
          "PUT",
          options,
        ),
        `spotify.request PUT ${path}`,
        withSpanAttrs(path, "PUT", options),
      ),
    deleteJson: <A>(path: string, schema: DecodableSchema<A>, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          (response) => decodeSuccessResponseWithSchema(response, schema),
          retryConfig,
          "DELETE",
          options,
        ),
        `spotify.request DELETE ${path}`,
        withSpanAttrs(path, "DELETE", options, true),
      ),
    deleteVoid: (path: string, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          decodeVoidResponse,
          retryConfig,
          "DELETE",
          options,
        ),
        `spotify.request DELETE ${path}`,
        withSpanAttrs(path, "DELETE", options),
      ),
  };
};

export class SpotifyRequest extends ServiceMap.Service<
  SpotifyRequest,
  {
    readonly getJson: (
      path: string,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<unknown, SpotifyRequestError>;
    readonly getJsonWithSchema: <A>(
      path: string,
      schema: DecodableSchema<A>,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<A, SpotifyRequestError>;
    readonly postJsonWithSchema: <A>(
      path: string,
      schema: DecodableSchema<A>,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<A, SpotifyRequestError>;
    readonly postJson: (
      path: string,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly putJson: (
      path: string,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
    readonly deleteJson: <A>(
      path: string,
      schema: DecodableSchema<A>,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<A, SpotifyRequestError>;
    readonly deleteVoid: (
      path: string,
      options?: SpotifyRequestOptions,
    ) => Effect.Effect<void, SpotifyRequestError>;
  }
>()("spotify-effect/SpotifyRequest", {
  make: Effect.gen(function* () {
    const auth = yield* SpotifyAuth;
    const client = yield* HttpClient.HttpClient;
    const config = yield* SpotifyConfig;
    const session = yield* SpotifySession;
    const canUseClientCredentials = config.clientId.length > 0 && config.clientSecret.length > 0;
    const provideClient = <A>(
      effect: Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient>,
    ) => Effect.provideService(effect, HttpClient.HttpClient, client);
    const request = createSpotifyRequest(
      {
        getAccessToken: () =>
          session.getAccessToken({
            auth,
            canUseClientCredentials,
          }),
        invalidateAccessToken: () => session.invalidateAccessToken(),
      },
      config.retry,
    );

    return {
      getJson: (path, options) => provideClient(request.getJson(path, options)),
      getJsonWithSchema: (path, schema, options) =>
        provideClient(request.getJsonWithSchema(path, schema, options)),
      postJsonWithSchema: (path, schema, options) =>
        provideClient(request.postJsonWithSchema(path, schema, options)),
      postJson: (path, options) => provideClient(request.postJson(path, options)),
      putJson: (path, options) => provideClient(request.putJson(path, options)),
      deleteJson: (path, schema, options) =>
        provideClient(request.deleteJson(path, schema, options)),
      deleteVoid: (path, options) => provideClient(request.deleteVoid(path, options)),
    };
  }),
}) {
  static readonly layer = Layer.effect(this)(this.make);
}
