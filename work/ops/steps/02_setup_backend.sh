#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
WEB_DIR="${WEB_DIR:-$REPO_ROOT/Web-Defect-Detection-System}"

if [[ ! -f "$WEB_DIR/requirements.txt" ]]; then
  echo "[error] requirements.txt not found in $WEB_DIR"
  exit 1
fi

if command -v python3.10 >/dev/null 2>&1; then
  PY_BIN="python3.10"
else
  PY_BIN="python3"
fi

VENV_DIR="$WEB_DIR/.venv"
if [[ ! -d "$VENV_DIR" ]]; then
  echo "[info] Creating venv: $VENV_DIR"
  "$PY_BIN" -m venv "$VENV_DIR"
fi

echo "[info] Installing backend dependencies"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$WEB_DIR/requirements.txt"
