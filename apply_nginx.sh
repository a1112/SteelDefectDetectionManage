#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
generated="$repo_root/Web-Defect-Detection-System/configs/current/nginx.conf"

if [[ ! -f "$generated" ]]; then
  echo "nginx.conf not found in configs/current. Run update_nginx.cmd first."
  exit 1
fi

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
backup="${nginx_conf}.bak"

cp "$nginx_conf" "$backup"
cat "$generated" > "$nginx_conf"
echo "Applied nginx config to: $nginx_conf (backup: $backup)"

"$nginx_bin" -t -c "$nginx_conf"
"$nginx_bin" -s reload -c "$nginx_conf" || "$nginx_bin" -c "$nginx_conf"
