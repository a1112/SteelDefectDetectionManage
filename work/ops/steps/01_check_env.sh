#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
WEB_DIR="${WEB_DIR:-$REPO_ROOT/Web-Defect-Detection-System}"
UI_DIR="${UI_DIR:-$REPO_ROOT/Figmaaidefectdetectionsystem}"

ensure_cmd() {
  local cmd="$1"
  local pkg="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[info] Installing missing command: $cmd"
    sudo apt update
    sudo apt install -y "$pkg"
  fi
}

require_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "[error] Missing directory: $dir"
    exit 1
  fi
}

ensure_cmd git git
ensure_cmd nginx nginx
ensure_cmd node nodejs
ensure_cmd npm npm

if command -v python3.10 >/dev/null 2>&1; then
  PY_BIN="python3.10"
else
  ensure_cmd python3 python3
  PY_BIN="python3"
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[info] Installing pm2"
  sudo npm install -g pm2
fi

if ! "$PY_BIN" -m pip -V >/dev/null 2>&1; then
  echo "[info] Installing python pip support"
  sudo apt install -y python3-pip
fi

require_dir "$WEB_DIR"
require_dir "$UI_DIR"

echo "[ok] git: $(git --version)"
echo "[ok] nginx: $(nginx -v 2>&1)"
echo "[ok] node: $(node -v)"
echo "[ok] npm: $(npm -v)"
echo "[ok] pm2: $(pm2 -v)"
echo "[ok] python: $($PY_BIN --version 2>&1)"
