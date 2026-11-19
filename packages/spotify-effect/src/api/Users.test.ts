import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { describe, expect, it } from "vitest";
import { currentUserProfileFixture } from "../fixtures/currentUserProfileFixture";
import { makeSpotifyLayer } from "../makeSpotifyLayer";
import type { PrivateUser } from "../model/SpotifyObjects";
import { Users } from "../services/Users";
import { makeTestHttpClient } from "../test/TestHttpClient";

const currentProfile = {
  display_name: null,
  external_urls: { spotify: "https://open.spotify.com/user/listener" },
  href: "https://api.spotify.com/v1/users/listener",
  id: "listener",
  images: [{ url: "https://i.scdn.co/image/profile", height: null, width: null }],
  type: "user",
  uri: "spotify:user:listener",
} satisfies PrivateUser;

const getProfile = async (body: unknown, userId?: string) => {
  const client = makeTestHttpClient(
    () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  const runtime = ManagedRuntime.make(
    makeSpotifyLayer({ httpClientLayer: client.layer }, { accessToken: "test-token" }),
  );

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const users = yield* Users;
        if (userId !== undefined) {
          return yield* users.getUser(userId);
        }
        return yield* users.getCurrentUserProfile();
      }),
    );
    return { result, requests: client.requests };
  } finally {
    await runtime.dispose();
  }
};

describe("user profile wire contracts", () => {
  it("decodes /me without any deprecated profile fields", async () => {
    const { result, requests } = await getProfile(currentProfile);

    expect(result).toEqual(currentProfile);
    expect(result).not.toHaveProperty("followers");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me");
  });

  it("preserves account_id for current-user account linking", async () => {
    const profile = { ...currentUserProfileFixture, account_id: "aB3dE5fG7h" };
    const { result } = await getProfile(profile);

    expect(result).toEqual(profile);
  });

  it("continues decoding legacy current-user profiles with deprecated fields", async () => {
    const { result } = await getProfile(currentUserProfileFixture);

    expect(result).toEqual(currentUserProfileFixture);
  });

  it("decodes public profiles without deprecated followers", async () => {
    const { result, requests } = await getProfile(currentProfile, currentProfile.id);

    expect(result).toEqual(currentProfile);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/users/listener");
  });

  it.each([
    ["followers", { href: null, total: "twelve" }],
    ["account_id", 42],
  ])("rejects malformed %s when present", async (field, value) => {
    await expect(
      getProfile({ ...currentUserProfileFixture, [field]: value }),
    ).rejects.toMatchObject({
      _tag: "SpotifyParseError",
      method: "GET",
      url: "https://api.spotify.com/v1/me",
    });
  });
});
