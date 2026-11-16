# Spotify profile contract

## Source

The canonical source is the [Spotify OpenAPI schema](https://developer.spotify.com/reference/web-api/open-api-schema.yaml), as directed by [the repository's Spotify API guidance](../tooling/spotify-openapi-skill.md).

Profile definitions were checked on 2026-11-16 against OpenAPI 3.0.3, API version 1.0.0. The fetched YAML's SHA-256 was `2d888d731358ae8a97126ffd4117d257305943f06721734abe9af24962bf38c3`. Spotify serves this URL in place, so the version alone does not identify a snapshot.

Relevant definitions:

- `GET /me` returns `OnePrivateUser`, referencing `PrivateUserObject`.
- `GET /users/{user_id}` returns `OnePublicUser`, referencing `PublicUserObject`.
- `PrivateUserObject` includes optional string `account_id`, described as the immutable identifier to use for account linking instead of `id`.
- `PrivateUserObject` marks `country`, `email`, `explicit_content`, `followers`, and `product` deprecated. None is listed as required.
- `PublicUserObject.followers` is also deprecated and not required.
- `ImageObject.height` and `width` are required but nullable. Public display names are nullable; the private display-name description also permits null.

## Package alignment

`@spotify-effect/core@0.6.7` required private-profile `followers` in both its TypeScript model and Effect decoder. A successful HTTP 200 without that deprecated field therefore became `SpotifyParseError`, preventing consumers from reading the profile after OAuth. It also omitted `account_id` from the decoder, so that field was stripped from successful responses.

The package now accepts absent private-profile `followers` and exposes optional `account_id`. The other deprecated private fields and public-profile `followers` were already optional. Present fields still use the existing decoders, so omission is not treated as permission to accept malformed data or invent follower counts.

This is targeted profile alignment, not a claim of complete OpenAPI parity. The existing non-deprecated profile requirements, legacy `birthdate` support, nullable display names, endpoint paths, and authentication behavior are unchanged. No new account-linking policy is imposed on consumers.

The repository currently maintains `SpotifyObjects.ts` and `SpotifyObjectSchemas.ts` by hand. There is no checked-in OpenAPI snapshot or runnable generation script; the product plan's generated-contract architecture is not yet implemented. Update both files together and verify the composed `Users` service through its injected HTTP client.

## Release and verification

The Changeset requests a core patch release. `.changeset/config.json` fixes core, browser, and otel-node to one release group; the existing release workflow handles versioning, dependent updates, and publishing. Do not publish locally.

`packages/spotify-effect/src/api/Users.test.ts` covers omitted deprecated fields, preserved `account_id`, legacy profiles, public profiles, nullable names/image dimensions, and typed parse failures for malformed present fields. These are deterministic HTTP/service-seam regressions, not a live Spotify login or an end-to-end OAuth verification.
