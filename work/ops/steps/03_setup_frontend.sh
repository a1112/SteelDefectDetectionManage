#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
UI_DIR="${UI_DIR:-$REPO_ROOT/Figmaaidefectdetectionsystem}"

if [[ ! -f "$UI_DIR/package.json" ]]; then
  echo "[error] package.json not found in $UI_DIR"
  exit 1
fi

echo "[info] Installing frontend dependencies"
cd "$UI_DIR"
npm install
