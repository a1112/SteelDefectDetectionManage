#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WINDOWS_DIR="$ROOT_DIR/Build/Windows"
MAC_DIR="$ROOT_DIR/Build/macOS"
FRONTEND_DIR="$ROOT_DIR/Figmaaidefectdetectionsystem"

cd "$ROOT_DIR"

ensure_dir() {
  mkdir -p "$1"
}

maybe_move_dir() {
  local src="$1"
  local dest="$2"
  if [[ -d "$src" && ! -d "$dest" ]]; then
    ensure_dir "$(dirname "$dest")"
    mv "$src" "$dest"
  fi
}

maybe_move_dir "$ROOT_DIR/ElectronBuild" "$WINDOWS_DIR/ElectronBuild"
maybe_move_dir "$ROOT_DIR/TauriBuild" "$WINDOWS_DIR/TauriBuild"

ensure_dir "$MAC_DIR"
ensure_dir "$MAC_DIR/ElectronBuild"
ensure_dir "$MAC_DIR/TauriBuild"

rsync -a --delete "$WINDOWS_DIR/ElectronBuild/" "$MAC_DIR/ElectronBuild/"
rsync -a --delete "$WINDOWS_DIR/TauriBuild/" "$MAC_DIR/TauriBuild/"

python3 - <<'PY'
import json
import os
from pathlib import Path

mac_conf = Path("Build/macOS/TauriBuild/src-tauri/tauri.conf.json")
data = json.loads(mac_conf.read_text(encoding="utf-8"))
data["build"]["distDir"] = "../../../../Figmaaidefectdetectionsystem/build"
data["build"]["beforeDevCommand"] = (
    "npm --prefix ../../../../Figmaaidefectdetectionsystem run dev -- --host 127.0.0.1 --port 5173"
)
bundle = data.get("tauri", {}).get("bundle", {})
targets_env = os.getenv("TAURI_MAC_TARGETS", "")
if targets_env:
    bundle["targets"] = [item.strip() for item in targets_env.split(",") if item.strip()]
else:
    bundle["targets"] = ["dmg"]
bundle.pop("windows", None)
mac_conf.write_text(json.dumps(data, indent=2), encoding="utf-8")
PY

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
else
  echo "nvm is not installed. Please install nvm or ensure node/npm are available."
  exit 1
fi

if [[ -n "${ELECTRON_MIRROR:-}" ]]; then
  export ELECTRON_MIRROR
fi

if ! command -v node >/dev/null 2>&1; then
  nvm install --lts
fi

pushd "$FRONTEND_DIR" >/dev/null
npm install
npm run build
popd >/dev/null

pushd "$MAC_DIR/ElectronBuild" >/dev/null
npm install
npm run dist -- --mac
popd >/dev/null

if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck disable=SC1091
  . "$HOME/.cargo/env"
fi

pushd "$MAC_DIR/TauriBuild" >/dev/null
npm install
set +e
npm run tauri:build
tauri_status=$?
set -e
popd >/dev/null

if [[ $tauri_status -ne 0 ]]; then
  echo "Tauri build failed, will attempt manual DMG creation if app bundle exists."
fi

if [[ "${TAURI_MAC_TARGETS:-}" == *"dmg"* || "${TAURI_MANUAL_DMG:-}" == "1" ]]; then
  app_bundle="$MAC_DIR/TauriBuild/src-tauri/target/release/bundle/macos/DefectDetection.app"
  if [[ -d "$app_bundle" ]]; then
    version=$(python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path("Build/macOS/TauriBuild/src-tauri/tauri.conf.json").read_text(encoding="utf-8"))
print(data["package"]["version"])
PY
)
    product=$(python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path("Build/macOS/TauriBuild/src-tauri/tauri.conf.json").read_text(encoding="utf-8"))
print(data["package"]["productName"])
PY
)
    arch="$(uname -m)"
    if [[ "$arch" == "arm64" ]]; then
      arch="aarch64"
    elif [[ "$arch" == "x86_64" ]]; then
      arch="x86_64"
    fi
    dmg_dir="$MAC_DIR/TauriBuild/src-tauri/target/release/bundle/dmg"
    dmg_name="${product}_${version}_${arch}.dmg"
    mkdir -p "$dmg_dir"
    hdiutil create -volname "$product" -srcfolder "$app_bundle" -ov -format UDZO "$dmg_dir/$dmg_name"
  else
    echo "Missing Tauri app bundle at $app_bundle; cannot create DMG."
  fi
fi
