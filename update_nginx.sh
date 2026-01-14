#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export REPO_ROOT="$repo_root"
domain="${DOMAIN:-localhost}"
frontend_port="${FRONTEND_PORT:-3000}"
config_port="${CONFIG_PORT:-8119}"
small_offset="${SMALL_API_OFFSET:-100}"

python3 - <<'PY'
import json
import os
from pathlib import Path
from urllib.parse import quote

repo_root_env = os.environ.get("REPO_ROOT")
if not repo_root_env:
    raise SystemExit("REPO_ROOT is not set.")
repo_root = Path(repo_root_env)
domain = os.environ.get("DOMAIN", "localhost")
frontend_port = int(os.environ.get("FRONTEND_PORT", "3000"))
config_port = int(os.environ.get("CONFIG_PORT", "8119"))
small_offset = int(os.environ.get("SMALL_API_OFFSET", "100"))

current_map = repo_root / "Web-Defect-Detection-System" / "configs" / "current" / "map.json"
template_map = repo_root / "Web-Defect-Detection-System" / "configs" / "template" / "map.json"
map_path = current_map if current_map.exists() else template_map
if not map_path.exists():
    raise SystemExit("map.json not found in configs/current or configs/template.")

payload = json.loads(map_path.read_text(encoding="utf-8"))
if isinstance(payload, list):
    lines = payload
    views = {}
else:
    views = payload.get("views") or {}
    if "lines" in payload:
        lines = payload.get("lines") or []
    elif "items" in payload:
        lines = payload.get("items") or []
    elif "data" in payload:
        lines = payload.get("data") or []
    else:
        lines = []

def resolve_view_offset(view_key, view_config, index):
    if view_config and view_config.get("port_offset") is not None:
        return int(view_config["port_offset"])
    if view_key in ("2D", "default"):
        return 0
    if view_key == "small":
        return small_offset
    return small_offset * (index + 1)

def resolve_view_suffix(view_key):
    if view_key in ("2D", "default"):
        return "api"
    if view_key == "small":
        return "small--api"
    return f"{view_key}--api"

view_entries = []
if isinstance(views, dict) and views:
    for key, config in views.items():
        view_entries.append((key, config))
else:
    view_entries.append(("2D", {}))

locations = []
first_port = None
for line in lines:
    name = str(line.get("name") or "")
    key = str(line.get("key") or name)
    if not key.strip():
        continue
    port = int(line.get("port") or 0)
    if not port:
        continue
    if first_port is None:
        first_port = port
    escaped = quote(key)
    for idx, (view_key, view_config) in enumerate(view_entries):
        suffix = resolve_view_suffix(view_key)
        offset = resolve_view_offset(view_key, view_config or {}, idx)
        view_port = port + offset
        locations.append(
            f"""  location /{suffix}/{escaped}/ {{
    rewrite ^/{suffix}/{escaped}/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:{view_port};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }}"""
        )

if first_port is None:
    first_port = 8120

server_block = f"""
server {{
  listen 80;
  server_name {domain};

  location /config/ {{
    if ($request_method = OPTIONS) {{
      add_header Access-Control-Allow-Origin "https://tauri.localhost" always;
      add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
      add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
      add_header Access-Control-Max-Age 86400 always;
      return 204;
    }}
    add_header Access-Control-Allow-Origin "https://tauri.localhost" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Max-Age 86400 always;
    proxy_pass http://127.0.0.1:{config_port};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }}

  location = /api/health {{
    proxy_pass http://127.0.0.1:{first_port};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }}

{os.linesep.join(locations)}

  location / {{
    proxy_pass http://127.0.0.1:{frontend_port};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }}
}}
""".strip()

full_config = f"""
worker_processes  1;

events {{
  worker_connections  1024;
}}

http {{
  include       mime.types;
  default_type  application/octet-stream;

  sendfile        on;
  keepalive_timeout  65;

{server_block}
}}
""".lstrip()

output_path = map_path.parent / "nginx.conf"
output_path.write_text(full_config, encoding="utf-8")
print(f"Generated nginx config: {output_path}")

windows_target = repo_root / "plugins" / "platforms" / "windows" / "nginx" / "conf" / "nginx.conf"
windows_target.parent.mkdir(parents=True, exist_ok=True)
windows_target.write_text(full_config, encoding="utf-8")
print(f"Copied nginx config to: {windows_target}")
PY

DOMAIN="$domain" FRONTEND_PORT="$frontend_port" CONFIG_PORT="$config_port" SMALL_API_OFFSET="$small_offset" \
  REPO_ROOT="$repo_root" bash "$repo_root/apply_nginx.sh"
