#!/usr/bin/env sh
set -eu

ARCHIVE="/tmp/clash-linux-amd64-latest.gz"
CONFIG_SRC="/tmp/1755607623989.yml"
INSTALL_BIN="/usr/local/bin/clash"
CONFIG_DIR="/etc/clash"
CONFIG_FILE="$CONFIG_DIR/config.yaml"
WORK_DIR="/var/lib/clash"
SYSTEMD_UNIT="/etc/systemd/system/clash.service"
RUN_USER="root"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root." >&2
  exit 1
fi

if [ ! -f "$ARCHIVE" ]; then
  echo "Missing $ARCHIVE. Upload clash-linux-amd64-latest.gz to /tmp first." >&2
  exit 1
fi

if [ ! -f "$CONFIG_SRC" ]; then
  echo "Missing $CONFIG_SRC. Upload 1755607623989.yml to /tmp first." >&2
  exit 1
fi

gunzip -f "$ARCHIVE"
if [ ! -f "/tmp/clash-linux-amd64" ]; then
  echo "Decompress failed: /tmp/clash-linux-amd64 not found." >&2
  exit 1
fi

chmod +x /tmp/clash-linux-amd64
mv /tmp/clash-linux-amd64 "$INSTALL_BIN"

mkdir -p "$CONFIG_DIR" "$WORK_DIR"
cp "$CONFIG_SRC" "$CONFIG_FILE"

cat > "$SYSTEMD_UNIT" <<EOF
[Unit]
Description=Clash Service
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$WORK_DIR
ExecStart=$INSTALL_BIN -f $CONFIG_FILE -d $WORK_DIR
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

if command -v systemctl >/dev/null 2>&1; then
  systemctl daemon-reload
  systemctl enable --now clash.service
  systemctl status clash.service --no-pager || true
else
  echo "systemctl not found. Run manually:"
  echo "  $INSTALL_BIN -f $CONFIG_FILE -d $WORK_DIR"
fi
