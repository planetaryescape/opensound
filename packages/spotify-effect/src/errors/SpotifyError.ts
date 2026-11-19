import * as Data from "effect/Data";
import * as HttpClientError from "effect/http/HttpClientError";

export class SpotifyTransportError extends Data.TaggedError("SpotifyTransportError")<{
  readonly cause: unknown;
  readonly method: string;
  readonly url: string;
  readonly description?: string;
}> {}

export class SpotifyHttpError extends Data.TaggedError("SpotifyHttpError")<{
  readonly status: number;
  readonly method: string;
  readonly url: string;
  readonly apiMessage?: string;
  readonly body?: unknown;
  readonly description?: string;
}> {}

export class SpotifyParseError extends Data.TaggedError("SpotifyParseError")<{
  readonly cause: unknown;
  readonly method: string;
  readonly url: string;
  readonly description?: string;
}> {}

export class SpotifyConfigurationError extends Data.TaggedError("SpotifyConfigurationError")<{
  readonly message: string;
}> {}

export class SpotifyRateLimitError extends Data.TaggedError("SpotifyRateLimitError")<{
  readonly method: string;
  readonly url: string;
  readonly retryAfterSeconds: number;
}> {}

export type SpotifyRequestError =
  | SpotifyTransportError
  | SpotifyHttpError
  | SpotifyParseError
  | SpotifyConfigurationError
  | SpotifyRateLimitError;

export const isRetryableError = (error: SpotifyRequestError): boolean => {
  if (error._tag === "SpotifyTransportError") {
    return true;
  }
  if (error._tag === "SpotifyRateLimitError") {
    return true;
  }
  if (error._tag === "SpotifyHttpError") {
    return error.status === 429 || error.status >= 500;
  }
  return false;
};

export interface SpotifyHttpErrorDetails {
  readonly status: number;
  readonly method: string;
  readonly url: string;
  readonly apiMessage?: string;
  readonly body?: unknown;
  readonly description?: string;
}

export const makeSpotifyHttpError = (details: SpotifyHttpErrorDetails): SpotifyHttpError =>
  new SpotifyHttpError({
    status: details.status,
    method: details.method,
    url: details.url,
    ...(details.apiMessage === undefined ? null : { apiMessage: details.apiMessage }),
    ...(details.body === undefined ? null : { body: details.body }),
    ...(details.description === undefined ? null : { description: details.description }),
  });

export const mapHttpClientError = (error: HttpClientError.HttpClientError): SpotifyRequestError => {
  const reason = error.reason;

  switch (reason._tag) {
    case "StatusCodeError":
      return makeSpotifyHttpError({
        status: reason.response.status,
        method: reason.request.method,
        url: reason.request.url,
        ...(reason.description === undefined ? null : { description: reason.description }),
      });
    case "DecodeError":
    case "EmptyBodyError":
      return new SpotifyParseError({
        cause: reason.cause,
        method: reason.request.method,
        url: reason.request.url,
        ...(reason.description === undefined ? null : { description: reason.description }),
      });
    default:
      return new SpotifyTransportError({
        cause: reason.cause,
        method: reason.request.method,
        url: reason.request.url,
        ...(reason.description === undefined ? null : { description: reason.description }),
      });
  }
};
