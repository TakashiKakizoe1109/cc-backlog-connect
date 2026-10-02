#!/bin/bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER_FILE="$PLUGIN_DIR/.install-version"
CURRENT_VERSION="$(grep '"version"' "$PLUGIN_DIR/package.json" | head -1 | sed 's/.*: *"\(.*\)".*/\1/')"

need_install() {
  [ ! -d "$PLUGIN_DIR/node_modules" ] && return 0
  [ ! -f "$MARKER_FILE" ] && return 0
  [ "$(cat "$MARKER_FILE")" != "$CURRENT_VERSION" ] && return 0
  return 1
}

need_build() {
  [ ! -f "$PLUGIN_DIR/dist/index.js" ] && return 0
  # Rebuild if any src file is newer than dist/index.js
  if [ -n "$(find "$PLUGIN_DIR/src" -name '*.ts' -newer "$PLUGIN_DIR/dist/index.js" 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

install_needed=false
if need_install; then
  install_needed=true
fi

# Installation/version changes must rebuild even when a checkout preserves equal
# source/output timestamps. A marker represents a successful install AND build.
if "$install_needed" || need_build; then
  rm -f "$MARKER_FILE"
  cd "$PLUGIN_DIR"

  if "$install_needed"; then
    echo "[cc-backlog-connect] Installing dependencies..." >&2
    npm install --ignore-scripts 2>&1 | tail -1 >&2
  fi

  echo "[cc-backlog-connect] Building TypeScript..." >&2
  npx tsc 2>&1 | tail -5 >&2
  chmod +x "$PLUGIN_DIR/dist/index.js" 2>/dev/null || true
  printf '%s\n' "$CURRENT_VERSION" > "$MARKER_FILE"
  echo "[cc-backlog-connect] Build complete." >&2
fi
