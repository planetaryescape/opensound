import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import { SpotifyBrowser } from "./index";

const makeStorage = (): Storage => {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.get(key) ?? null;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
};

interface RequestCapture {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: string;
}

const makeTestHttpClient = (
  handler: (request: HttpClientRequest.HttpClientRequest) => Response,
): {
  readonly layer: Layer.Layer<HttpClient.HttpClient>;
  readonly requests: Array<RequestCapture>;
} => {
  const requests: Array<RequestCapture> = [];

  const layer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url, _signal) => {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === "string") {
          headers[key] = value;
        }
      }

      requests.push({
        url: url.toString(),
        method: request.method,
        headers,
        ...(request.body._tag === "Uint8Array"
          ? { body: new TextDecoder().decode(request.body.body) }
          : null),
      });

      const response = handler(request);
      return Effect.succeed(HttpClientResponse.fromWeb(request, response));
    }),
  );

  return { layer, requests };
};

const makeBrowserLayer = (
  httpClientLayer: Layer.Layer<HttpClient.HttpClient>,
  storageTokens?: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly accessTokenExpiresAt: number;
  },
) => {
  const sessionStorage = makeStorage();
  const localStorage = makeStorage();

  if (storageTokens !== undefined) {
    localStorage.setItem("spotify-effect:tokens", JSON.stringify(storageTokens));
  }

  return SpotifyBrowser.layer({
    clientId: "client-id",
    httpClientLayer,
    session: {
      sessionStorage,
      localStorage,
      history: {
        length: 0,
        scrollRestoration: "auto",
        state: null,
        back: () => undefined,
        forward: () => undefined,
        go: () => undefined,
        pushState: () => undefined,
        replaceState: () => undefined,
      },
    },
  });
};

describe("SpotifyBrowser", () => {
  it("refreshes expired stored tokens before API requests", async () => {
    const { layer, requests } = makeTestHttpClient((request) => {
      const url = request.url.toString();

      if (url === "https://accounts.spotify.com/api/token") {
        return new Response(
          JSON.stringify({
            access_token: "fresh-token",
            token_type: "Bearer",
            expires_in: 1800,
            scope: "",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          albums: {
            href: "",
            items: [],
            limit: 0,
            next: null,
            offset: 0,
            previous: null,
            total: 0,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const program = Effect.gen(function* () {
      const spotify = yield* SpotifyBrowser;
      return yield* spotify.browse.getNewReleases();
    }).pipe(
      Effect.provide(
        makeBrowserLayer(layer, {
          accessToken: "stale-token",
          refreshToken: "refresh-token",
          accessTokenExpiresAt: Date.now() - 1_000,
        }),
      ),
    );

    const response = await Effect.runPromise(program);

    expect(response.items).toEqual([]);
    expect(requests[0]?.url).toBe("https://accounts.spotify.com/api/token");
    expect(requests[1]?.headers.authorization).toBe("Bearer fresh-token");
  });

  it("clears stored browser tokens when refresh token is invalid", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
    );

    const program = Effect.gen(function* () {
      const spotify = yield* SpotifyBrowser;

      return yield* spotify.auth.refreshToken("revoked-refresh-token").pipe(
        Effect.matchEffect({
          onFailure: () => Effect.sync(() => spotify.auth.getTokens()),
          onSuccess: () => Effect.sync(() => spotify.auth.getTokens()),
        }),
      );
    }).pipe(
      Effect.provide(
        makeBrowserLayer(layer, {
          accessToken: "stale-token",
          refreshToken: "revoked-refresh-token",
          accessTokenExpiresAt: Date.now() - 1_000,
        }),
      ),
    );

    const storedTokens = await Effect.runPromise(program);

    expect(storedTokens).toBeUndefined();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://accounts.spotify.com/api/token");
  });

  it("syncs manually set tokens into the live core session", async () => {
    const { layer, requests } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({
            albums: {
              href: "",
              items: [],
              limit: 0,
              next: null,
              offset: 0,
              previous: null,
              total: 0,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );

    const program = Effect.gen(function* () {
      const spotify = yield* SpotifyBrowser;
      spotify.auth.setTokens({
        accessToken: "manual-token",
        refreshToken: "manual-refresh",
        accessTokenExpiresAt: Date.now() + 60_000,
      });

      return yield* spotify.browse.getNewReleases();
    }).pipe(Effect.provide(makeBrowserLayer(layer)));

    const response = await Effect.runPromise(program);

    expect(response.items).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.authorization).toBe("Bearer manual-token");
  });
});
