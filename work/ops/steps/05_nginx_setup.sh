#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/project}"
REPO_ROOT="${REPO_ROOT:-$PROJECT_ROOT/SteelDefectDetectionManage}"
CERT_DIR="${CERT_DIR:-$REPO_ROOT/certs/bkvision.online}"
DOMAIN="${DOMAIN:-www.bkvision.online}"

TEMPLATE="$REPO_ROOT/work/ops/nginx/bkvision.online.conf"
SITE_NAME="${NGINX_SITE_NAME:-bkvision.online.conf}"
SITE_PATH="/etc/nginx/sites-available/${SITE_NAME}"
ENABLED_PATH="/etc/nginx/sites-enabled/${SITE_NAME}"

if [[ $EUID -ne 0 ]]; then
  echo "[error] This script must run as root."
  exit 1
fi

if [[ ! -f "$TEMPLATE" ]]; then
  echo "[error] Missing template: $TEMPLATE"
  exit 1
fi

if [[ ! -d "$CERT_DIR" ]]; then
  echo "[error] Missing cert directory: $CERT_DIR"
  exit 1
fi

sed \
  -e "s|__DOMAIN__|$DOMAIN|g" \
  -e "s|__CERT_DIR__|$CERT_DIR|g" \
  "$TEMPLATE" > "$SITE_PATH"

ln -sf "$SITE_PATH" "$ENABLED_PATH"

nginx -t
systemctl reload nginx

echo "[ok] Nginx config installed: $SITE_PATH"
