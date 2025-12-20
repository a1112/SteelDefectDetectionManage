#!/usr/bin/env bash
set -euo pipefail

echo "[pm2]"
pm2 list

echo "[nginx]"
sudo systemctl status nginx --no-pager
