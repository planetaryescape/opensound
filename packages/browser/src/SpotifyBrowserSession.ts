import * as Effect from "effect/Effect";

export interface BrowserRefreshableTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresAt: number;
}

export interface BrowserPkceState {
  readonly verifier: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state?: string;
}

export interface BrowserAuthorizationCallback {
  readonly code?: string;
  readonly state?: string;
  readonly error?: string;
}

export interface SpotifyBrowserSession {
  readonly getPkceState: () => BrowserPkceState | undefined;
  readonly setPkceState: (state: BrowserPkceState) => void;
  readonly getTokens: () => BrowserRefreshableTokens | undefined;
  readonly setTokens: (tokens: BrowserRefreshableTokens) => void;
  readonly clearTokens: () => void;
  readonly clearCallbackParams: (url: URL) => void;
}

const defaultStorageKeys = {
  pkceVerifier: "spotify-effect:pkce-verifier",
  clientId: "spotify-effect:client-id",
  redirectUri: "spotify-effect:redirect-uri",
  authState: "spotify-effect:auth-state",
  tokens: "spotify-effect:tokens",
} as const;

const readStoredValue = (sessionStorage: Storage, localStorage: Storage, key: string): string =>
  sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? "";

const storeValue = (
  sessionStorage: Storage,
  localStorage: Storage,
  key: string,
  value: string,
): void => {
  sessionStorage.setItem(key, value);
  localStorage.setItem(key, value);
};

export const readAuthorizationCallback = (url: URL): BrowserAuthorizationCallback => {
  const code = url.searchParams.get("code") ?? undefined;
  const state = url.searchParams.get("state") ?? undefined;
  const error = url.searchParams.get("error") ?? undefined;

  return {
    ...(code === undefined ? null : { code }),
    ...(state === undefined ? null : { state }),
    ...(error === undefined ? null : { error }),
  };
};

const toBase64Url = (value: Uint8Array): string => {
  let binary = "";

  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const createPkceCodeVerifier = (): Effect.Effect<string> =>
  Effect.sync(() => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  });

export const createPkceCodeChallenge = (verifier: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const encoded = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return toBase64Url(new Uint8Array(digest));
  });

export const makeSpotifyBrowserSession = (options: {
  readonly sessionStorage: Storage;
  readonly localStorage: Storage;
  readonly history: History;
}): SpotifyBrowserSession => ({
  getPkceState: () => {
    const verifier = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.pkceVerifier,
    );
    const clientId = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.clientId,
    );
    const redirectUri = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.redirectUri,
    );
    const state = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.authState,
    );

    if (verifier.length === 0 || clientId.length === 0 || redirectUri.length === 0) {
      return undefined;
    }

    return {
      verifier,
      clientId,
      redirectUri,
      ...(state.length === 0 ? null : { state }),
    };
  },
  setPkceState: (state) => {
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.pkceVerifier,
      state.verifier,
    );
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.clientId,
      state.clientId,
    );
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.redirectUri,
      state.redirectUri,
    );
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.authState,
      state.state ?? "",
    );
  },
  getTokens: () => {
    const raw = options.localStorage.getItem(defaultStorageKeys.tokens);

    if (raw === null) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as BrowserRefreshableTokens;
    } catch {
      return undefined;
    }
  },
  setTokens: (tokens) => {
    options.localStorage.setItem(defaultStorageKeys.tokens, JSON.stringify(tokens));
  },
  clearTokens: () => {
    options.sessionStorage.removeItem(defaultStorageKeys.tokens);
    options.localStorage.removeItem(defaultStorageKeys.tokens);
  },
  clearCallbackParams: (url) => {
    options.history.replaceState({}, "", `${url.origin}${url.pathname}`);
  },
});
