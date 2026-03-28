import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { env } from "../config/env";
import type {
  Defect,
  SteelPlate,
  ImageOrientation,
} from "../types/app.types";
import type { SurfaceImageInfo } from "../api/types";
import { getTileImageUrl } from "../api/client";
import { LargeImageViewer } from "./LargeImageViewer/LargeImageViewer";
import type { Tile } from "./LargeImageViewer/utils";
import {
  buildOrientationLayout,
  pickSurfaceForTile,
  computeTileRequestInfo,
  convertDefectToWorldRect,
  type SurfaceLayout,
} from "../utils/imageOrientation";
import { drawTileImage, tryDrawFallbackTile } from "../utils/tileFallback";

const tileImageCache = new Map<string, HTMLImageElement>();
const tileImageLoading = new Set<string>();
const PAN_MARGIN = 200;
const SURFACE_GAP = 32;

export interface ViewportInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DefectImageViewProps {
  selectedPlate: SteelPlate | undefined;
  defects: Defect[];
  viewerSurface: "top" | "bottom";
  imageViewMode: "full" | "single";
  selectedDefectId: string | null;
  selectedDefectSurface?: "top" | "bottom" | null;
  onDefectSelect: (id: string | null) => void;
  onDefectHover?: (defect: Defect, position: { screenX: number; screenY: number }) => void;
  onDefectHoverEnd?: () => void;
  surfaceImageInfo?: SurfaceImageInfo[] | null;
  onViewportChange?: (info: ViewportInfo | null) => void;
  centerTarget?: { x: number; y: number } | null;
  imageOrientation: ImageOrientation;
  defaultTileSize: number;
  maxTileLevel: number;
}

interface WorldDefectRect {
  defect: Defect;
  surface: SurfaceLayout;
  rect: { x: number; y: number; width: number; height: number };
}

export function DefectImageView({
  selectedPlate,
  defects,
  viewerSurface,
  imageViewMode,
  selectedDefectId,
  selectedDefectSurface,
  onDefectSelect,
  onDefectHover,
  onDefectHoverEnd,
  surfaceImageInfo,
  onViewportChange,
  centerTarget,
  imageOrientation,
  defaultTileSize,
  maxTileLevel,
}: DefectImageViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [cursor, setCursor] = useState("grab");

  // 节流相关的 refs
  const lastRunRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seqNo = useMemo(() => {
    if (!selectedPlate) return null;
    const parsed = parseInt(selectedPlate.serialNumber, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [selectedPlate]);

  const topMeta = surfaceImageInfo?.find((info) => info.surface === "top");
  const bottomMeta = surfaceImageInfo?.find(
    (info) => info.surface === "bottom",
  );
  const viewerTileSize = useMemo(() => {
    return Math.max(
      topMeta?.image_height ?? 0,
      bottomMeta?.image_height ?? 0,
      defaultTileSize,
      512,
    );
  }, [topMeta, bottomMeta, defaultTileSize]);
  const layout = useMemo(() => {
    const surfaceGap = SURFACE_GAP;
    return buildOrientationLayout({
      orientation: imageOrientation,
      surfaceFilter: viewerSurface,
      topMeta,
      bottomMeta,
      surfaceGap,
    });
  }, [
    imageOrientation,
    viewerSurface,
    topMeta,
    bottomMeta,
    viewerTileSize,
  ]);

  const selectedDefect = useMemo(
    () =>
      selectedDefectId
        ? defects.find(
            (item) =>
              item.id === selectedDefectId &&
              (selectedDefectSurface ? item.surface === selectedDefectSurface : true),
          ) ?? null
        : null,
    [defects, selectedDefectId, selectedDefectSurface],
  );

  const worldDefectRects = useMemo<WorldDefectRect[]>(() => {
    if (layout.surfaces.length === 0) return [];
    return defects
      .map((defect) => {
        const surfaceLayout = layout.surfaces.find(
          (s) => s.surface === defect.surface,
        );
        if (!surfaceLayout) {
          return null;
        }
        const rect = convertDefectToWorldRect({
          surface: surfaceLayout,
          defect,
          orientation: imageOrientation,
        });
        if (!rect) return null;
        return { defect, surface: surfaceLayout, rect };
      })
      .filter(
        (
          item,
        ): item is {
          defect: Defect;
          surface: SurfaceLayout;
          rect: { x: number; y: number; width: number; height: number };
        } => item !== null,
      );
  }, [defects, layout, imageOrientation]);

  const hitTestDefect = useCallback(
    (worldX: number, worldY: number) => {
      for (const item of worldDefectRects) {
        const rect = item.rect;
        if (
          worldX >= rect.x &&
          worldX <= rect.x + rect.width &&
          worldY >= rect.y &&
          worldY <= rect.y + rect.height
        ) {
          return item.defect;
        }
      }
      return null;
    },
    [worldDefectRects],
  );

  useEffect(() => {
    onViewportChange?.(null);
  }, [onViewportChange]);

  const focusTarget = useMemo(() => {
    if (
      imageViewMode !== "full" ||
      !selectedDefectId ||
      worldDefectRects.length === 0
    ) {
      return null;
    }
    const target = worldDefectRects.find(
      (item) =>
        item.defect.id === selectedDefectId &&
        (selectedDefectSurface ? item.defect.surface === selectedDefectSurface : true),
    );
    if (!target) return null;
    const padding =
      Math.max(target.rect.width, target.rect.height, 100) * 1.5;
    return {
      x: Math.max(target.surface.offsetX, target.rect.x - padding),
      y: Math.max(target.surface.offsetY, target.rect.y - padding),
      width: target.rect.width + padding * 2,
      height: target.rect.height + padding * 2,
    };
  }, [imageViewMode, selectedDefectId, selectedDefectSurface, worldDefectRects]);

  useEffect(() => {
    if (
      imageViewMode === "single" &&
      !selectedDefectId &&
      defects.length > 0
    ) {
      onDefectSelect(defects[0].id);
    }
  }, [imageViewMode, selectedDefectId, defects, onDefectSelect]);

  useEffect(() => {
    if (imageViewMode !== "single") {
      setImageUrl(null);
      setImageError(null);
      setIsLoadingImage(false);
      return;
    }
    if (!selectedDefect || seqNo == null) {
      setImageUrl(null);
      setImageError(null);
      setIsLoadingImage(false);
      return;
    }
    if (typeof selectedDefect.imageIndex !== "number") {
      setImageError("缺陷缺少 imageIndex，无法裁剪");
      setImageUrl(null);
      setIsLoadingImage(false);
      return;
    }
    const baseUrl = env.getApiBaseUrl();
    const padding = Math.round(
      Math.max(selectedDefect.width, selectedDefect.height) * 0.5,
    );
    const params = new URLSearchParams({
      surface: selectedDefect.surface,
      seq_no: String(seqNo),
      image_index: String(selectedDefect.imageIndex),
      x: Math.max(0, Math.floor(selectedDefect.x - padding)).toString(),
      y: Math.max(0, Math.floor(selectedDefect.y - padding)).toString(),
      w: Math.ceil(selectedDefect.width + padding * 2).toString(),
      h: Math.ceil(selectedDefect.height + padding * 2).toString(),
      fmt: "JPEG",
    });
    params.set("scale", env.getImageScale().toString());
    const url = `${baseUrl}/images/crop?${params.toString()}`;
    setIsLoadingImage(true);
    setImageError(null);
    setImageUrl(url);
  }, [imageViewMode, selectedDefect, seqNo]);

  const renderTile = useCallback(
    (ctx: CanvasRenderingContext2D, tile: Tile, tileSizeArg: number, scale: number) => {
      if (seqNo == null || layout.surfaces.length === 0) {
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        return;
      }

      const surfaceLayout = pickSurfaceForTile(layout, tile);
      if (!surfaceLayout) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        return;
      }

      const virtualTileSize =
        tileSizeArg * Math.pow(2, tile.level);
      const requestInfo = computeTileRequestInfo({
        surface: surfaceLayout,
        tile,
        orientation: imageOrientation,
        virtualTileSize,
        tileSize: tileSizeArg,
      });
      if (!requestInfo) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        return;
      }

      const imageScale = env.getImageScale();
      const cacheKey = `${imageOrientation}-${surfaceLayout.surface}-${seqNo}-${tile.level}-${requestInfo.tileX}-${requestInfo.tileY}-${tileSizeArg}-s${imageScale}`;
      const cached = tileImageCache.get(cacheKey);
      const url = getTileImageUrl({
        surface: surfaceLayout.surface,
        seqNo,
        level: tile.level,
        tileX: requestInfo.tileX,
        tileY: requestInfo.tileY,
        tileSize: tileSizeArg,
        fmt: "JPEG",
      });

      // 首先尝试用低层级的瓦片撑场面
      const drewFallback = tryDrawFallbackTile({
        ctx,
        tile,
        orientation: imageOrientation,
        cache: tileImageCache,
        cacheKeyPrefix: imageOrientation,
        surface: surfaceLayout.surface,
        seqNo,
        tileX: requestInfo.tileX,
        tileY: requestInfo.tileY,
        tileSize: tileSizeArg,
        maxLevel: maxTileLevel,
        imageScale,
        useTransparentBackground: false,
      });

      // 如果当前层级的瓦片已经加载完成，覆盖 fallback
      if (cached && cached.complete) {
        drawTileImage({
          ctx,
          img: cached,
          tile,
          orientation: imageOrientation,
        });
      } else {
        // 当前层级瓦片未加载，开始加载
        if (!tileImageLoading.has(cacheKey)) {
          tileImageLoading.add(cacheKey);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            tileImageCache.set(cacheKey, img);
            tileImageLoading.delete(cacheKey);
          };
          img.onerror = () => {
            tileImageLoading.delete(cacheKey);
          };
        }

        // 如果没有 fallback 可用，显示占位符
        if (!drewFallback) {
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
          ctx.strokeStyle = "#cbd5f5";
          ctx.lineWidth = 1 / scale;
          ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
        }
      }

      const severityColor = (severity: Defect["severity"]) => {
        switch (severity) {
          case "high":
            return "#ef4444";
          case "medium":
            return "#f97316";
          default:
            return "#22c55e";
        }
      };

      const defectsInTile = worldDefectRects.filter((item) => {
        if (item.surface.surface !== surfaceLayout.surface) {
          return false;
        }
        const { rect } = item;
        return !(
          rect.x + rect.width < tile.x ||
          rect.x > tile.x + tile.width ||
          rect.y + rect.height < tile.y ||
          rect.y > tile.y + tile.height
        );
      });

      defectsInTile.forEach(({ defect, rect }) => {
        ctx.strokeStyle = severityColor(defect.severity);
        ctx.lineWidth =
          defect.id === selectedDefectId &&
          (selectedDefectSurface ? defect.surface === selectedDefectSurface : true)
            ? 3 / scale
            : 1.5 / scale;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        if (scale > 0.4) {
          ctx.save();
          ctx.translate(rect.x + 4, rect.y + 4);
          const labelScale = 1 / scale;
          ctx.scale(labelScale, labelScale);
          ctx.font = "10px 'Consolas', sans-serif";
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fillText(defect.type, 0, 10);
          ctx.restore();
        }
      });
    },
    [layout, seqNo, imageOrientation, worldDefectRects, selectedDefectId, selectedDefectSurface],
  );

  const renderOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      layout.surfaces.forEach((surfaceLayout) => {
        const stroke =
          surfaceLayout.surface === "top" ? "#0284c7" : "#f97316";
        ctx.save();
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = stroke;
        ctx.setLineDash([12 / scale, 6 / scale]);
        ctx.strokeRect(
          surfaceLayout.offsetX,
          surfaceLayout.offsetY,
          surfaceLayout.worldWidth,
          surfaceLayout.worldHeight,
        );
        ctx.setLineDash([]);

        ctx.translate(
          surfaceLayout.offsetX + 12 / scale,
          surfaceLayout.offsetY + 16 / scale,
        );
        const labelScale = 1 / scale;
        ctx.scale(labelScale, labelScale);
        ctx.font = "bold 12px 'Consolas', sans-serif";
        ctx.fillStyle = stroke;
        ctx.fillText(
          surfaceLayout.surface === "top"
            ? "上表"
            : "下表",
          0,
          0,
        );
        ctx.restore();
      });
    },
    [layout],
  );

  // 节流处理 onPointerMove，避免频繁触发
  // 必须在所有条件返回之前调用，确保每次渲染 hooks 数量一致
  const throttledOnPointerMove = useCallback(
    (info: { worldX: number; worldY: number; screenX: number; screenY: number }) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;
      const delay = 50; // 50ms 节流间隔

      const handlePointerMove = () => {
        const hit = hitTestDefect(info.worldX, info.worldY);
        setCursor(hit ? "pointer" : "grab");
        if (hit && onDefectHover) {
          onDefectHover(hit, { screenX: info.screenX, screenY: info.screenY });
        } else {
          onDefectHoverEnd?.();
        }
      };

      if (timeSinceLastRun >= delay) {
        // 如果已经过了节流间隔，立即执行
        lastRunRef.current = now;
        handlePointerMove();
      } else {
        // 否则在剩余延迟后执行
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const remainingDelay = delay - timeSinceLastRun;
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          handlePointerMove();
        }, remainingDelay);
      }
    },
    [hitTestDefect, onDefectHover, onDefectHoverEnd],
  );

  if (imageViewMode === "single") {
    if (imageError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-destructive">
          <AlertCircle className="w-16 h-16 opacity-50" />
          <p className="text-sm">{imageError}</p>
        </div>
      );
    }
    if (!imageUrl) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <AlertCircle className="w-16 h-16 opacity-50" />
          <p className="text-sm">请选择一个缺陷以查看裁剪图</p>
        </div>
      );
    }
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 p-4">
        {isLoadingImage && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/40 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm">加载缺陷裁剪图像...</p>
          </div>
        )}
        <img
          src={imageUrl}
          alt="缺陷裁剪图"
          className="max-w-full max-h-full object-contain border border-border rounded shadow-lg"
          onLoad={() => setIsLoadingImage(false)}
          onError={() => {
            setIsLoadingImage(false);
            setImageError("缺陷裁剪图加载失败");
          }}
        />
        {selectedDefect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
            <div className="w-full max-w-md bg-black/70 text-white text-xs p-3 rounded border border-white/10 shadow-lg">
              <div className="flex flex-wrap gap-3 justify-between">
                <span className="font-semibold">{selectedDefect.type}</span>
                <span>
                  置信度: {(selectedDefect.confidence * 100).toFixed(1)}%
                </span>
                <span>
                  尺寸: {selectedDefect.width.toFixed(0)}×
                  {selectedDefect.height.toFixed(0)}
                </span>
                <span>
                  位置: ({selectedDefect.x.toFixed(0)},
                  {selectedDefect.y.toFixed(0)})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (seqNo == null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground h-full">
        <AlertCircle className="w-16 h-16 opacity-50" />
        <p className="text-sm">请选择左侧钢板以加载大图</p>
      </div>
    );
  }

  if (layout.surfaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground h-full">
        <AlertCircle className="w-16 h-16 opacity-50" />
        <p className="text-sm">缺少图像元数据或当前筛选无可用表面</p>
      </div>
    );
  }

  return (
    <LargeImageViewer
      imageWidth={layout.worldWidth}
      imageHeight={layout.worldHeight}
      tileSize={viewerTileSize}
      className="bg-slate-900/80"
      initialScale={1}
      maxLevel={maxTileLevel}
      prefetchMargin={400}
      renderTile={renderTile}
      renderOverlay={renderOverlay}
      focusTarget={focusTarget}
      centerTarget={centerTarget ?? null}
      onViewportChange={(info) => onViewportChange?.(info)}
      onPointerMove={throttledOnPointerMove}
      onPointerLeave={() => {
        setCursor("grab");
        onDefectHoverEnd?.();
      }}
      cursor={cursor}
      panMargin={PAN_MARGIN}
      fitToHeight={imageOrientation === "vertical"}
    />
  );
}
