#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

"$SCRIPT_DIR/smart-install.sh"

exec node "$PLUGIN_DIR/dist/index.js" "$@"
