#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_URL="${REPO_URL:-https://github.com/a1112/SteelDefectDetectionManage}"
REPO_DIR="${REPO_DIR:-$PROJECT_ROOT/SteelDefectDetectionManage}"

sudo apt update
sudo apt install -y git

sudo mkdir -p "$PROJECT_ROOT"
cd "$PROJECT_ROOT"

if [[ -d "$REPO_DIR/.git" ]]; then
  echo "[info] Repo already exists: $REPO_DIR"
else
  git clone --recurse-submodules "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git submodule update --init --recursive

echo "[ok] Repo ready at: $REPO_DIR"
