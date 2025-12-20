#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
WEB_DIR="${WEB_DIR:-$REPO_ROOT/Web-Defect-Detection-System}"
UI_DIR="${UI_DIR:-$REPO_ROOT/Figmaaidefectdetectionsystem}"

if [[ ! -d "$WEB_DIR/.venv" ]]; then
  echo "[error] Missing backend venv. Run 02_setup_backend.sh first."
  exit 1
fi

PY_BIN="$WEB_DIR/.venv/bin/python"
if [[ ! -x "$PY_BIN" ]]; then
  echo "[error] Python venv interpreter not found: $PY_BIN"
  exit 1
fi

start_or_restart() {
  local name="$1"
  shift
  if pm2 describe "$name" >/dev/null 2>&1; then
    pm2 restart "$name"
  else
    pm2 start "$@"
  fi
}

start_or_restart "defect-api" \
  --name "defect-api" \
  --cwd "$WEB_DIR" \
  --interpreter "$PY_BIN" \
  "$WEB_DIR/run_debug_server_dev.py"

start_or_restart "defect-ui" \
  --name "defect-ui" \
  --cwd "$UI_DIR" \
  npm -- run dev -- --host 0.0.0.0 --port 3000

pm2 save
