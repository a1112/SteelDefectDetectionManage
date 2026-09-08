import type { ImageOrientation } from "../types/app.types";
import type { Surface } from "../api/types";

export interface DrawTileParams {
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  tile: { x: number; y: number; width: number; height: number };
  orientation: ImageOrientation;
  source?: { x: number; y: number; width: number; height: number };
}

export function drawTileImage(params: DrawTileParams): void {
  const { ctx, img, tile, orientation, source } = params;

  ctx.save();
  const prevSmoothing = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";

  if (orientation === "horizontal") {
    ctx.translate(tile.x, tile.y);
    ctx.transform(0, 1, 1, 0, 0, 0);
    if (source) {
      ctx.drawImage(
        img,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        tile.height,
        tile.width,
      );
    } else {
      ctx.drawImage(img, 0, 0, tile.height, tile.width);
    }
  } else {
    if (source) {
      ctx.drawImage(
        img,
        source.x,
        source.y,
        source.width,
        source.height,
        tile.x,
        tile.y,
        tile.width,
        tile.height,
      );
    } else {
      ctx.drawImage(img, tile.x, tile.y, tile.width, tile.height);
    }
  }

  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.imageSmoothingQuality = prevQuality;
  ctx.restore();
}

export function tryDrawFallbackTile(params: {
  ctx: CanvasRenderingContext2D;
  tile: { x: number; y: number; width: number; height: number; level: number };
  orientation: ImageOrientation;
  // 使用更通用的接口类型，支持 Map 和 LRU 缓存
  cache: Pick<Map<string, HTMLImageElement>, 'get'>;
  cacheKeyPrefix: string;
  surface: Surface;
  seqNo: number;
  tileX: number;
  tileY: number;
  tileSize: number;
  maxLevel: number;
  imageScale?: number;
  useTransparentBackground?: boolean;
}): boolean {
  const {
    ctx,
    tile,
    orientation,
    cache,
    cacheKeyPrefix,
    surface,
    seqNo,
    tileX,
    tileY,
    tileSize,
    maxLevel,
    imageScale,
    useTransparentBackground = true,
  } = params;

  const scaleSuffix =
    typeof imageScale === "number" ? `-s${imageScale}` : "";
  for (let fallbackLevel = tile.level + 1; fallbackLevel <= maxLevel; fallbackLevel += 1) {
    const delta = fallbackLevel - tile.level;
    const factor = 2 ** delta;
    const fallbackX = Math.floor(tileX / factor);
    const fallbackY = Math.floor(tileY / factor);
    const cacheKey = `${cacheKeyPrefix}-${surface}-${seqNo}-${fallbackLevel}-${fallbackX}-${fallbackY}-${tileSize}${scaleSuffix}`;
    const img = cache.get(cacheKey);
    if (!img || !img.complete) continue;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (imgW <= 0 || imgH <= 0) continue;

    const subW = imgW / factor;
    const subH = imgH / factor;
    const offsetX = (tileX % factor) * subW;
    const offsetY = (tileY % factor) * subH;
    const srcW = Math.max(1, Math.min(subW, imgW - offsetX));
    const srcH = Math.max(1, Math.min(subH, imgH - offsetY));

    // 在非测试模式下，使用透明背景避免闪烁
    if (useTransparentBackground) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      drawTileImage({
        ctx,
        img,
        tile,
        orientation,
        source: { x: offsetX, y: offsetY, width: srcW, height: srcH },
      });
      ctx.restore();
    } else {
      drawTileImage({
        ctx,
        img,
        tile,
        orientation,
        source: { x: offsetX, y: offsetY, width: srcW, height: srcH },
      });
    }
    return true;
  }

  return false;
}
