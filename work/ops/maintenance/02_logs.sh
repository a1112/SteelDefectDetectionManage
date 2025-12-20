#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-defect-api}"

if [[ "$TARGET" == "nginx" ]]; then
  sudo tail -n 200 /var/log/nginx/access.log
  sudo tail -n 200 /var/log/nginx/error.log
else
  pm2 logs "$TARGET"
fi
