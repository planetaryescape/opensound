# gbpm

A standalone Rust CLI for preparing audio mixes and still-image videos with FFmpeg. Extracted from [GBFM's mix processor](https://github.com/planetaryescape/gbfm/tree/d97271843db355732abd17e66e02f890daab2ec2/tools/process-mix).

The tool is independent of the Spotify SDK and the JavaScript workspace. It does not upload media, publish catalogue entries or include branding assets.

## Requirements and installation

FFmpeg must be installed and available in `PATH`. The installer also needs `curl`, `jq` and `tar`:

```sh
curl -fsSL https://raw.githubusercontent.com/planetaryescape/opensound/main/tools/gbpm/install.sh | bash
```

Binary releases use `gbpm-v<version>` tags, independently of Spotify SDK releases. The installer selects the newest stable gbpm release, not the repository's latest SDK release. Set `GBPM_VERSION=0.1.0` to select a version and `INSTALL_DIR` to override `~/.local/bin`.

Before the first OpenSound binary release, build from source:

```sh
cargo build --locked --release --manifest-path tools/gbpm/Cargo.toml
./tools/gbpm/target/release/gbpm --version
```

## Run a job

```sh
gbpm --job path/to/job.json
gbpm path/to/job.json
```

Start with `examples/job.json`. All relative paths are resolved against the job file's directory. Successful runs print only the output path to stdout; failures go to stderr and return a nonzero exit code.

| Field | Required | Purpose |
| --- | --- | --- |
| `audioPath` | Yes | Original audio |
| `imagePath` | Yes | Cover image |
| `title` | Yes | Default output filename when `outputPath` is omitted |
| `description` | Yes | Tracklist for MP3 metadata; blank lines and lines beginning with `#` are excluded |
| `outputFormat` | Yes | `mp3` or `mp4` |
| `outputPath` | No | Defaults to `<safe_title>.<format>` beside the job file |
| `introPath` | No | Audio overlaid at the start, not prepended; omitted means no overlay |
| `artist` | No | MP3 artist tag |
| `album` | No | MP3 album tag; no branded default |
| `genre` | No | MP3 genre tag; no default |

MP3 output uses 320 kbps MP3 audio, attached cover art, ID3v2.3 tags and tracklist metadata. MP4 output uses H.264 video, AAC audio and a padded 1920x1080 still image. Intro overlays retain the original audio duration.

## Existing GBFM jobs

The binary name, positional/`--job` arguments and existing JSON fields remain supported. Unlike the old GBFM build, this tool has no embedded intro, default album or default genre. Supply `introPath`, `album` and `genre` explicitly to retain a branded preset. Keep the actual intro, covers and job files in the consuming project.

## Development and releases

```sh
cargo fmt --manifest-path tools/gbpm/Cargo.toml --check
cargo test --locked --manifest-path tools/gbpm/Cargo.toml
```

Integration tests require FFmpeg and ffprobe. They generate disposable media and exercise MP3/MP4 output with and without an intro. The implementation still buffers input/output files in memory and processes one job per invocation.

The dedicated `gbpm` workflow builds only for relevant tool changes, explicit manual runs, or `gbpm-v*` tags. SDK changes and GBFM pushes do not trigger it. Publishing requires an explicit gbpm version tag matching `Cargo.toml`; it does not run npm publishing or application deployment.
