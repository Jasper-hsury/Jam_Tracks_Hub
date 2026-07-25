#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SITE_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"

find_python() {
  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return
    fi
  done

  echo "python3"
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

echo "Starting Jam Tracks Hub website and Key Finder API"
echo "URL: http://127.0.0.1:8000"

exec "$PYTHON_BIN" -m uvicorn app:app \
  --host 127.0.0.1 \
  --port 8000 \
  --app-dir "$SITE_DIR/api-server"
