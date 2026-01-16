#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote


def find_repo_root(start: Path) -> Path:
    for parent in [start, *start.parents]:
        if (parent / "Web-Defect-Detection-System").exists():
            return parent
    raise SystemExit("Repo root not found. Expected Web-Defect-Detection-System directory.")


def load_map_payload(repo_root: Path) -> tuple[list[dict], dict]:
    current_path = repo_root / "Web-Defect-Detection-System" / "configs" / "current" / "map.json"
    template_path = repo_root / "Web-Defect-Detection-System" / "configs" / "template" / "map.json"
    map_path = current_path if current_path.exists() else template_path
    if not map_path.exists():
        raise SystemExit("map.json not found in configs/current or configs/template.")

    payload = json.loads(map_path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload, {}

    views = payload.get("views") or {}
    for key in ("lines", "items", "data"):
        if key in payload:
            return payload.get(key) or [], views
    return [], views


def resolve_view_offset(view_key: str, view_config: dict, index: int, step: int) -> int:
    port_offset = view_config.get("port_offset") if view_config else None
    if port_offset is not None:
        return int(port_offset)
    if view_key in ("2D", "default"):
        return 0
    return step * (index + 1)


def resolve_view_suffix(view_key: str) -> str:
    if view_key in ("2D", "default"):
        return "api"
    return f"{view_key}--api"


def build_nginx_config(
    lines: list[dict],
    views: dict,
    domain: str,
    frontend_port: int,
    config_port: int,
    view_offset_step: int,
) -> str:
    view_entries: list[tuple[str, dict]] = []
    if isinstance(views, dict) and views:
        for key, value in views.items():
            view_entries.append((key, value or {}))
    else:
        view_entries.append(("2D", {}))

    locations: list[str] = []
    first_port: int | None = None
    for line in lines:
        name = str(line.get("name") or "")
        key = str(line.get("key") or name)
        if not key.strip():
            continue
        try:
            port = int(line.get("port") or 0)
        except (TypeError, ValueError):
            port = 0
        if not port:
            continue
        if first_port is None:
            first_port = port

        escaped = quote(key)
        for index, (view_key, view_config) in enumerate(view_entries):
            suffix = resolve_view_suffix(view_key)
            offset = resolve_view_offset(view_key, view_config or {}, index, view_offset_step)
            view_port = port + offset
            locations.append(
                "\n".join(
                    [
                        f"  location /{suffix}/{escaped}/ {{",
                        f"    rewrite ^/{suffix}/{escaped}/(.*)$ /api/$1 break;",
                        f"    proxy_pass http://127.0.0.1:{view_port};",
                        "    proxy_set_header Host $host;",
                        "    proxy_set_header X-Real-IP $remote_addr;",
                        "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
                        "    proxy_set_header X-Forwarded-Proto $scheme;",
                        "  }",
                    ]
                )
            )

    if first_port is None:
        first_port = 8120

    server_block = "\n".join(
        [
            "server {",
            "  listen 80;",
            f"  server_name {domain};",
            "",
            "  location /config/ {",
            f"    proxy_pass http://127.0.0.1:{config_port};",
            "    proxy_http_version 1.1;",
            "    proxy_set_header Upgrade $http_upgrade;",
            "    proxy_set_header Connection $connection_upgrade;",
            "    proxy_set_header Host $host;",
            "    proxy_set_header X-Real-IP $remote_addr;",
            "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "    proxy_set_header X-Forwarded-Proto $scheme;",
            "    proxy_read_timeout 3600;",
            "  }",
            "",
            "  location = /api/health {",
            f"    proxy_pass http://127.0.0.1:{first_port};",
            "    proxy_set_header Host $host;",
            "    proxy_set_header X-Real-IP $remote_addr;",
            "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "    proxy_set_header X-Forwarded-Proto $scheme;",
            "  }",
            "",
            "\n".join(locations),
            "",
            "  location / {",
            f"    proxy_pass http://127.0.0.1:{frontend_port};",
            "    proxy_http_version 1.1;",
            "    proxy_set_header Upgrade $http_upgrade;",
            "    proxy_set_header Connection $connection_upgrade;",
            "    proxy_set_header Host $host;",
            "    proxy_set_header X-Real-IP $remote_addr;",
            "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "    proxy_set_header X-Forwarded-Proto $scheme;",
            "    proxy_read_timeout 3600;",
            "  }",
            "}",
        ]
    )

    return "\n".join(
        [
            "worker_processes  1;",
            "",
            "events {",
            "  worker_connections  1024;",
            "}",
            "",
            "http {",
            "  include       mime.types;",
            "  default_type  application/octet-stream;",
            "",
            "  sendfile        on;",
            "  keepalive_timeout  65;",
            "",
            "  map $http_upgrade $connection_upgrade {",
            "    default upgrade;",
            "    '' close;",
            "  }",
            "",
            server_block,
            "}",
        ]
    )


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def apply_nginx_config(nginx_root: Path, nginx_bin: Path, content: str) -> None:
    conf_path = nginx_root / "conf" / "nginx.conf"
    backup = Path(str(conf_path) + ".bak")
    if conf_path.exists():
        backup.write_text(conf_path.read_text(encoding="utf-8"), encoding="utf-8")
    write_text(conf_path, content)

    logs_dir = nginx_root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    test_cmd = [str(nginx_bin), "-p", str(nginx_root), "-c", "conf/nginx.conf", "-t"]
    reload_cmd = [str(nginx_bin), "-p", str(nginx_root), "-c", "conf/nginx.conf", "-s", "reload"]
    start_cmd = [str(nginx_bin), "-p", str(nginx_root), "-c", "conf/nginx.conf"]

    subprocess.run(test_cmd, check=False)
    result = subprocess.run(reload_cmd, check=False)
    if result.returncode != 0:
        subprocess.run(start_cmd, check=False)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate nginx config from map.json")
    parser.add_argument("--domain", default="localhost")
    parser.add_argument("--frontend-port", type=int, default=3000)
    parser.add_argument("--config-port", type=int, default=8119)
    parser.add_argument("--view-offset-step", type=int, default=100)
    parser.add_argument("--nginx-bin", default="")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    repo_root = find_repo_root(Path(__file__).resolve())
    lines, views = load_map_payload(repo_root)
    config = build_nginx_config(
        lines=lines,
        views=views,
        domain=args.domain,
        frontend_port=args.frontend_port,
        config_port=args.config_port,
        view_offset_step=args.view_offset_step,
    )

    map_dir = (repo_root / "Web-Defect-Detection-System" / "configs" / "current")
    if not map_dir.exists():
        map_dir = repo_root / "Web-Defect-Detection-System" / "configs" / "template"

    output_path = map_dir / "nginx.conf"
    write_text(output_path, config)
    print(f"Generated nginx config: {output_path}")

    windows_target = repo_root / "plugins" / "platforms" / "windows" / "nginx" / "conf" / "nginx.conf"
    write_text(windows_target, config)
    print(f"Copied nginx config to: {windows_target}")

    if args.apply:
        nginx_bin = Path(args.nginx_bin) if args.nginx_bin else None
        if nginx_bin is None or not nginx_bin.exists():
            found = shutil.which("nginx")
            if not found:
                print("nginx not found in PATH; skipping apply.")
                return 0
            nginx_bin = Path(found)
        nginx_root = nginx_bin.resolve().parent
        if not nginx_root.exists():
            print("nginx root not found; skipping apply.")
            return 0
        apply_nginx_config(nginx_root, nginx_bin, config)
        print(f"Applied nginx config to: {nginx_root / 'conf' / 'nginx.conf'}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
