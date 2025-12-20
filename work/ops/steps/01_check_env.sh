#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
WEB_DIR="${WEB_DIR:-$REPO_ROOT/Web-Defect-Detection-System}"
UI_DIR="${UI_DIR:-$REPO_ROOT/Figmaaidefectdetectionsystem}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[error] Missing command: $cmd"
    exit 1
  fi
}

require_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "[error] Missing directory: $dir"
    exit 1
  fi
}

require_cmd git
require_cmd nginx
require_cmd node
require_cmd npm
require_cmd pm2

if command -v python3.10 >/dev/null 2>&1; then
  PY_BIN="python3.10"
elif command -v python3 >/dev/null 2>&1; then
  PY_BIN="python3"
else
  echo "[error] Missing python3.10 or python3"
  exit 1
fi

require_dir "$WEB_DIR"
require_dir "$UI_DIR"

echo "[ok] git: $(git --version)"
echo "[ok] nginx: $(nginx -v 2>&1)"
echo "[ok] node: $(node -v)"
echo "[ok] npm: $(npm -v)"
echo "[ok] pm2: $(pm2 -v)"
echo "[ok] python: $($PY_BIN --version 2>&1)"
