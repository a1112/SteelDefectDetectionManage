from __future__ import annotations

import json
import logging
import math
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

TILE_RENDER_VERSION = "transpose-horizontal-v2"


@dataclass(frozen=True)
class DiskCacheKey:
    surface_root: Path
    seq_no: int
    view: str


class DiskImageCache:
    """
    File-level cache for tiles and defect crops.
    Layout (example):
      {cache_root}/{seq_no}/cache/{view}/
        cache.json
        tile/{level}/{orientation}_{tile_x}_{tile_y}.jpg
        defects/{surface}/{defect_id}.jpg
    """

    def __init__(
        self,
        *,
        enabled: bool,
        read_only: bool = False,
        flat_layout: bool = False,
        max_tiles: int,
        max_defects: int,
        defect_expand: int,
        tile_size: int,
        frame_width: int,
        frame_height: int,
        view_name: str,
        tile_min_cache_size: int = 128,
    ):
        self.enabled = enabled
        self.read_only = read_only
        self.flat_layout = flat_layout
        self.max_tiles = max_tiles
        self.max_defects = max_defects
        self.defect_expand = defect_expand
        self.tile_size = tile_size
        self.tile_min_cache_size = max(1, int(tile_min_cache_size or 128))
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.view_name = view_name
        self.tile_render_version = TILE_RENDER_VERSION
        self._lock = threading.Lock()

    def max_level(self) -> int:
        # Long strip tiles keep one axis as a long overview; choose the deepest
        # level from the real cross-axis extent so that the covered width/height
        # can be reduced toward tile_min_cache_size instead of stopping at the
        # base tile size.
        frame_extents = [
            int(value)
            for value in (self.frame_width, self.frame_height, self.tile_size)
            if int(value or 0) > 0
        ]
        cache_extent = max(frame_extents) if frame_extents else 0
        if cache_extent <= 0:
            return 0
        ratio = cache_extent / self.tile_min_cache_size
        if ratio <= 1:
            return 0
        return min(16, max(0, int(math.floor(math.log(ratio, 2)))))

    def cache_dir(self, cache_root: Path, seq_no: int, view: Optional[str]) -> Path:
        view_dir = view or self.view_name
        if self.flat_layout:
            return cache_root / "cache" / view_dir
        return cache_root / str(seq_no) / "cache" / view_dir

    def tile_path(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        level: int,
        orientation: str,
        tile_x: int,
        tile_y: int,
    ) -> Path:
        base = self.cache_dir(cache_root, seq_no, view)
        return base / "tile" / str(level) / f"{orientation}_{tile_x}_{tile_y}.jpg"

    def defect_path(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        surface: str,
        defect_id: str,
    ) -> Path:
        base = self.cache_dir(cache_root, seq_no, view)
        # 新目录规范：cache/{view}/defect/{seq}_{surface}_{left}_{top}_{w}_{h}_{expand}.jpg
        # 这里 defect_id 已经是完整的文件名主体。
        return base / "defect" / f"{defect_id}.jpg"

    def read_tile(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        level: int,
        orientation: str,
        tile_x: int,
        tile_y: int,
    ) -> Optional[bytes]:
        if not self.enabled:
            return None
        path = self.tile_path(
            cache_root,
            seq_no,
            view=view,
            level=level,
            orientation=orientation,
            tile_x=tile_x,
            tile_y=tile_y,
        )
        try:
            return path.read_bytes() if path.exists() else None
        except OSError:
            return None

    def write_tile(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        level: int,
        orientation: str,
        tile_x: int,
        tile_y: int,
        payload: bytes,
        ensure_meta: bool = True,
    ) -> None:
        if not self.enabled or self.read_only:
            return
        path = self.tile_path(
            cache_root,
            seq_no,
            view=view,
            level=level,
            orientation=orientation,
            tile_x=tile_x,
            tile_y=tile_y,
        )
        self._atomic_write(path, payload)
        if ensure_meta:
            self._ensure_cache_json(cache_root, seq_no, view=view)

    def read_defect(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        surface: str,
        defect_id: str,
    ) -> Optional[bytes]:
        if not self.enabled:
            return None
        base = self.cache_dir(cache_root, seq_no, view)
        path = base / "defect" / f"{defect_id}.jpg"
        try:
            return path.read_bytes() if path.exists() else None
        except OSError:
            return None

    def write_defect(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        surface: str,
        defect_id: str,
        payload: bytes,
        ensure_meta: bool = True,
    ) -> None:
        if not self.enabled or self.read_only:
            return
        path = self.defect_path(cache_root, seq_no, view=view, surface=surface, defect_id=defect_id)
        self._atomic_write(path, payload)
        if ensure_meta:
            self._ensure_cache_json(cache_root, seq_no, view=view)

    def ensure_cache_meta(self, cache_root: Path, seq_no: int, *, view: Optional[str]) -> None:
        if not self.enabled or self.read_only:
            return
        self._ensure_cache_json(cache_root, seq_no, view=view)

    def mark_complete(self, cache_root: Path, seq_no: int, *, view: Optional[str]) -> None:
        if not self.enabled or self.read_only:
            return
        self._ensure_cache_json(cache_root, seq_no, view=view)
        base = self.cache_dir(cache_root, seq_no, view)
        meta_path = base / "cache.json"
        try:
            existing = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = {}
        if not isinstance(existing, dict):
            existing = {}
        existing["state"] = "complete"
        existing["complete"] = True
        existing["completed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        existing.setdefault("view", (view or self.view_name))
        try:
            self._atomic_write(meta_path, json.dumps(existing, ensure_ascii=False, indent=2).encode("utf-8"))
        except OSError:
            return

    def update_overview_status(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
        level: int,
        orientation: str,
        expected_count: int,
        actual_count: int,
        complete: bool,
    ) -> None:
        if not self.enabled or self.read_only:
            return
        self._ensure_cache_json(cache_root, seq_no, view=view)
        base = self.cache_dir(cache_root, seq_no, view)
        meta_path = base / "cache.json"
        try:
            existing = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = {}
        if not isinstance(existing, dict):
            existing = {}
        overview = existing.get("overview")
        if not isinstance(overview, dict):
            overview = {}
        status = {
            "level": int(level),
            "orientation": str(orientation or "horizontal"),
            "expected_count": int(expected_count),
            "actual_count": int(actual_count),
            "complete": bool(complete),
            "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        highest = overview.get("highest_horizontal")
        try:
            highest_level = int(highest.get("level") or -1) if isinstance(highest, dict) else -1
        except (TypeError, ValueError):
            highest_level = -1
        if int(level) >= highest_level:
            overview["highest_horizontal"] = status
        horizontal_levels = overview.get("horizontal_levels")
        if not isinstance(horizontal_levels, dict):
            horizontal_levels = {}
        horizontal_levels[str(int(level))] = status
        overview["horizontal_levels"] = horizontal_levels
        existing["overview"] = overview
        try:
            self._atomic_write(meta_path, json.dumps(existing, ensure_ascii=False, indent=2).encode("utf-8"))
        except OSError:
            return

    def cleanup_seq(
        self,
        cache_root: Path,
        seq_no: int,
        *,
        view: Optional[str],
    ) -> None:
        if not self.enabled or self.read_only:
            return
        base = self.cache_dir(cache_root, seq_no, view)
        tile_dir = base / "tile"
        defect_dir = base / "defect"
        self._enforce_limit(tile_dir, self.max_tiles)
        self._enforce_limit(defect_dir, self.max_defects)

    # ------------------------------------------------------------------ #
    # Internal
    # ------------------------------------------------------------------ #
    def read_meta(self, cache_root: Path, seq_no: int, *, view: Optional[str]) -> Optional[dict]:
        """
        读取指定序列的 cache.json 元数据；用于缓存刷新/补充逻辑。
        """
        base = self.cache_dir(cache_root, seq_no, view)
        meta_path = base / "cache.json"
        if not meta_path.exists():
            return None
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    def _ensure_cache_json(self, cache_root: Path, seq_no: int, *, view: Optional[str]) -> None:
        base = self.cache_dir(cache_root, seq_no, view)
        meta_path = base / "cache.json"
        if meta_path.exists():
            try:
                existing = json.loads(meta_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                existing = None
            if isinstance(existing, dict):
                tile_meta = existing.get("tile") or {}
                defect_meta = existing.get("defects") or {}
                existing_level = int(tile_meta.get("max_level") or 0)
                existing_expand = int(defect_meta.get("expand") or 0)
                existing_render_version = str(tile_meta.get("render_version") or "")
                if (
                    existing_level >= self.max_level()
                    and existing_expand == self.defect_expand
                    and existing_render_version == self.tile_render_version
                    and str(existing.get("view") or "") == str(view or self.view_name)
                ):
                    if "state" not in existing and "complete" not in existing:
                        existing["state"] = "building"
                        existing["complete"] = False
                        try:
                            self._atomic_write(
                                meta_path,
                                json.dumps(existing, ensure_ascii=False, indent=2).encode("utf-8"),
                            )
                        except OSError:
                            pass
                    return
        base.mkdir(parents=True, exist_ok=True)
        payload = {
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "state": "building",
            "complete": False,
            "view": (view or self.view_name),
            "tile": {
                "tile_size": self.tile_size,
                "max_level": self.max_level(),
                "min_cache_size": self.tile_min_cache_size,
                "render_version": self.tile_render_version,
                "format": "JPEG",
            },
            "image": {
                "frame_width": self.frame_width,
                "frame_height": self.frame_height,
            },
            "defects": {
                "format": "JPEG",
                "expand": self.defect_expand,
                "enabled": bool(self.enabled),
            },
        }
        try:
            self._atomic_write(meta_path, json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))
            logger.info("disk-cache meta %s 完成", meta_path)
        except OSError:
            return

    def update_frame_count(self, cache_root: Path, seq_no: int, *, view: Optional[str], frame_count: int) -> None:
        if not self.enabled or self.read_only:
            return
        base = self.cache_dir(cache_root, seq_no, view)
        meta_path = base / "cache.json"
        if not meta_path.exists():
            self._ensure_cache_json(cache_root, seq_no, view=view)
        try:
            existing = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = {}
        if not isinstance(existing, dict):
            existing = {}
        image_meta = existing.get("image") or {}
        current = int(image_meta.get("frame_count") or 0)
        tile_meta = existing.get("tile") or {}
        try:
            current_level = int(tile_meta.get("max_level") or 0)
        except (TypeError, ValueError):
            current_level = -1
        current_render_version = str(tile_meta.get("render_version") or "")
        target_level = self.max_level()
        if (
            current == int(frame_count)
            and current_level == target_level
            and current_render_version == self.tile_render_version
        ):
            return
        existing["state"] = "building"
        existing["complete"] = False
        tile_meta["tile_size"] = self.tile_size
        tile_meta["max_level"] = target_level
        tile_meta["min_cache_size"] = self.tile_min_cache_size
        tile_meta["render_version"] = self.tile_render_version
        tile_meta.setdefault("format", "JPEG")
        existing["tile"] = tile_meta
        image_meta["frame_count"] = int(frame_count)
        existing["image"] = image_meta
        try:
            self._atomic_write(meta_path, json.dumps(existing, ensure_ascii=False, indent=2).encode("utf-8"))
        except OSError:
            return

    def _atomic_write(self, path: Path, payload: bytes) -> None:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
        except OSError:
            return
        tmp = path.with_suffix(path.suffix + ".tmp")
        with self._lock:
            try:
                tmp.write_bytes(payload)
                tmp.replace(path)
            except OSError:
                try:
                    if tmp.exists():
                        tmp.unlink()
                except OSError:
                    pass

    @staticmethod
    def _enforce_limit(root: Path, max_items: int) -> None:
        if not root.exists():
            return
        try:
            files = [p for p in root.rglob("*.jpg") if p.is_file()]
        except OSError:
            return
        if len(files) <= max_items:
            return
        try:
            files.sort(key=lambda p: p.stat().st_mtime)
        except OSError:
            return
        for path in files[: max(0, len(files) - max_items)]:
            try:
                path.unlink()
            except OSError:
                continue
