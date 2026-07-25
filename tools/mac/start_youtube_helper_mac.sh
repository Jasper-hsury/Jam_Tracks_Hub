#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$SITE_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"
HELPER_URL="http://127.0.0.1:8765"
DENO_DIR="$SITE_DIR/.deno"

export DENO_INSTALL="$DENO_DIR"
export PATH="$DENO_INSTALL/bin:$PATH"

find_python() {
  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return
    fi
  done

  echo "python3"
}

helper_is_running() {
  "$PYTHON_BIN" - "$HELPER_URL/api/health" <<'PY' >/dev/null 2>&1
import json
import sys
import urllib.request

try:
    with urllib.request.urlopen(sys.argv[1], timeout=2) as response:
        data = json.loads(response.read().decode("utf-8"))
    raise SystemExit(0 if data.get("status") == "ok" else 1)
except Exception:
    raise SystemExit(1)
PY
}

ensure_js_runtime() {
  if command -v deno >/dev/null 2>&1; then
    return
  fi

  if [ -x "$DENO_INSTALL/bin/deno" ]; then
    return
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "Deno is required for current YouTube downloads, but curl is not available to install it."
    echo "Install Deno from https://deno.com/ or install Node.js, then run this helper again."
    return
  fi

  echo "Installing Deno for the local YouTube Helper..."
  curl -fsSL https://deno.land/install.sh | sh
}

needs_venv="yes"

if [ -x "$PYTHON_BIN" ]; then
  if "$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
    needs_venv="no"
  else
    mv "$VENV_DIR" "$VENV_DIR-python39-backup-$(date +%Y%m%d%H%M%S)"
  fi
fi

if [ "$needs_venv" = "yes" ]; then
  "$(find_python)" -m venv "$VENV_DIR"
fi

"$PYTHON_BIN" -m pip install -r "$SITE_DIR/api-server/requirements_api.txt"
ensure_js_runtime

if helper_is_running; then
  echo "the local YouTube Helper is already running at $HELPER_URL"
  echo "Return to the website and refresh the Key Finder page."
  exit 0
fi

echo "Starting the local YouTube Helper"
echo "URL: $HELPER_URL"
echo "Keep this terminal open while using YouTube link analysis."

exec "$PYTHON_BIN" -m uvicorn app:app \
  --host 127.0.0.1 \
  --port 8765 \
  --app-dir "$SITE_DIR/api-server"
