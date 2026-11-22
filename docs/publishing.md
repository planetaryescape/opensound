# SDK publishing

JSR is the release registry. Bun remains the package manager, script runner and application runtime. Website deployment remains owned by the existing SST infrastructure and is separate from SDK publication.

| Workspace package           | JSR entry point                        |
| --------------------------- | -------------------------------------- |
| `@spotify-effect/core`      | `@planetaryescape/opensound`           |
| `@spotify-effect/browser`   | `@planetaryescape/opensound/browser`   |
| `@spotify-effect/otel-node` | `@planetaryescape/opensound/otel-node` |

The workspace names are internal development identities. Existing npm releases remain available, but this pipeline no longer publishes to npm.

## Build and validate

```sh
bun install --frozen-lockfile
bun run ci
bun run release:check
```

The existing TypeScript build produces ESM and declarations. `scripts/publish-jsr.ts` prepares one allowlisted package in ignored `.jsr/package/`, attaches the generated declarations using `@ts-self-types`, and rewrites SDK cross-package imports to sibling entry points in generated output only. External imports become explicit registry references. The script installs the staged dependencies with Bun and lifecycle scripts disabled, then invokes the JSR publishing CLI. It does not change source APIs, bundle Effect, add a runtime, or use `--allow-slow-types`. This preserves Bun-compatible declarations without refactoring Effect services to satisfy JSR's source inference limits.

The checked root `jsr.json` version must match all three SDK workspace `package.json` versions. Update them together when releasing a new version. Local validation performs publish dry runs only. Actual publication is restricted to the main-branch GitHub workflow.

## One-time JSR setup

Create `@planetaryescape/opensound` in the existing scope and link it to the GitHub repository `planetaryescape/opensound`. Keep the scope's existing member-only publishing policy. GitHub Actions uses `id-token: write`; no npm token or saved JSR publishing token is required.

The release workflow verifies the workspace and publishes all three entry points atomically as one package version. Already-published versions are skipped by the JSR CLI. Inspect failed publication before retrying; do not bump versions merely to retry.

## Bun consumers

Add the repository-local registry mapping:

```ini
@jsr:registry=https://npm.jsr.io
```

Use exact JSR compatibility aliases in `package.json`:

```json
{
  "dependencies": {
    "@planetaryescape/opensound": "npm:@jsr/planetaryescape__opensound@0.7.1"
  }
}
```

Then run `bun install` and import from those names. These packages are served by JSR, not the npm registry, despite the `npm:` alias syntax used by Bun's package manager.

Import browser helpers from `@planetaryescape/opensound/browser` and optional Node telemetry from `@planetaryescape/opensound/otel-node`. Preserve a single Effect peer and verify authentication, profile decoding and playback behavior before shipping consumer changes. Do not remove consumer patches unless the JSR version contains their fixes.

Use `0.7.1` or newer. The initial `0.7.0` artifact used `.mjs`/`.d.mts` filenames; JSR's npm compatibility output rewrote sibling declaration imports to `.js`, which broke browser-service type resolution. The corrected artifact uses ESM `.js` files with a `type: module` package and matching `.d.ts` declarations.

References: [JSR publishing](https://jsr.io/docs/publishing-packages), [Bun-compatible installation](https://jsr.io/docs/npm-compatibility).
