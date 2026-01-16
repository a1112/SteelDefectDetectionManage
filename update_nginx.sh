#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
domain="${DOMAIN:-localhost}"
frontend_port="${FRONTEND_PORT:-3000}"
config_port="${CONFIG_PORT:-8119}"
view_offset_step="${VIEW_API_OFFSET:-${SMALL_API_OFFSET:-100}}"

python3 "$repo_root/work/ops/nginx/apply_net_table_nginx.py" \
  --domain "$domain" \
  --frontend-port "$frontend_port" \
  --config-port "$config_port" \
  --view-offset-step "$view_offset_step"

bash "$repo_root/apply_nginx.sh"
