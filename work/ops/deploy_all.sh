#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
export REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
export WEB_DIR="${WEB_DIR:-$REPO_ROOT/Web-Defect-Detection-System}"
export UI_DIR="${UI_DIR:-$REPO_ROOT/Figmaaidefectdetectionsystem}"
export CERT_DIR="${CERT_DIR:-$REPO_ROOT/certs/bkvision.online}"
export DOMAIN="${DOMAIN:-www.bkvision.online}"

bash "$SCRIPT_DIR/steps/01_check_env.sh"
bash "$SCRIPT_DIR/steps/02_setup_backend.sh"
bash "$SCRIPT_DIR/steps/03_setup_frontend.sh"
bash "$SCRIPT_DIR/steps/04_pm2_start.sh"

if [[ $EUID -ne 0 ]]; then
  echo "[warn] Skipping nginx + pm2 startup steps (need root)."
  echo "[hint] Run as root:"
  echo "  sudo bash $SCRIPT_DIR/steps/05_nginx_setup.sh"
  echo "  sudo bash $SCRIPT_DIR/steps/06_pm2_startup.sh"
else
  bash "$SCRIPT_DIR/steps/05_nginx_setup.sh"
  bash "$SCRIPT_DIR/steps/06_pm2_startup.sh"
fi
