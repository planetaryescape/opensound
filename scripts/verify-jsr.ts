import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Schema } from "effect";

const { version } = Schema.decodeUnknownSync(Schema.Struct({ version: Schema.NonEmptyString }))(
  await Bun.file(join(import.meta.dir, "../jsr.json")).json(),
);
const cache = join(homedir(), ".cache", "opensound");
await mkdir(cache, { recursive: true, mode: 0o700 });
const directory = await mkdtemp(join(cache, "jsr-consumer-"));
try {
  await Bun.write(join(directory, ".npmrc"), "@jsr:registry=https://npm.jsr.io\n");
  await Bun.write(
    join(directory, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        "@planetaryescape/opensound": `npm:@jsr/planetaryescape__opensound@${version}`,
        effect: "4.0.6",
        typescript: "6.0.3",
      },
    }),
  );
  await Bun.write(
    join(directory, "consumer.ts"),
    `import { Effect } from "effect";
import { Tracks, type Track, type PrivateUser, type SpotifyRequestError } from "@planetaryescape/opensound";
import { SpotifyBrowser } from "@planetaryescape/opensound/browser";
import { makeNodeTelemetryLayer } from "@planetaryescape/opensound/otel-node";

const profile: Effect.Effect<PrivateUser, SpotifyRequestError, SpotifyBrowser> = Effect.gen(function* () {
  const spotify = yield* SpotifyBrowser;
  return yield* spotify.users.getCurrentUserProfile();
});
const track: Effect.Effect<Track, SpotifyRequestError, Tracks> = Effect.gen(function* () {
  const tracks = yield* Tracks;
  return yield* tracks.getTrack("fixture");
});
if (!Effect.isEffect(profile) || !Effect.isEffect(track) || typeof makeNodeTelemetryLayer !== "function") {
  throw new Error("Published entry points are invalid");
}
console.log("Published JSR entry points load in Bun with typed Effect services.");
`,
  );
  for (const command of [
    ["bun", "install", "--ignore-scripts"],
    [
      "bun",
      "x",
      "--no-install",
      "tsc",
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--target",
      "es2022",
      "consumer.ts",
    ],
    ["bun", "run", "consumer.ts"],
  ]) {
    const child = Bun.spawn(command, {
      cwd: directory,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await child.exited) !== 0) throw new Error("Published JSR consumer verification failed");
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
