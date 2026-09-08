import type { SurfaceImageInfo, Surface } from "../api/types";
import type { SurfaceFilter, ImageOrientation } from "../types/app.types";
import type { Tile } from "../components/LargeImageViewer/utils";
import type { Defect } from "../types/app.types";

export interface SurfaceLayout {
  surface: Surface;
  meta: SurfaceImageInfo;
  mosaicWidth: number;
  mosaicHeight: number;
  worldWidth: number;
  worldHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface OrientationLayout {
  surfaces: SurfaceLayout[];
  worldWidth: number;
  worldHeight: number;
}

export interface OrientationLayoutParams {
  orientation: ImageOrientation;
  surfaceFilter: SurfaceFilter;
  topMeta?: SurfaceImageInfo;
  bottomMeta?: SurfaceImageInfo;
  surfaceGap?: number;
}

const SURFACE_ORDER: Surface[] = ["top", "bottom"];

export function buildOrientationLayout({
  orientation,
  surfaceFilter,
  topMeta,
  bottomMeta,
  surfaceGap = 0,
}: OrientationLayoutParams): OrientationLayout {
  const metaMap: Record<Surface, SurfaceImageInfo | undefined> = {
    top: topMeta,
    bottom: bottomMeta,
  };
  const shouldIncludeSurface = (surface: Surface) =>
    surfaceFilter === "all" || surfaceFilter === surface;

  const surfaces: SurfaceLayout[] = [];
  for (const surface of SURFACE_ORDER) {
    if (!shouldIncludeSurface(surface)) continue;
    const meta = metaMap[surface];
    if (!meta) continue;

    const mosaicWidth = meta.image_width ?? 0;
    const mosaicHeight =
      (meta.frame_count ?? 0) * (meta.image_height ?? 0);
    if (mosaicWidth <= 0 || mosaicHeight <= 0) {
      continue;
    }

    const layout: SurfaceLayout = {
      surface,
      meta,
      mosaicWidth,
      mosaicHeight,
      worldWidth:
        orientation === "horizontal"
          ? mosaicHeight
          : mosaicWidth,
      worldHeight:
        orientation === "horizontal"
          ? mosaicWidth
          : mosaicHeight,
      offsetX: 0,
      offsetY: 0,
    };
    surfaces.push(layout);
  }

  if (surfaces.length === 0) {
    return { surfaces: [], worldWidth: 0, worldHeight: 0 };
  }

  if (orientation === "horizontal") {
    let offsetY = 0;
    surfaces.forEach((surfaceLayout, index) => {
      surfaceLayout.offsetX = 0;
      surfaceLayout.offsetY = offsetY;
      offsetY += surfaceLayout.worldHeight;
      if (index < surfaces.length - 1) {
        offsetY += surfaceGap;
      }
    });
    return {
      surfaces,
      worldWidth: Math.max(
        ...surfaces.map((s) => s.worldWidth),
      ),
      worldHeight: offsetY,
    };
  }

  let offsetX = 0;
  surfaces.forEach((surfaceLayout, index) => {
    surfaceLayout.offsetX = offsetX;
    surfaceLayout.offsetY = 0;
    offsetX += surfaceLayout.worldWidth;
    if (index < surfaces.length - 1) {
      offsetX += surfaceGap;
    }
  });
  return {
    surfaces,
    worldWidth: offsetX,
    worldHeight: Math.max(
      ...surfaces.map((s) => s.worldHeight),
    ),
  };
}

export function pickSurfaceForTile(
  layout: OrientationLayout,
  tile: Tile,
): SurfaceLayout | null {
  const centerX = tile.x + tile.width / 2;
  const centerY = tile.y + tile.height / 2;
  return (
    layout.surfaces.find(
      (surface) =>
        centerX >= surface.offsetX &&
        centerX < surface.offsetX + surface.worldWidth &&
        centerY >= surface.offsetY &&
        centerY < surface.offsetY + surface.worldHeight,
    ) ?? null
  );
}

export function computeTileRequestInfo({
  surface,
  tile,
  orientation,
  virtualTileSize,
  tileSize,
}: {
  surface: SurfaceLayout;
  tile: Tile;
  orientation: ImageOrientation;
  virtualTileSize: number;
  tileSize: number;
}):
  | {
      tileX: number;
      tileY: number;
    }
  | null {
  const alignedOffsetX =
    orientation === "vertical" && surface.surface === "bottom"
      ? Math.ceil(surface.offsetX / tileSize) * tileSize
      : surface.offsetX;
  const localX = tile.x - alignedOffsetX;
  const localY = tile.y - surface.offsetY;
  const intersects =
    localX + tile.width > 0 &&
    localY + tile.height > 0 &&
    localX < surface.worldWidth &&
    localY < surface.worldHeight;

  if (!intersects) {
    return null;
  }

  const sourceX = orientation === "horizontal" ? localY : localX;
  const sourceY = orientation === "horizontal" ? localX : localY;

  const tileX = Math.floor(sourceX / virtualTileSize);
  const tileY = Math.floor(sourceY / virtualTileSize);
  if (tileX < 0 || tileY < 0) {
    return null;
  }

  const maxTileX = Math.ceil(surface.mosaicWidth / virtualTileSize);
  const maxTileY = Math.ceil(surface.mosaicHeight / virtualTileSize);

  if (tileX >= maxTileX || tileY >= maxTileY) {
    return null;
  }

  return { tileX, tileY };
}

export function convertDefectToWorldRect({
  surface,
  defect,
  orientation,
}: {
  surface: SurfaceLayout;
  defect: Defect;
  orientation: ImageOrientation;
}):
  | {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | null {
  if (defect.surface !== surface.surface) {
    return null;
  }

  if (typeof defect.imageIndex !== "number") {
    return null;
  }

  const frameHeight = surface.meta.image_height ?? 0;
  const mosaicX = defect.x;
  const frameIndex =
    Number.isFinite(defect.imageIndex) && defect.imageIndex > 0
      ? defect.imageIndex - 1
      : 0;
  const mosaicY = frameIndex * frameHeight + defect.y;

  if (orientation === "horizontal") {
    return {
      x: surface.offsetX + mosaicY,
      y: surface.offsetY + mosaicX,
      width: defect.height,
      height: defect.width,
    };
  }

  return {
    x: surface.offsetX + mosaicX,
    y: surface.offsetY + mosaicY,
    width: defect.width,
    height: defect.height,
  };
}

export function convertMosaicRectToWorldRect({
  surface,
  rect,
  orientation,
}: {
  surface: SurfaceLayout;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  orientation: ImageOrientation;
}):
  | {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | null {
  if (orientation === "horizontal") {
    return {
      x: surface.offsetX + rect.y,
      y: surface.offsetY + rect.x,
      width: rect.height,
      height: rect.width,
    };
  }

  return {
    x: surface.offsetX + rect.x,
    y: surface.offsetY + rect.y,
    width: rect.width,
    height: rect.height,
  };
}