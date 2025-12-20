#!/usr/bin/env bash
set -euo pipefail

PM2_USER="${PM2_USER:-$(id -un)}"
PM2_HOME="${PM2_HOME:-$HOME/.pm2}"

if [[ $EUID -ne 0 ]]; then
  echo "[error] This script must run as root."
  exit 1
fi

pm2 startup systemd -u "$PM2_USER" --hp "$PM2_HOME"
pm2 save

echo "[ok] PM2 startup configured for user: $PM2_USER"
