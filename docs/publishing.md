# SDK publishing

The SDK packages are published by `.github/workflows/publish.yml` after verification on `main`. Do not publish them locally. Website deployment remains owned by the existing SST infrastructure and is separate from npm publishing.

## npm trusted publisher setup

Configure a GitHub Actions trusted publisher in the npm settings for each package:

- `@spotify-effect/core`
- `@spotify-effect/browser`
- `@spotify-effect/otel-node`

Use these exact values:

| Setting                 | Value                |
| ----------------------- | -------------------- |
| Organization or user    | `planetaryescape`    |
| Repository              | `opensound`          |
| Workflow filename       | `publish.yml`        |
| Environment             | Leave empty          |
| Allow direct publishing | Enable `npm publish` |

The workflow uses a GitHub-hosted runner and requests `id-token: write`. Node 24 supplies the npm CLI; trusted publishing requires npm 11.5.1 or newer. The Changesets action receives no long-lived npm token. Each package declares the matching GitHub repository for npm's identity check and provenance.

Do not set `registry-url` on `setup-node` for this tokenless workflow. Its generated token-based npm configuration can prevent npm from exchanging the GitHub OIDC identity for publishing authorization.

New trusted publishers must complete their first successful publish within two days or be recreated. Configure all three before dispatching the workflow on `main`, since publishing can partially succeed.

After the workflow changes are merged and the npm settings are saved, run:

```sh
gh workflow run publish.yml --repo planetaryescape/opensound --ref main
```

The workflow first verifies the workspace, then publishes only package versions absent from npm. Do not bump versions simply to retry an unpublished release. Confirm all three registry versions and their provenance after the run; a green website deployment does not establish SDK publication.

Remove the unused GitHub `NPM_TOKEN` secret only after a successful trusted publish. A failed authentication check is not proof that the npm trusted publisher has been configured correctly.

Reference: <https://docs.npmjs.com/trusted-publishers/>.
