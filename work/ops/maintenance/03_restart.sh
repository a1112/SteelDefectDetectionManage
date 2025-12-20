#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"

if [[ "$TARGET" == "all" ]]; then
  pm2 restart defect-api
  pm2 restart defect-ui
  sudo systemctl reload nginx
  exit 0
fi

if [[ "$TARGET" == "nginx" ]]; then
  sudo systemctl reload nginx
  exit 0
fi

pm2 restart "$TARGET"
