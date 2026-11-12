#!/usr/bin/env bash
set -euo pipefail

REPO="planetaryescape/opensound"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

detect_target() {
  local os arch
  os=$(uname -s)
  arch=$(uname -m)
  case "$os" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) echo "error: unsupported OS: $os" >&2; return 1 ;;
  esac
  case "$arch" in
    x86_64|amd64) arch=x86_64 ;;
    aarch64|arm64) arch=aarch64 ;;
    *) echo "error: unsupported architecture: $arch" >&2; return 1 ;;
  esac
  case "$os-$arch" in
    linux-x86_64|linux-aarch64|darwin-aarch64) echo "gbpm-$os-$arch" ;;
    *) echo "error: no prebuilt binary for $os-$arch; build from source" >&2; return 1 ;;
  esac
}

get_latest_url() {
  local target="$1" api="${2:-https://api.github.com}" page=1 releases url count
  while true; do
    releases=$(curl -fsSL "$api/repos/$REPO/releases?per_page=100&page=$page") || return 1
    count=$(jq -er 'if type == "array" then length else error("invalid release response") end' <<< "$releases") || return 1
    url=$(jq -r --arg asset "$target.tar.gz" '
      first(.[]
        | select(.draft == false and .prerelease == false)
        | select(.tag_name | startswith("gbpm-v"))
        | .assets[]
        | select(.name == $asset)
        | .browser_download_url) // empty
    ' <<< "$releases") || return 1
    if [ -n "$url" ]; then
      echo "$url"
      return
    fi
    if [ "$count" = 0 ]; then
      echo "error: no stable gbpm release found for $target" >&2
      return 1
    fi
    page=$((page + 1))
  done
}

main() {
  local target url version
  command -v jq > /dev/null || { echo "error: jq is required by the installer" >&2; return 1; }
  target=$(detect_target)
  if [ -n "${GBPM_VERSION:-}" ]; then
    version="${GBPM_VERSION#v}"
    [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]] || {
      echo "error: GBPM_VERSION must be a version such as 0.1.0" >&2
      return 1
    }
    url="https://github.com/$REPO/releases/download/gbpm-v$version/$target.tar.gz"
  else
    url=$(get_latest_url "$target")
  fi
  TMP_DIR=$(mktemp -d)
  trap 'rm -rf "$TMP_DIR"' EXIT
  curl -fsSL "$url" -o "$TMP_DIR/release.tar.gz"
  tar -xzf "$TMP_DIR/release.tar.gz" -C "$TMP_DIR"
  test -f "$TMP_DIR/gbpm"
  mkdir -p "$INSTALL_DIR"
  install -m 755 "$TMP_DIR/gbpm" "$INSTALL_DIR/gbpm"
  echo "installed gbpm to $INSTALL_DIR/gbpm"
}

if [[ "${BASH_SOURCE[0]:-}" == "$0" || -z "${BASH_SOURCE[0]:-}" ]]; then
  main
fi
