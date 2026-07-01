from __future__ import annotations

import math
from typing import Literal

from fastapi import APIRouter, HTTPException, Depends, Query

from app.server.api.utils import get_defect_class_payload
from app.server import deps
from app.server.api.dependencies import get_image_service
from app.server.schemas import SurfaceImageInfo
from app.server.services.image_service import ImageService

router = APIRouter(prefix="/api")


def _calc_max_tile_level(
    tile_size: int,
    min_cache_size: int = 128,
    cache_extent: int | None = None,
) -> int:
    extent = max(int(tile_size or 0), int(cache_extent or 0))
    if extent <= 0:
        return 0
    ratio = extent / max(1, min_cache_size)
    if ratio <= 1:
        return 0
    return min(16, max(0, int(math.floor(math.log(ratio, 2)))))


@router.get("/meta")
def api_meta():
    """
    Web UI 全局元信息。

    - defect_classes: 缺陷字典（原 /api/defect-classes 返回值）
    - tile: 瓦片相关全局配置，由服务端统一给出
    """
    try:
        defect_classes = get_defect_class_payload()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="DefectClass.json not found") from exc

    settings = deps.get_settings()
    images = settings.images
    disk_cache = settings.disk_cache

    # 瓦片层级与尺寸从配置文件中读取
    max_level = _calc_max_tile_level(
        images.frame_height,
        int(getattr(images, "tile_min_cache_size", 128) or 128),
        max(int(images.frame_width or 0), int(images.frame_height or 0)),
    )

    tile_meta = {
        "max_level": max_level,
        "min_level": 0,
        "default_tile_size": images.frame_height,
        "tile_size": images.frame_height,
        "min_cache_size": int(getattr(images, "tile_min_cache_size", 128) or 128),
    }

    image_meta = {
        "frame_width": images.frame_width,
        "frame_height": images.frame_height,
        "org_width": getattr(images, "org_width", None),
        "org_height": getattr(images, "org_height", None),
        "dual_field_mode": bool(getattr(images, "dual_field_mode", False)),
    }

    return {
        "defect_classes": defect_classes,
        "tile": tile_meta,
        "image": image_meta,
        "dual_field": {
            "enabled": bool(getattr(images, "dual_field_mode", False)),
            "fields": [
                {"key": "bright", "value": 0, "label": "明场"},
                {"key": "dark", "value": 1, "label": "暗场"},
            ],
        },
        "defect_cache_expand": disk_cache.defect_cache_expand,
    }


@router.get("/steel-meta/{seq_no}")
def api_steel_meta(
    seq_no: int,
    field: str | None = Query(default=None),
    image_service: ImageService = Depends(get_image_service),
):
    """
    返回指定钢板在当前实例下的图像元数据，指导前端渲染（分布图、瓦片加载等）。
    """
    surfaces: list[Literal["top", "bottom"]] = ["top", "bottom"]
    surface_images: list[SurfaceImageInfo] = []
    requested_field = image_service.request_field_or_default(field)
    for surf in surfaces:
        try:
            frame_count, image_width, image_height = image_service.get_surface_image_info(
                surface=surf, seq_no=seq_no, field=requested_field
            )
        except FileNotFoundError:
            continue
        tile_size = image_service.settings.images.frame_height
        max_level = _calc_max_tile_level(
            tile_size,
            int(getattr(image_service.settings.images, "tile_min_cache_size", 128) or 128),
            max(int(image_width or 0), int(image_height or 0)),
        )
        surface_images.append(
            SurfaceImageInfo(
                surface=surf,
                frame_count=frame_count,
                image_width=image_width,
                image_height=image_height,
                max_level=max_level,
                field=requested_field or "all",
            )
        )

    return {
        "seq_no": seq_no,
        "surface_images": surface_images,
    }
