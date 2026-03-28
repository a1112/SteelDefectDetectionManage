import type { Defect, SteelPlate, ImageOrientation } from "../types/app.types";
import type { SurfaceImageInfo } from "../api/types";
import { LargeImageViewer } from "../components/LargeImageViewer/LargeImageViewer";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  buildOrientationLayout,
  pickSurfaceForTile,
  computeTileRequestInfo,
  convertDefectToWorldRect,
  type SurfaceLayout,
} from "../utils/imageOrientation";
import { getTileImageUrl } from "../api/client";
import { env } from "../config/env";
import { drawTileImage, tryDrawFallbackTile } from "../utils/tileFallback";
import type { Tile } from "../components/LargeImageViewer/utils";

// 实时更新导入
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { getOrCreateLRUCache } from "../utils/lruImageCache";

// 使用 LRU 缓存，限制最大缓存数量防止内存泄漏
const tileImageCache = getOrCreateLRUCache("ImagesTab", 500);
const tileImageLoading = new Set<string>();

interface ImagesTabProps {
  selectedPlateId: string | null;
  steelPlates: SteelPlate[];
  surfaceImageInfo: SurfaceImageInfo[] | null;
  surfaceFilter: "all" | "top" | "bottom";
  imageOrientation: ImageOrientation;
  plateDefects: Defect[];
  selectedDefectId: string | null;
  activeTileLevel: number;
  onPreferredLevelChange: (level: number) => void;
  defaultTileSize: number;
  maxTileLevel: number;
  lineKey?: string | null;
  defectClasses?: { id: number; name: string; color?: string }[];
  onDefectHover?: (defect: Defect, position: { screenX: number; screenY: number }) => void;
  onDefectHoverEnd?: () => void;
  onNewDataDetected?: (latestSeqNo: number) => void; // 新增：新数据检测回调
}

export function ImagesTab({
  selectedPlateId,
  steelPlates,
  surfaceImageInfo,
  surfaceFilter,
  imageOrientation,
  plateDefects,
  selectedDefectId,
  activeTileLevel,
  onPreferredLevelChange,
  defaultTileSize,
  maxTileLevel,
  lineKey,
  defectClasses = [],
  onDefectHover,
  onDefectHoverEnd,
}: ImagesTabProps) {
  const [hoveredDefect, setHoveredDefect] = useState<Defect | null>(null);
  const [cursor, setCursor] = useState("grab");
  const selectedPlate = useMemo(
    () =>
      selectedPlateId
        ? steelPlates.find((plate) => plate.serialNumber === selectedPlateId)
        : undefined,
    [selectedPlateId, steelPlates],
  );
  
  // 实时更新相关状态
  const [realtimeEnabled, setRealtimeEnabled] = useState(env.isProduction());
  const [autoScrollLatest, setAutoScrollLatest] = useState(true);
  const [newDataNotification, setNewDataNotification] = useState<{
    show: boolean;
    seqNo: number;
  }>({ show: false, seqNo: 0 });
  
  const viewerRef = useRef<any>(null);
  const realtimeCheckTimerRef = useRef<number | null>(null);
  
  // 获取当前卷的总瓦片数
  const getTileCountForLevel = useCallback((
    level: number,
    imageInfo: any
  ): number => {
    if (!imageInfo || !selectedPlate) return 0;
    
    const imageHeight = Math.max(
      imageInfo[0]?.image_height ?? 0,
      imageInfo[1]?.image_height ?? 0,
    1024,
    512,
    defaultTileSize,
    );
    
    const tileWidth = defaultTileSize;
    const tileHeight = defaultTileSize;
    
    // 计算总瓦片数
    const worldWidth = selectedPlate.dimensions.width;
    const worldHeight = imageHeight;
    const tilesX = Math.ceil(worldWidth / tileWidth);
    const tilesY = Math.ceil(worldHeight / tileHeight);
    const totalTiles = tilesX * tilesY * Math.pow(4, level);
    
    return totalTiles;
  }, [selectedPlate, defaultTileSize]);
  
  // 实时更新Hook
  const {
    isUpdating,
    hasNewData,
    manualCheck,
    toggleRealtimeUpdates,
    selectLatestVolume,
    scrollToLastTile,
    alignTilesAtLevel,
  } = useRealtimeUpdates({
    enabled: realtimeEnabled,
    updateInterval: 5000,
    autoSelectLatest: true,
    autoScrollToEnd: autoScrollLatest,
    onNewDataDetected: (latestSeqNo: number, tileCount: number) => {
      setNewDataNotification({ show: true, seqNo: latestSeqNo });
      console.log(`🚀 检测到新数据: 序号 ${latestSeqNo}, 瓦片数 ${tileCount}`);

      // 如果当前选择的不是最新卷，自动选择最新卷
      if (selectedPlate) {
        const currentSeqNo = parseInt(selectedPlate.serialNumber, 10);
        if (currentSeqNo < latestSeqNo) {
          console.log(`🎯 自动选择最新卷: ${currentSeqNo} → ${latestSeqNo}`);
          // 这里需要触发父组件的选择变更
          // 由于ImagesTab没有setSelectedPlateId的权限，需要通过回调实现
          if (onNewDataDetected) {
            onNewDataDetected(latestSeqNo);
          }
        }
      }
    },
  });

  // 实时更新定时器管理（将 useEffect 从 JSX 中移出）
  useEffect(() => {
    if (!env.isProduction() || !realtimeEnabled) {
      // 清理任何现有定时器
      if (realtimeCheckTimerRef.current !== null) {
        window.clearInterval(realtimeCheckTimerRef.current);
        realtimeCheckTimerRef.current = null;
      }
      return;
    }

    console.log("🚀 启动实时更新功能");

    // 清理之前的定时器（如果存在）
    if (realtimeCheckTimerRef.current !== null) {
      window.clearInterval(realtimeCheckTimerRef.current);
    }

    // 启动新的定时器
    const cancelled = { current: false };
    realtimeCheckTimerRef.current = window.setInterval(async () => {
      if (cancelled.current) return;
      await manualCheck();
    }, 5000);

    console.log("✅ 实时更新已启动");

    // 清理函数
    return () => {
      cancelled.current = true;
      if (realtimeCheckTimerRef.current !== null) {
        window.clearInterval(realtimeCheckTimerRef.current);
        realtimeCheckTimerRef.current = null;
        console.log("🛑 实时更新已停止");
      }
    };
  }, [realtimeEnabled, manualCheck]);

  const plateWidth = selectedPlate?.dimensions.width ?? 0;
  const plateLength = selectedPlate?.dimensions.length ?? 0;
  const distLeft = hoveredDefect ? Math.round(hoveredDefect.x) : null;

  const annotationContext = selectedPlate
    ? {
        lineKey: lineKey || "default",
        seqNo: parseInt(selectedPlate.serialNumber, 10),
        view: "2D",
      }
    : null;
  const distHead = hoveredDefect ? Math.round(hoveredDefect.y) : null;
  const distRight =
    hoveredDefect && plateWidth > 0
      ? Math.max(0, Math.round(plateWidth - (hoveredDefect.x + hoveredDefect.width)))
      : null;
  const distTail =
    hoveredDefect && plateLength > 0
      ? Math.max(0, Math.round(plateLength - (hoveredDefect.y + hoveredDefect.height)))
      : null;

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
        <span>缺陷信息栏</span>
        {hoveredDefect ? (
          <span className="text-[11px] font-mono">
            {hoveredDefect.type} | {hoveredDefect.surface === "top" ? "上表" : "下表"} | ID: {hoveredDefect.id} | 距头:{distHead} 距尾:{distTail ?? "--"} 距左:{distLeft} 距右:{distRight ?? "--"}
          </span>
        ) : (
          <span className="text-[11px] font-mono">--</span>
        )}
        <span className="font-mono">当前瓦片等级: L{activeTileLevel}</span>
        {realtimeEnabled && hasNewData && newDataNotification.show && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-sm animate-pulse">
            <span className="text-[11px] font-medium text-blue-600">
              🚀 检测到新卷 #{newDataNotification.seqNo}
            </span>
            <button
              onClick={() => {
                setNewDataNotification({ show: false, seqNo: 0 });
                onNewDataDetected?.(newDataNotification.seqNo);
              }}
              className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              选择最新卷
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 bg-card border border-border relative">
        {(() => {
          if (!selectedPlate) {
            return (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                请在左侧选择钢板以查看长带图像
              </div>
            );
          }
          if (!surfaceImageInfo || surfaceImageInfo.length === 0) {
            return (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                当前钢板尚无图像元数据（surface_images 为空）
              </div>
            );
          }
          const seqNo = parseInt(selectedPlate.serialNumber, 10);
          if (Number.isNaN(seqNo)) {
            return (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                无法解析流水号，无法请求图像
              </div>
            );
          }
          const topMeta = surfaceImageInfo.find(
            (info) => info.surface === "top",
          );
          const bottomMeta = surfaceImageInfo.find(
            (info) => info.surface === "bottom",
          );
          const viewerTileSize = Math.max(
            topMeta?.image_height ?? 0,
            bottomMeta?.image_height ?? 0,
            defaultTileSize,
            512,
          );
          let surfaceGap = 0;
          if (
            imageOrientation === "vertical" &&
            surfaceFilter === "all" &&
            topMeta &&
            bottomMeta
          ) {
            const topWidth = topMeta.image_width ?? 0;
            const tileWidth = viewerTileSize;
            surfaceGap = Math.max(
              0,
              Math.ceil(topWidth / tileWidth) * tileWidth - topWidth,
            );
          }
          const layout = buildOrientationLayout({
            orientation: imageOrientation,
            surfaceFilter,
            topMeta,
            bottomMeta,
            surfaceGap,
          });
          if (layout.surfaces.length === 0) {
            return (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                无法构建图像布局，请检查表面配置
              </div>
            );
          }
          const defectWorldRects = plateDefects
            .map((defect) => {
              const surfaceLayout = layout.surfaces.find(
                (surface) => surface.surface === defect.surface,
              );
              if (!surfaceLayout) {
                return null;
              }
              const rect = convertDefectToWorldRect({
                surface: surfaceLayout,
                defect,
                orientation: imageOrientation,
              });
              if (!rect) {
                return null;
              }
              return {
                defect,
                surface: surfaceLayout,
                rect,
              };
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
          const hitTestDefect = (worldX: number, worldY: number) => {
            for (const item of defectWorldRects) {
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
          };
          const resolveAnnotationMeta = (rect: {
            x: number;
            y: number;
            width: number;
            height: number;
          }) => {
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const surfaceLayout =
              layout.surfaces.find(
                (surface) =>
                  centerX >= surface.offsetX &&
                  centerX < surface.offsetX + surface.worldWidth &&
                  centerY >= surface.offsetY &&
                  centerY < surface.offsetY + surface.worldHeight,
              ) ?? null;
            if (!surfaceLayout) return null;
            return {
              surface: surfaceLayout.surface,
              view: "2D",
              left: Math.round(rect.x),
              top: Math.round(rect.y),
              right: Math.round(rect.x + rect.width),
              bottom: Math.round(rect.y + rect.height),
            };
          };
          const renderTile = (
            ctx: CanvasRenderingContext2D,
            tile: Tile,
            tileSizeArg: number,
            scale: number,
          ) => {
            const surfaceLayout = pickSurfaceForTile(layout, tile);
            if (!surfaceLayout) {
              ctx.fillStyle = "#0b1220";
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
              ctx.fillStyle = "#0b1220";
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
                ctx.fillStyle = "#0b1220";
                ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
                ctx.strokeStyle = "#1f2937";
                ctx.lineWidth = 1 / scale;
                ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
              }
            }
            const defectsInTile = defectWorldRects.filter((item) => {
              const { rect, surface } = item;
              if (surface.surface !== surfaceLayout.surface) {
                return false;
              }
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
                defect.id === selectedDefectId ? 3 / scale : 1.5 / scale;
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
          };
          const renderOverlay = (
            ctx: CanvasRenderingContext2D,
            scale: number,
          ) => {
            layout.surfaces.forEach((surfaceLayout) => {
              const stroke =
                surfaceLayout.surface === "top"
                  ? "#0ea5e9"
                  : "#f97316";
              ctx.save();
              ctx.lineWidth = 3 / scale;
              ctx.strokeStyle = stroke;
              ctx.setLineDash([10 / scale, 6 / scale]);
              ctx.strokeRect(
                surfaceLayout.offsetX,
                surfaceLayout.offsetY,
                surfaceLayout.worldWidth,
                surfaceLayout.worldHeight,
              );
              ctx.setLineDash([]);
              ctx.translate(
                surfaceLayout.offsetX + 12 / scale,
                surfaceLayout.offsetY + 18 / scale,
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
          };
          return (
            <LargeImageViewer
              imageWidth={layout.worldWidth}
              imageHeight={layout.worldHeight}
              tileSize={viewerTileSize}
              className="bg-[#0d1117]"
              maxLevel={maxTileLevel}
              prefetchMargin={400}
              onPreferredLevelChange={onPreferredLevelChange}
              renderTile={renderTile}
              renderOverlay={renderOverlay}
              panMargin={200}
              annotationContext={annotationContext}
              resolveAnnotationMeta={resolveAnnotationMeta}
              defectClasses={defectClasses}
              cursor={cursor}
              onPointerMove={(info) => {
                const hit = hitTestDefect(info.worldX, info.worldY);
                setCursor(hit ? "pointer" : "grab");
                if (hit) {
                  setHoveredDefect(hit);
                  if (activeTileLevel > 1) {
                    onDefectHover?.(hit, {
                      screenX: info.screenX,
                      screenY: info.screenY,
                    });
                  } else {
                    onDefectHoverEnd?.();
                  }
                } else {
                  setHoveredDefect(null);
                  onDefectHoverEnd?.();
                }
              }}
              onPointerLeave={() => {
                setCursor("grab");
                setHoveredDefect(null);
                onDefectHoverEnd?.();
              }}
            />
          );
         })()}
      </div>
    </div>
  );
}
