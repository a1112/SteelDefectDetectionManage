#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

nginx_root="${NGINX_ROOT:-}"
if [[ -z "$nginx_root" ]]; then
  if [[ -d /opt/homebrew/etc/nginx ]]; then
    nginx_root="/opt/homebrew/etc/nginx"
  elif [[ -d /usr/local/etc/nginx ]]; then
    nginx_root="/usr/local/etc/nginx"
  else
    echo "Nginx root not found. Set NGINX_ROOT or install nginx via Homebrew."
    exit 1
  fi
fi

nginx_bin="${NGINX_BIN:-}"
if [[ -z "$nginx_bin" ]]; then
  if [[ -x /opt/homebrew/opt/nginx/bin/nginx ]]; then
    nginx_bin="/opt/homebrew/opt/nginx/bin/nginx"
  elif [[ -x /usr/local/opt/nginx/bin/nginx ]]; then
    nginx_bin="/usr/local/opt/nginx/bin/nginx"
  else
    nginx_bin="$(command -v nginx || true)"
  fi
fi

if [[ -z "$nginx_bin" || ! -x "$nginx_bin" ]]; then
  echo "nginx binary not found. Set NGINX_BIN or install nginx via Homebrew."
  exit 1
fi

nginx_conf="${NGINX_CONF:-$nginx_root/nginx.conf}"
if [[ ! -f "$nginx_conf" ]]; then
  echo "nginx.conf not found at $nginx_conf. Run apply_nginx.sh first."
  exit 1
fi

if pgrep -x nginx >/dev/null 2>&1; then
  "$nginx_bin" -s reload -c "$nginx_conf"
else
  "$nginx_bin" -c "$nginx_conf"
fi
