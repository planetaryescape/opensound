import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import type { HttpClient } from "effect/unstable/http";

export interface SpotifyRetryConfig {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

export interface SpotifyApiOptions {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly redirectUri?: string;
  readonly retry?: SpotifyRetryConfig;
}

export interface SpotifyCredentials {
  readonly accessToken?: string;
  readonly accessTokenExpiresAt?: number;
  readonly refreshToken?: string;
}

export interface SpotifyLayerOptions extends SpotifyApiOptions {
  readonly httpClientLayer?: Layer.Layer<HttpClient.HttpClient>;
}

export interface SpotifyConfigValue {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly retry: SpotifyRetryConfig | undefined;
}

export const SpotifyConfig = Context.Service<SpotifyConfigValue>(
  "spotify-effect/SpotifyConfig"
);

export const SpotifySessionConfig = Context.Service<SpotifyCredentials>(
  "spotify-effect/SpotifySessionConfig"
);

export const makeSpotifyConfigLayer = (options: SpotifyApiOptions = {}) =>
  Layer.succeed(SpotifyConfig, {
    clientId: options.clientId ?? "",
    clientSecret: options.clientSecret ?? "",
    redirectUri: options.redirectUri ?? "",
    retry: options.retry,
  });

export const makeSpotifySessionConfigLayer = (credentials: SpotifyCredentials = {}) =>
  Layer.succeed(SpotifySessionConfig, credentials);
