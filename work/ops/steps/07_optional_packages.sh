#!/usr/bin/env bash
set -euo pipefail

# Optional packages (install only when needed)
# Note: Ubuntu 24.04 default MySQL is not 5.7. Use external repo if 5.7 is required.

sudo apt update
sudo apt install -y \
  mysql-server \
  redis-server \
  gitlab-runner

echo "[ok] Optional packages installed"
