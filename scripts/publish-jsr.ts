import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Schema } from "effect";

const root = join(import.meta.dir, "..");
const metadata = Schema.Struct({
  name: Schema.NonEmptyString,
  version: Schema.String.check(Schema.isPattern(/^\d+\.\d+\.\d+$/)),
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  peerDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
const manifest = Schema.Struct({
  name: Schema.NonEmptyString,
  version: Schema.String,
  license: Schema.Literal("MIT"),
  exports: Schema.Record(Schema.String, Schema.String),
  publish: Schema.Struct({ include: Schema.Array(Schema.String) }),
});
const jsr = Schema.decodeUnknownSync(manifest)(await Bun.file(join(root, "jsr.json")).json());
const packages = await Promise.all(
  [
    { directory: "spotify-effect", entry: "index" },
    { directory: "browser", entry: "browser" },
    { directory: "otel-node", entry: "otel-node" },
  ].map(async ({ directory, entry }) => {
    const path = join(root, "packages", directory);
    const pkg = Schema.decodeUnknownSync(metadata)(
      await Bun.file(join(path, "package.json")).json(),
    );
    if (pkg.version !== jsr.version) throw new Error(`Version mismatch for ${pkg.name}`);
    return { directory, entry, path, pkg };
  }),
);
const publish = process.argv.includes("--publish");
if (
  publish &&
  (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main")
) {
  throw new Error("Publish only through the main-branch release workflow");
}
const dependencies = Object.fromEntries(
  packages
    .flatMap(({ pkg }) => Object.entries(pkg.dependencies ?? {}))
    .filter(([name]) => !packages.some(({ pkg }) => pkg.name === name)),
);
const peers = packages[0]?.pkg.peerDependencies ?? {};
const replaceDependencies = (text: string) => {
  for (const { pkg, entry } of packages) {
    text = text.replaceAll(`"${pkg.name}"`, `"./${entry}.mjs"`);
    text = text.replaceAll(`'${pkg.name}'`, `'./${entry}.mjs'`);
  }
  for (const [name, version] of Object.entries({ ...dependencies, ...peers })) {
    for (const quote of ['"', "'"]) {
      text = text.replaceAll(`${quote}${name}${quote}`, `${quote}npm:${name}@${version}${quote}`);
      text = text.replaceAll(`${quote}${name}/`, `${quote}npm:${name}@${version}/`);
    }
  }
  return text;
};
const destination = join(root, ".jsr", "package");
await mkdir(destination, { recursive: true });
for (const { entry, path } of packages) {
  const javascript = replaceDependencies(await Bun.file(join(path, "dist/index.mjs")).text());
  const declarations = replaceDependencies(await Bun.file(join(path, "dist/index.d.mts")).text());
  await Bun.write(
    join(destination, `${entry}.mjs`),
    `// @ts-self-types="./${entry}.d.mts"\n${javascript}`,
  );
  await Bun.write(join(destination, `${entry}.d.mts`), declarations);
}
await Bun.write(join(destination, "jsr.json"), JSON.stringify(jsr, null, 2));
await Bun.write(
  join(destination, "package.json"),
  JSON.stringify({
    name: jsr.name,
    version: jsr.version,
    type: "module",
    dependencies,
    peerDependencies: peers,
  }),
);
const install = Bun.spawn(["bun", "install", "--ignore-scripts"], {
  cwd: destination,
  stdin: "ignore",
  stdout: "inherit",
  stderr: "inherit",
});
if ((await install.exited) !== 0) throw new Error("Could not prepare release dependencies");
const child = Bun.spawn(
  [
    "bun",
    "x",
    "--no-install",
    "jsr",
    "publish",
    ...(publish ? [] : ["--dry-run"]),
    "--allow-dirty",
  ],
  { cwd: destination, stdin: "ignore", stdout: "inherit", stderr: "inherit" },
);
if ((await child.exited) !== 0) throw new Error(`JSR ${publish ? "publish" : "validation"} failed`);
