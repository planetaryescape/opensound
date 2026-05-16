# @spotify-effect/browser

## 0.6.3

### Patch Changes

- Clear stored browser tokens when Spotify rejects a refresh token.
  - @spotify-effect/core@0.6.3

## 0.6.2

### Patch Changes

- Bump effect to 4.0.0-beta.65 and adapt service signatures
- Updated dependencies
  - @spotify-effect/core@0.6.2

## 0.6.1

### Patch Changes

- Fix: Replace workspace protocol with npm version in @spotify-effect/browser dependencies for npm install compatibility
- Updated dependencies
  - @spotify-effect/core@0.6.1

## 0.6.0

### Minor Changes

- dc1c59f: feat: release browser session sync and tracing improvements

  Classify auth and request errors more accurately, sync browser sessions with stored credentials, and add stream pagination SSE support with matching docs updates.

  This release also reflects the move of the Spotify Effect package family to the `planetaryescape` org.

### Patch Changes

- Updated dependencies [dc1c59f]
  - @spotify-effect/core@0.6.0

## 0.5.0

### Minor Changes

- 2478815: Rename the public package family to the scoped `@spotify-effect/*` namespace.
  - Rename the main SDK package from `spotify-effect` to `@spotify-effect/core`
  - Publish browser helpers from `@spotify-effect/browser`
  - Keep OpenTelemetry support in `@spotify-effect/otel-node`
  - Keep all published packages on the same semver version using a fixed changeset group

### Patch Changes

- Updated dependencies [2478815]
  - @spotify-effect/core@0.5.0
