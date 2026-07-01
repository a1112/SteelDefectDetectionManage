from __future__ import annotations

import json
import os
import shutil
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.server import deps
from app.server.api.dependencies import get_image_service
from app.server.db.models.source.ncdplate import Steelrecord
from app.server.db.models.management.rbac import CacheRecord
from app.server.services.image_service import ImageService
from app.server.config.settings import CURRENT_DIR, DEFAULT_CONFIG_NAME, ensure_current_config_dir
from app.server.utils.config_helper import (
    get_line_key,
    load_server_config,
    save_server_config,
    update_config_section,
    get_nested_config,
)
from pathlib import Path


router = APIRouter(prefix="/api")

LINE_KEY_ENV = "DEFECT_LINE_KEY"
LINE_NAME_ENV = "DEFECT_LINE_NAME"


def _resolve_seq_list(
    main_db: Session,
    mode: str,
    keep_last: Optional[int],
    start_seq: Optional[int],
    end_seq: Optional[int],
) -> list[int]:
    if mode == "keep_last" and keep_last:
        records = (
            main_db.query(Steelrecord.seqNo)
            .order_by(Steelrecord.seqNo.desc())
            .limit(int(keep_last))
            .all()
        )
        keep_set = {int(row.seqNo) for row in records}
        all_seqs = (
            main_db.query(Steelrecord.seqNo)
            .order_by(Steelrecord.seqNo.desc())
            .all()
        )
        return [int(row.seqNo) for row in all_seqs if int(row.seqNo) not in keep_set]
    if mode == "range" and start_seq is not None and end_seq is not None:
        records = (
            main_db.query(Steelrecord.seqNo)
            .filter(Steelrecord.seqNo >= int(start_seq), Steelrecord.seqNo <= int(end_seq))
            .order_by(Steelrecord.seqNo.desc())
            .all()
        )
        return [int(row.seqNo) for row in records]
    if mode == "all":
        records = (
            main_db.query(Steelrecord.seqNo)
            .order_by(Steelrecord.seqNo.desc())
            .all()
        )
        return [int(row.seqNo) for row in records]
    return []


class CacheSurfacePayload(BaseModel):
    surface: str
    view: str
    cached: bool = False
    building: Optional[bool] = None
    image_missing: Optional[bool] = None
    stale: Optional[bool] = None
    tile_max_level: Optional[int] = None
    tile_size: Optional[int] = None
    defect_expand: Optional[int] = None
    defect_cache_enabled: Optional[bool] = None
    disk_cache_enabled: Optional[bool] = None
    updated_at: Optional[datetime] = None


class CacheRecordPayload(BaseModel):
    seq_no: int
    steel_no: Optional[str] = None
    detect_time: Optional[datetime] = None
    status: str
    surfaces: list[CacheSurfacePayload]


class CacheRecordsResponse(BaseModel):
    items: list[CacheRecordPayload]
    total: int
    max_seq: Optional[int] = None
    cache_range_min: Optional[int] = None
    cache_window_records: Optional[int] = None
    expected_tile_max_level: Optional[int] = None
    expected_defect_expand: Optional[int] = None


class CacheScanRequest(BaseModel):
    seq_no: Optional[int] = Field(default=None, description="指定扫描的流水号")
    limit: Optional[int] = Field(default=None, description="扫描最近 N 条记录")


class CacheScanResponse(BaseModel):
    updated: int
    seq_nos: list[int]


class CachePrecacheRequest(BaseModel):
    seq_no: int
    levels: Optional[int] = None


class CachePrecacheResponse(BaseModel):
    ok: bool


class CacheStatusResponse(BaseModel):
    state: str
    message: str
    seq_no: Optional[int] = None
    surface: Optional[str] = None
    view: Optional[str] = None
    line_key: Optional[str] = None
    line_name: Optional[str] = None
    line_kind: Optional[str] = None
    pid: Optional[int] = None
    worker_per_surface: Optional[int] = None
    paused: bool = False
    task: Optional[dict] = None


class CacheSettingsPayload(BaseModel):
    memory_cache: dict[str, object]
    disk_cache: dict[str, object]


class CacheDeleteRequest(BaseModel):
    mode: str = Field(description="all | keep_last | range")
    keep_last: Optional[int] = None
    start_seq: Optional[int] = None
    end_seq: Optional[int] = None


class CacheDeleteResponse(BaseModel):
    ok: bool
    deleted: int


class CacheRebuildRequest(BaseModel):
    mode: str = Field(description="all | keep_last | range")
    keep_last: Optional[int] = None
    start_seq: Optional[int] = None
    end_seq: Optional[int] = None
    force: bool = Field(default=False)


class CacheRebuildResponse(BaseModel):
    ok: bool


class CacheMigrateRequest(BaseModel):
    top_root: Optional[str] = None
    bottom_root: Optional[str] = None


class CacheMigrateResponse(BaseModel):
    ok: bool


def _clamp_cache_record_window(value: object, default: int = 200) -> int:
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        parsed = default
    return max(1, min(200, parsed))


def _normalize_disk_cache_payload(payload: dict[str, object]) -> dict[str, object]:
    normalized = dict(payload or {})
    for key in ("disk_cache_max_records", "disk_precache_window_records"):
        if key in normalized:
            normalized[key] = _clamp_cache_record_window(normalized.get(key))
    return normalized


def _is_cache_meta_complete(meta: Optional[dict]) -> bool:
    if not isinstance(meta, dict):
        return False
    state = str(meta.get("state") or "").strip().lower()
    if state == "complete":
        return True
    return meta.get("complete") is True


def _is_cache_meta_current(
    meta: Optional[dict],
    *,
    expected_tile_max_level: int,
    expected_defect_expand: int,
    expected_tile_render_version: str = "",
) -> bool:
    if not _is_cache_meta_complete(meta):
        return False
    tile = meta.get("tile") or {}
    defects = meta.get("defects") or {}
    try:
        tile_max_level = int(tile.get("max_level") or 0)
    except (TypeError, ValueError):
        tile_max_level = 0
    try:
        defect_expand = int(defects.get("expand") or 0)
    except (TypeError, ValueError):
        defect_expand = -1
    if expected_tile_max_level and tile_max_level < expected_tile_max_level:
        return False
    if expected_defect_expand and defect_expand != expected_defect_expand:
        return False
    if expected_tile_render_version and str(tile.get("render_version") or "") != expected_tile_render_version:
        return False
    return True


def _cache_record_meta(row: Optional[CacheRecord]) -> Optional[dict]:
    if row is None or not row.meta_json:
        return None
    try:
        meta = json.loads(row.meta_json)
    except (TypeError, json.JSONDecodeError):
        return None
    return meta if isinstance(meta, dict) else None


def _upsert_cache_record(
    session: Session,
    *,
    line_key: str,
    seq_no: int,
    surface: str,
    view: str,
    meta: Optional[dict],
    disk_cache_enabled: bool,
) -> bool:
    existing = (
        session.query(CacheRecord)
        .filter(
            CacheRecord.line_key == line_key,
            CacheRecord.seq_no == seq_no,
            CacheRecord.surface == surface,
            CacheRecord.view == view,
        )
        .one_or_none()
    )
    if not meta or not _is_cache_meta_complete(meta):
        if existing is not None:
            session.delete(existing)
            return True
        return False
    tile = meta.get("tile") or {}
    defects = meta.get("defects") or {}
    payload = {
        "line_key": line_key,
        "seq_no": seq_no,
        "surface": surface,
        "view": view,
        "tile_max_level": int(tile.get("max_level") or 0),
        "tile_size": int(tile.get("tile_size") or 0),
        "defect_expand": int(defects.get("expand") or 0),
        "defect_cache_enabled": bool(defects.get("enabled", True)),
        "disk_cache_enabled": bool(disk_cache_enabled),
        "meta_json": json.dumps(meta, ensure_ascii=False),
    }
    if existing is None:
        session.add(CacheRecord(**payload))
    else:
        for key, value in payload.items():
            setattr(existing, key, value)
    return True


@router.get("/cache/records", response_model=CacheRecordsResponse)
def list_cache_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    seq_nos: Optional[str] = Query(
        default=None,
        description="Comma-separated seq numbers to inspect; overrides page slicing when provided.",
    ),
    include_disk: bool = Query(
        default=False,
        description="When true, inspect disk cache metadata for missing DB rows. Default stays DB-only for UI polling.",
    ),
    include_source_check: bool = Query(
        default=False,
        description="When true, check source image folders. This can be slow on shared folders.",
    ),
    main_db: Session = Depends(deps.get_main_db),
    management_db: Session = Depends(deps.get_management_db),
    image_service: ImageService = Depends(get_image_service),
):
    line_key = get_line_key()
    base_query = main_db.query(Steelrecord).order_by(Steelrecord.seqNo.desc())
    max_seq = main_db.query(func.max(Steelrecord.seqNo)).scalar()
    requested_seq_nos: list[int] = []
    if seq_nos:
        for raw in seq_nos.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                requested_seq_nos.append(int(raw))
            except ValueError:
                continue
        requested_seq_nos = list(dict.fromkeys(requested_seq_nos))[:page_size]

    if requested_seq_nos:
        total = len(requested_seq_nos)
        records_by_seq = {
            int(record.seqNo): record
            for record in (
                main_db.query(Steelrecord)
                .filter(Steelrecord.seqNo.in_(requested_seq_nos))
                .all()
            )
        }
        records = [records_by_seq[seq_no] for seq_no in requested_seq_nos if seq_no in records_by_seq]
    else:
        total = base_query.count()
        records = (
            base_query.offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
    seq_nos_int = [int(record.seqNo) for record in records]
    cache_rows: list[CacheRecord] = []
    if seq_nos_int:
        cache_rows = (
            management_db.query(CacheRecord)
            .filter(CacheRecord.line_key == line_key, CacheRecord.seq_no.in_(seq_nos_int))
            .all()
        )
    cache_map: dict[int, dict[str, CacheRecord]] = {}
    disk_cache = image_service.settings.disk_cache
    for row in cache_rows:
        cache_map.setdefault(int(row.seq_no), {})[row.surface] = row

    max_records = int(disk_cache.disk_cache_max_records or 0)
    precache_window = max(
        1,
        min(
            200,
            int(getattr(disk_cache, "disk_precache_window_records", 200) or 200),
        ),
    )
    cache_window_records = (
        min(max_records, precache_window)
        if max_records > 0
        else precache_window
    )
    cache_range_min = None
    if cache_window_records > 0 and max_seq:
        cache_range_min = max(1, int(max_seq) - cache_window_records + 1)
    expected_tile_max_level = image_service.disk_cache.max_level()
    expected_defect_expand = int(getattr(disk_cache, "defect_cache_expand", 0) or 0)
    expected_tile_render_version = str(getattr(image_service.disk_cache, "tile_render_version", "") or "")
    view_dir = image_service.settings.images.default_view
    runtime_status = image_service.get_cache_status()
    runtime_state = str(runtime_status.get("state") or "ready").lower()
    runtime_task = runtime_status.get("task") if isinstance(runtime_status.get("task"), dict) else {}
    runtime_seq = runtime_status.get("seq_no") or runtime_task.get("current_seq")
    runtime_surface = runtime_status.get("surface")
    try:
        runtime_seq_no = int(runtime_seq) if runtime_seq is not None else None
    except (TypeError, ValueError):
        runtime_seq_no = None
    runtime_active_seq_nos: set[int] = set()
    if isinstance(runtime_task, dict):
        active_seqs = runtime_task.get("active_seqs")
        if isinstance(active_seqs, list):
            for value in active_seqs:
                try:
                    runtime_active_seq_nos.add(int(value))
                except (TypeError, ValueError):
                    continue
    if runtime_seq_no is not None:
        runtime_active_seq_nos.add(runtime_seq_no)
    runtime_is_building = runtime_state not in {"", "ready"}
    items: list[CacheRecordPayload] = []
    repaired_records = 0
    disk_meta_by_seq: dict[int, dict[str, dict]] = {}
    for record in records:
        seq_no = int(record.seqNo)
        surfaces: list[CacheSurfacePayload] = []
        surface_rows = cache_map.get(seq_no, {})
        cached_count = 0
        building_count = 0
        for surface in ("top", "bottom"):
            row = surface_rows.get(surface)
            meta: Optional[dict] = _cache_record_meta(row)
            surface_current_override: Optional[bool] = None
            is_building_surface = (
                runtime_is_building
                and runtime_seq_no == seq_no
                and (runtime_surface is None or str(runtime_surface) == surface)
            )
            if row is not None and not _is_cache_meta_complete(meta):
                if _upsert_cache_record(
                    management_db,
                    line_key=line_key,
                    seq_no=seq_no,
                    surface=surface,
                    view=row.view,
                    meta=None,
                    disk_cache_enabled=bool(disk_cache.disk_cache_enabled),
                ):
                    repaired_records += 1
                row = None
                meta = None
            if row is None:
                if include_disk:
                    if seq_no not in disk_meta_by_seq:
                        disk_meta_by_seq[seq_no] = image_service.read_disk_cache_meta(seq_no)
                    disk_meta = disk_meta_by_seq[seq_no].get(surface)
                    if _is_cache_meta_complete(disk_meta):
                        meta = disk_meta
                        surface_current_override = image_service.is_disk_cache_surface_current(
                            surface,
                            seq_no,
                            meta=disk_meta,
                            view_dir=view_dir,
                        )
                        if surface_current_override and _upsert_cache_record(
                            management_db,
                            line_key=line_key,
                            seq_no=seq_no,
                            surface=surface,
                            view=view_dir,
                            meta=meta,
                            disk_cache_enabled=bool(disk_cache.disk_cache_enabled),
                        ):
                            repaired_records += 1
                    else:
                        meta = None
            else:
                row_is_stale = False
                if expected_tile_max_level and row.tile_max_level is not None:
                    row_is_stale = row.tile_max_level < expected_tile_max_level
                if expected_defect_expand and row.defect_expand is not None:
                    row_is_stale = row_is_stale or (row.defect_expand != expected_defect_expand)
                if expected_tile_render_version and meta is not None:
                    row_tile_meta = meta.get("tile") or {}
                    row_is_stale = row_is_stale or (
                        str(row_tile_meta.get("render_version") or "") != expected_tile_render_version
                    )
                if include_disk or row_is_stale or is_building_surface:
                    if seq_no not in disk_meta_by_seq:
                        disk_meta_by_seq[seq_no] = image_service.read_disk_cache_meta(seq_no)
                    disk_meta = disk_meta_by_seq[seq_no].get(surface)
                    if _is_cache_meta_complete(disk_meta):
                        meta = disk_meta
                        row = None
                    surface_current_override = image_service.is_disk_cache_surface_current(
                        surface,
                        seq_no,
                        meta=disk_meta,
                        view_dir=view_dir,
                    )
                    if surface_current_override:
                        meta = disk_meta
                        row = None
                        is_building_surface = False
                        if _upsert_cache_record(
                            management_db,
                            line_key=line_key,
                            seq_no=seq_no,
                            surface=surface,
                            view=view_dir,
                            meta=meta,
                            disk_cache_enabled=bool(disk_cache.disk_cache_enabled),
                        ):
                            repaired_records += 1
            cached = row is not None or meta is not None
            view_name = row.view if row is not None else view_dir
            stale = False
            if surface_current_override is False:
                stale = True
            elif row is not None:
                if expected_tile_max_level and row.tile_max_level is not None:
                    stale = row.tile_max_level < expected_tile_max_level
                if expected_defect_expand and row.defect_expand is not None:
                    stale = stale or (row.defect_expand != expected_defect_expand)
                if expected_tile_render_version and meta is not None:
                    row_tile_meta = meta.get("tile") or {}
                    stale = stale or (
                        str(row_tile_meta.get("render_version") or "") != expected_tile_render_version
                    )
            elif meta is not None:
                meta_tile = meta.get("tile") or {}
                meta_defects = meta.get("defects") or {}
                meta_max_level = int(meta_tile.get("max_level") or 0)
                meta_expand = int(meta_defects.get("expand") or 0)
                if expected_tile_max_level:
                    stale = meta_max_level < expected_tile_max_level
                if expected_defect_expand:
                    stale = stale or (meta_expand != expected_defect_expand)
                if expected_tile_render_version:
                    stale = stale or (
                        str(meta_tile.get("render_version") or "") != expected_tile_render_version
                    )
            if (
                not is_building_surface
                and runtime_is_building
                and seq_no in runtime_active_seq_nos
                and (stale or not cached)
            ):
                is_building_surface = True
            image_missing: Optional[bool] = None
            if include_source_check:
                try:
                    frames = image_service._list_frame_paths_with_fallback(surface, seq_no, view_name)
                    image_missing = len(frames) == 0
                except FileNotFoundError:
                    image_missing = True
            meta_tile = (meta.get("tile") or {}) if meta is not None else {}
            meta_defects = (meta.get("defects") or {}) if meta is not None else {}
            surfaces.append(
                CacheSurfacePayload(
                    surface=surface,
                    view=view_name,
                    cached=cached,
                    building=is_building_surface,
                    image_missing=image_missing,
                    stale=stale,
                    tile_max_level=row.tile_max_level if row else (int(meta_tile.get("max_level") or 0) if meta else None),
                    tile_size=row.tile_size if row else (int(meta_tile.get("tile_size") or 0) if meta else None),
                    defect_expand=row.defect_expand if row else (int(meta_defects.get("expand") or 0) if meta else None),
                    defect_cache_enabled=row.defect_cache_enabled if row else (bool(meta_defects.get("enabled", True)) if meta else None),
                    disk_cache_enabled=row.disk_cache_enabled if row else bool(disk_cache.disk_cache_enabled),
                    updated_at=row.updated_at if row else None,
                )
            )
            if is_building_surface:
                building_count += 1
            if cached and not stale and not is_building_surface:
                cached_count += 1
        status = "none"
        if building_count:
            status = "building"
        elif cached_count == 1:
            status = "partial"
        elif cached_count >= 2:
            status = "complete"
        items.append(
            CacheRecordPayload(
                seq_no=seq_no,
                steel_no=record.steelID,
                detect_time=record.detectTime,
                status=status,
                surfaces=surfaces,
            )
        )
    if repaired_records:
        management_db.commit()

    return CacheRecordsResponse(
        items=items,
        total=total,
        max_seq=int(max_seq) if max_seq is not None else None,
        cache_range_min=cache_range_min,
        cache_window_records=cache_window_records,
        expected_tile_max_level=expected_tile_max_level,
        expected_defect_expand=expected_defect_expand,
    )


@router.post("/cache/scan", response_model=CacheScanResponse)
def scan_cache_records(
    payload: CacheScanRequest,
    image_service: ImageService = Depends(get_image_service),
    main_db: Session = Depends(deps.get_main_db),
    management_db: Session = Depends(deps.get_management_db),
):
    line_key = get_line_key()
    view = image_service.settings.images.default_view
    disk_cache_enabled = bool(image_service.settings.disk_cache.disk_cache_enabled)

    seqs: list[int] = []
    if payload.seq_no is not None:
        seqs = [int(payload.seq_no)]
    elif payload.limit:
        records = (
            main_db.query(Steelrecord)
            .order_by(Steelrecord.seqNo.desc())
            .limit(int(payload.limit))
            .all()
        )
        seqs = [int(record.seqNo) for record in records]

    updated = 0
    for seq_no in seqs:
        meta_map = image_service.read_disk_cache_meta(seq_no)
        for surface in ("top", "bottom"):
            changed = _upsert_cache_record(
                management_db,
                line_key=line_key,
                seq_no=seq_no,
                surface=surface,
                view=view,
                meta=meta_map.get(surface),
                disk_cache_enabled=disk_cache_enabled,
            )
            if changed:
                updated += 1
    management_db.commit()
    return CacheScanResponse(updated=updated, seq_nos=seqs)


@router.post("/cache/precache", response_model=CachePrecacheResponse)
def precache_record(
    payload: CachePrecacheRequest,
    image_service: ImageService = Depends(get_image_service),
):
    image_service.precache_seq(int(payload.seq_no), levels=payload.levels)
    return CachePrecacheResponse(ok=True)


@router.websocket("/cache/ws")
async def cache_status_ws(websocket: WebSocket):
    await websocket.accept()
    image_service = get_image_service()
    last_payload: dict | None = None
    try:
        while True:
            status = image_service.get_cache_status()
            payload = {
                "state": str(status.get("state") or "ready"),
                "message": str(status.get("message") or "就绪"),
                "seq_no": status.get("seq_no"),
                "surface": status.get("surface"),
            }
            if payload != last_payload:
                await websocket.send_json(payload)
                last_payload = payload
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return


@router.get("/cache/status", response_model=CacheStatusResponse)
def get_cache_status(image_service: ImageService = Depends(get_image_service)):
    status = image_service.get_cache_status()
    return CacheStatusResponse(
        state=str(status.get("state") or "ready"),
        message=str(status.get("message") or "就绪"),
        seq_no=status.get("seq_no"),
        surface=status.get("surface"),
        view=status.get("view"),
        line_key=get_line_key(),
        line_name=os.getenv("DEFECT_LINE_NAME"),
        line_kind=os.getenv("DEFECT_LINE_KIND") or "default",
        pid=os.getpid(),
        worker_per_surface=1,
        paused=bool(status.get("paused") or False),
        task=status.get("task"),
    )


@router.post("/cache/pause")
def pause_cache(image_service: ImageService = Depends(get_image_service)):
    image_service.pause_cache_tasks()
    return {"ok": True}


@router.post("/cache/resume")
def resume_cache(image_service: ImageService = Depends(get_image_service)):
    image_service.resume_cache_tasks()
    return {"ok": True}


@router.get("/cache/settings", response_model=CacheSettingsPayload)
def get_cache_settings(image_service: ImageService = Depends(get_image_service)):
    return CacheSettingsPayload(
        memory_cache=image_service.settings.memory_cache.model_dump(),
        disk_cache=image_service.settings.disk_cache.model_dump(),
    )


@router.put("/cache/settings", response_model=CacheSettingsPayload)
def update_cache_settings(
    payload: CacheSettingsPayload,
    image_service: ImageService = Depends(get_image_service),
):
    config = load_server_config()
    memory_payload = payload.memory_cache if isinstance(payload.memory_cache, dict) else {}
    disk_payload = payload.disk_cache if isinstance(payload.disk_cache, dict) else {}
    disk_payload = _normalize_disk_cache_payload(disk_payload)
    config = update_config_section(config, "memory_cache", memory_payload)
    config = update_config_section(config, "disk_cache", disk_payload)
    save_server_config(config)
    for key, value in memory_payload.items():
        setattr(image_service.settings.memory_cache, key, value)
    for key, value in disk_payload.items():
        setattr(image_service.settings.disk_cache, key, value)
    image_service.begin_cache_task("configuring", "?????????????????????")
    image_service.end_cache_task()
    return CacheSettingsPayload(
        memory_cache=image_service.settings.memory_cache.model_dump(),
        disk_cache=image_service.settings.disk_cache.model_dump(),
    )


@router.post("/cache/delete", response_model=CacheDeleteResponse)
def delete_cache_records(
    payload: CacheDeleteRequest,
    image_service: ImageService = Depends(get_image_service),
    main_db: Session = Depends(deps.get_main_db),
    management_db: Session = Depends(deps.get_management_db),
):
    line_key = get_line_key()
    seqs = _resolve_seq_list(main_db, payload.mode, payload.keep_last, payload.start_seq, payload.end_seq)
    deleted = 0
    if seqs:
        image_service.enqueue_cache_delete(seqs)
        (
            management_db.query(CacheRecord)
            .filter(CacheRecord.line_key == line_key, CacheRecord.seq_no.in_(seqs))
            .delete(synchronize_session=False)
        )
        management_db.commit()
        deleted = len(seqs)
    return CacheDeleteResponse(ok=True, deleted=deleted)


@router.post("/cache/rebuild", response_model=CacheRebuildResponse)
def rebuild_cache_records(
    payload: CacheRebuildRequest,
    image_service: ImageService = Depends(get_image_service),
    main_db: Session = Depends(deps.get_main_db),
):
    seqs = _resolve_seq_list(main_db, payload.mode, payload.keep_last, payload.start_seq, payload.end_seq)
    if seqs:
        image_service.enqueue_cache_rebuild(seqs, force=payload.force)
    return CacheRebuildResponse(ok=True)


@router.post("/cache/migrate", response_model=CacheMigrateResponse)
def migrate_cache(
    payload: CacheMigrateRequest,
    image_service: ImageService = Depends(get_image_service),
):
    image_service.begin_cache_task("migrating", "缓存迁移中")
    try:
        config = load_server_config()
        images_config = dict(get_nested_config(config, "images", default={}))
        for surface, attr, new_root in (
            ("top", "disk_cache_top_root", payload.top_root),
            ("bottom", "disk_cache_bottom_root", payload.bottom_root),
        ):
            if not new_root:
                continue
            target_root = Path(new_root)
            target_root.mkdir(parents=True, exist_ok=True)
            old_root = image_service._cache_root(surface)
            if old_root.resolve() == target_root.resolve():
                images_config[attr] = str(target_root)
                continue
            view_dir = image_service.settings.images.default_view
            for entry in old_root.iterdir() if old_root.exists() else []:
                if not entry.is_dir():
                    continue
                cache_dir = entry / "cache" / view_dir
                if not cache_dir.exists():
                    continue
                dest_dir = target_root / entry.name / "cache" / view_dir
                dest_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(cache_dir.parent), str(dest_dir.parent))
            images_config[attr] = str(target_root)
            setattr(image_service.settings.images, attr, target_root)
        config["images"] = images_config
        _save_server_config(config)
    finally:
        image_service.end_cache_task()
    return CacheMigrateResponse(ok=True)
