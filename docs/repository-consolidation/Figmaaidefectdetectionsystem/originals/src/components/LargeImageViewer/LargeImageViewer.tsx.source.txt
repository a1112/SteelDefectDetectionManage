import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createDefectAnnotationsBulk,
  deleteDefectAnnotation,
  getDefectAnnotations,
  updateDefectAnnotation,
} from '../../api/client';
import type { DefectAnnotationCreate } from '../../api/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { clamp, getVisibleTiles, Size, Point, Tile } from './utils';
import { globalPreheatManager } from '../../utils/tilePreheatManager';
import type { Surface } from '../../api/types';

type AnnotationSurface = "top" | "bottom";

type AnnotationRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnnotationMeta = {
  surface: AnnotationSurface;
  view: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type DefectClassOption = {
  id: number;
  name: string;
  color?: string;
};

type ClassPickerTarget = {
  type: "default" | "new" | "edit";
  markId?: string;
};

interface LargeImageViewerProps {
  imageWidth: number;
  imageHeight: number;
  tileSize?: number;
  className?: string;
  maxLevel?: number;
  /**
   * 预加载视口外瓦片的距离（屏幕像素）。例如 400 表示在视口外 400px 内的瓦片也会被请求。
   */
  prefetchMargin?: number;
  /**
   * Initial zoom scale: use 'fit' to fit viewport (default), or a number (e.g. 1 for 100%).
   */
  initialScale?: number | 'fit';
  /**
   * 固定瓦片等级（0/1/2）；如果不传则根据缩放自动计算
   */
  fixedLevel?: number;
  /**
   * 当根据缩放计算出的推荐瓦片等级发生变化时回调（用于上层实现"双图层"或延迟切换 LOD）
   */
  onPreferredLevelChange?: (level: number) => void;
  renderTile?: (
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    tileSize: number,
    scale: number
  ) => void;
  /**
   * 在所有瓦片绘制完成后调用，用于绘制额外的覆盖层（如边框、标注等）
   */
  renderOverlay?: (
    ctx: CanvasRenderingContext2D,
    scale: number
  ) => void;
  /**
   * 聚焦目标：传入一个区域，视图会自动平移和缩放到该区域
   */
  focusTarget?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /**
   * 限制在图像边缘外还能多移动的像素（避免看见超出范围的区域）
   */
  /**
   * Pan Target - keep current zoom, only move the viewport center to the given world position.
   */
  centerTarget?: { x: number; y: number } | null;
  /**
   * Emits the current visible world-rect (for minimap / bird's-eye overlays).
   */
  onViewportChange?: (info: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  panMargin?: number;
  /**
   * 纵向布局时优先按照高度填充视口（避免将宽度过度压缩）
   */
  fitToHeight?: boolean;
  /**
   * 按容器宽度填充视口（锁定宽度比例）
   */
  fitToWidth?: boolean;
  /**
   * 是否锁定缩放（禁用缩放，仅允许平移）
   */
  lockScale?: boolean;
  /**
   * 鼠标滚轮行为：缩放或滚动
   */
  wheelMode?: "zoom" | "scroll";
  /**
   * 强制缩放比例（用于同步锁定）
   */
  forcedScale?: number | null;
  /**
   * 输出当前变换信息（缩放 + 偏移）
   */
  onTransformChange?: (info: { x: number; y: number; scale: number }) => void;
  /**
   * 传入鼠标指针样式（例如 pointer / grab）
   */
  cursor?: string;
  /**
   * 鼠标移动时输出世界坐标
   */
  onPointerMove?: (info: {
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
    scale: number;
  }) => void;
  /**
   * 鼠标移出画布
   */
  onPointerLeave?: () => void;
  /**
   * 鼠标按下（返回 true 表示阻止拖拽）
   */
  onPointerDown?: (info: {
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
    scale: number;
  }) => boolean | void;
  annotationContext?: {
    lineKey: string;
    seqNo: number;
    view: string;
    user?: string | null;
  } | null;
  resolveAnnotationMeta?: (rect: AnnotationRect) => AnnotationMeta | null;
  defectClasses?: DefectClassOption[];
}

export const LargeImageViewer: React.FC<LargeImageViewerProps> = ({
  imageWidth,
  imageHeight,
  tileSize = 256,
  className,
  maxLevel: maxLevelProp,
  prefetchMargin = 0,
  initialScale = 'fit',
  fixedLevel,
  onPreferredLevelChange,
  renderTile,
  renderOverlay,
  focusTarget,
  centerTarget,
  onViewportChange,
  panMargin,
  fitToHeight,
  fitToWidth,
  lockScale = false,
  wheelMode = "zoom",
  forcedScale,
  onTransformChange,
  cursor,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  annotationContext,
  resolveAnnotationMeta,
  defectClasses = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // 双 canvas：底层保留上一轮内容，顶层用于当前绘制（便于后续扩展双 LOD 图层）
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // State stored in refs for high-performance animation loop without re-renders
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMousePosition = useRef<Point>({ x: 0, y: 0 });
  
  // 瓦片预热相关状态
  const lastPreheatTime = useRef(0);
  const preheatThrottle = 300; // 300ms节流
  const zoomAnimRef = useRef<number | null>(null);
  const drawingRef = useRef<{
    mode: "measure" | "mark";
    start: Point;
    end: Point;
  } | null>(null);
  const editActionRef = useRef<{
    type: "move" | "resize";
    markId: string;
    start: Point;
    origin: AnnotationRect;
    handle?: "nw" | "ne" | "sw" | "se";
  } | null>(null);
  
  // Container size state
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });

  // 瓦片预热函数
  const triggerTilePreheat = useCallback((
    tiles: Tile[],
    scale: number,
    visibleRect: { x: number; y: number; width: number; height: number }
  ) => {
    const now = Date.now();
    if (now - lastPreheatTime.current < preheatThrottle) {
      return;
    }
    lastPreheatTime.current = now;

    // 记录用户行为
    const actionType = isDragging.current ? 'drag' : 'idle';
    globalPreheatManager.recordUserAction({
      type: actionType,
      viewport: {
        x: visibleRect.x,
        y: visibleRect.y,
        width: visibleRect.width,
        height: visibleRect.height,
        scale: scale,
      },
      timestamp: now,
    });

    // 异步触发瓦片预热
    setTimeout(() => {
      // 转换瓦片格式
      const tileInfos = tiles.map(tile => ({
        level: tile.level,
        tileX: tile.col,
        tileY: tile.row,
        tileSize: tileSize,
      }));

      // 获取surface和seqNo信息（从annotationContext推断）
      const surface = annotationContext?.lineKey?.includes('top') ? 'top' : 'bottom';
      const seqNo = annotationContext?.seqNo || 0;

      if (seqNo > 0) {
        globalPreheatManager.preheatFromVisibleTiles({
          surface: surface as Surface,
          seqNo: seqNo,
          visibleTiles: tileInfos,
          view: annotationContext?.view,
        }).catch(error => {
          console.warn('Tile preheat failed:', error);
        });
      }
    }, 100); // 延迟100ms执行，避免影响渲染
  }, [annotationContext, tileSize, preheatThrottle, globalPreheatManager]);

  // 缩放时预热指定层级的瓦片
  const triggerTilePreheatForLevel = useCallback((targetLevel: number) => {
    const surface = annotationContext?.lineKey?.includes('top') ? 'top' : 'bottom';
    const seqNo = annotationContext?.seqNo || 0;

    if (seqNo <= 0) return;

    // 计算当前视口对应的世界坐标区域
    const { x, y, scale } = transform.current;
    const viewX = -x / scale;
    const viewY = -y / scale;
    const viewW = containerSize.width / scale;
    const viewH = containerSize.height / scale;

    // 计算目标层级的虚拟瓦片大小
    const virtualTileSize = tileSize * Math.pow(2, targetLevel);

    // 计算目标层级下视口覆盖的瓦片范围
    const startCol = Math.floor(viewX / virtualTileSize);
    const startRow = Math.floor(viewY / virtualTileSize);
    const endCol = Math.ceil((viewX + viewW) / virtualTileSize);
    const endRow = Math.ceil((viewY + viewH) / virtualTileSize);

    // 预热范围扩大一些，提供更好的体验
    const padding = 1;
    const tiles: TileInfo[] = [];

    for (let row = startRow - padding; row <= endRow + padding; row++) {
      for (let col = startCol - padding; col <= endCol + padding; col++) {
        if (row < 0 || col < 0) continue;
        tiles.push({
          level: targetLevel,
          tileX: col,
          tileY: row,
          tileSize: tileSize,
        });
      }
    }

    if (tiles.length > 0) {
      globalPreheatManager.preheatFromVisibleTiles({
        surface: surface as Surface,
        seqNo,
        visibleTiles: tiles,
        view: annotationContext?.view,
        immediate: true, // 立即预热
      }).catch(error => {
        console.warn('[Zoom Preheat] Failed:', error);
      });
    }
  }, [annotationContext, tileSize, containerSize, transform]);
  const [drawMode, setDrawMode] = useState<"none" | "view" | "measure" | "mark">("none");
  const [showScrollbars, setShowScrollbars] = useState(false);
  const [showMeasureData, setShowMeasureData] = useState(true);
  const [showMarkData, setShowMarkData] = useState(true);
  const [showSubmittedMarks, setShowSubmittedMarks] = useState(true);
  const [showDraftMarks, setShowDraftMarks] = useState(true);
  const [autoSubmitMarks, setAutoSubmitMarks] = useState(false);
  const [defaultClass, setDefaultClass] = useState<DefectClassOption | null>(null);
  const [measureRects, setMeasureRects] = useState<AnnotationRect[]>([]);
  const [markRects, setMarkRects] = useState<
    (AnnotationRect & {
      id: string;
      status: "draft" | "submitted";
      classId?: number;
      className?: string;
      mark?: string;
      surface?: AnnotationSurface;
      view?: string;
      serverId?: number;
    })[]
  >([]);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [classPickerTarget, setClassPickerTarget] = useState<ClassPickerTarget | null>(null);
  const [markEditorOpen, setMarkEditorOpen] = useState(false);
  const [markEditorTargetId, setMarkEditorTargetId] = useState<string | null>(null);
  const [pendingMarkRect, setPendingMarkRect] = useState<AnnotationRect | null>(null);
  const [pendingMarkLabel, setPendingMarkLabel] = useState("");
  
  // Force render for UI overlays (like zoom level text)
  const [, setTick] = useState(0);

  const didInitRef = useRef(false);
  const lastPreferredLevelRef = useRef<number | null>(null);
  const lastViewportRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const lastViewportEmitAtRef = useRef<number>(0);
  const lastTransformEmitAtRef = useRef<number>(0);
  const lastTransformRef = useRef<{ x: number; y: number; scale: number } | null>(null);

  const computePreferredLevel = useCallback(
    (scale: number) => {
      const computedMaxLevel = Math.max(
        0,
        Math.ceil(Math.log2(Math.max(1, imageWidth / tileSize))),
      );
      const maxLevel =
        typeof maxLevelProp === 'number'
          ? Math.max(0, Math.floor(maxLevelProp))
          : computedMaxLevel;
      let preferredLevel = Math.floor(Math.log2(1 / scale));
      if (preferredLevel < 0) preferredLevel = 0;
      if (preferredLevel > maxLevel) preferredLevel = maxLevel;
      return preferredLevel;
    },
    [imageWidth, tileSize, maxLevelProp],
  );

  const getDrawRect = (current: { start: Point; end: Point }) => {
    const x = Math.min(current.start.x, current.end.x);
    const y = Math.min(current.start.y, current.end.y);
    const width = Math.abs(current.start.x - current.end.x);
    const height = Math.abs(current.start.y - current.end.y);
    return { x, y, width, height };
  };

  const drawRects = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    rects: { x: number; y: number; width: number; height: number }[],
    stroke: string,
  ) => {
    ctx.save();
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = stroke;
    rects.forEach((rect) => {
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
    ctx.restore();
  };

  const drawActiveRect = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    rect: { x: number; y: number; width: number; height: number },
    stroke: string,
  ) => {
    ctx.save();
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = stroke;
    ctx.translate(rect.x + 6 / scale, rect.y + 14 / scale);
    const textScale = 1 / scale;
    ctx.scale(textScale, textScale);
    ctx.font = '12px sans-serif';
    ctx.fillText(`${Math.round(rect.width)} × ${Math.round(rect.height)}`, 0, 0);
    ctx.restore();
  };

  const findMarkAtPoint = useCallback((worldX: number, worldY: number) => {
    for (let i = markRects.length - 1; i >= 0; i -= 1) {
      const rect = markRects[i];
      if (
        worldX >= rect.x &&
        worldX <= rect.x + rect.width &&
        worldY >= rect.y &&
        worldY <= rect.y + rect.height
      ) {
        return rect;
      }
    }
    return null;
  }, [markRects]);

  const getResizeHandle = useCallback(
    (
      rect: AnnotationRect,
      worldX: number,
      worldY: number,
      scale: number,
    ) => {
      const threshold = 8 / Math.max(scale, 1e-3);
      const left = rect.x;
      const right = rect.x + rect.width;
      const top = rect.y;
      const bottom = rect.y + rect.height;
      const nearLeft = Math.abs(worldX - left) <= threshold;
      const nearRight = Math.abs(worldX - right) <= threshold;
      const nearTop = Math.abs(worldY - top) <= threshold;
      const nearBottom = Math.abs(worldY - bottom) <= threshold;
      if (nearLeft && nearTop) return "nw";
      if (nearRight && nearTop) return "ne";
      if (nearLeft && nearBottom) return "sw";
      if (nearRight && nearBottom) return "se";
      return null;
    },
    [],
  );

  const buildAnnotationPayload = useCallback(
    (
      rect: AnnotationRect,
      classOption: DefectClassOption | null,
      markLabel?: string | null,
    ): DefectAnnotationCreate | null => {
      if (!annotationContext) return null;
      const meta = resolveAnnotationMeta?.(rect);
      const left = Math.round(rect.x);
      const top = Math.round(rect.y);
      const right = Math.round(rect.x + rect.width);
      const bottom = Math.round(rect.y + rect.height);
      return {
        line_key: annotationContext.lineKey,
        seq_no: annotationContext.seqNo,
        surface: meta?.surface ?? "top",
        view: meta?.view ?? annotationContext.view,
        user: annotationContext.user ?? null,
        method: "manual",
        bbox: { left, top, right, bottom },
        class_id: classOption?.id ?? null,
        class_name: classOption?.name ?? null,
        mark: markLabel ?? null,
        export_payload: null,
        extra: null,
      };
    },
    [annotationContext, resolveAnnotationMeta],
  );

  const buildAnnotationUpdatePayload = useCallback(
    (rect: AnnotationRect, classOption: DefectClassOption | null, markLabel?: string | null) => {
      const left = Math.round(rect.x);
      const top = Math.round(rect.y);
      const right = Math.round(rect.x + rect.width);
      const bottom = Math.round(rect.y + rect.height);
      return {
        method: "manual",
        bbox: { left, top, right, bottom },
        class_id: classOption?.id ?? null,
        class_name: classOption?.name ?? null,
        mark: markLabel ?? null,
      };
    },
    [],
  );

  const submitDraftMarks = useCallback(
    async (drafts: typeof markRects) => {
      if (!annotationContext || drafts.length === 0) return;
      try {
        const payload = drafts
          .map((item) => {
            const classOption =
              item.classId != null
                ? { id: item.classId, name: item.className ?? "" }
                : null;
            return buildAnnotationPayload(item, classOption, item.mark);
          })
          .filter((item): item is DefectAnnotationCreate => Boolean(item));
        if (payload.length === 0) return;
        const res = await createDefectAnnotationsBulk(payload);
        setMarkRects((prev) => {
          const submitted = res.items.map((item, index) => ({
            id: `${item.id}-${index}`,
            x: item.bbox.left,
            y: item.bbox.top,
            width: item.bbox.right - item.bbox.left,
            height: item.bbox.bottom - item.bbox.top,
            status: "submitted" as const,
            classId: item.class_id ?? undefined,
            className: item.class_name ?? undefined,
            mark: item.mark ?? undefined,
            surface: item.surface,
            view: item.view,
            serverId: item.id,
          }));
          const remaining = prev.filter((item) => item.status !== "draft");
          return [...remaining, ...submitted];
        });
        setSelectedMarkId(null);
      } catch (error) {
        console.warn("Failed to submit annotations:", error);
      }
    },
    [annotationContext, buildAnnotationPayload],
  );

  const syncSubmittedMark = useCallback(
    async (mark: (typeof markRects)[number]) => {
      if (!mark.serverId) return;
      const payload = buildAnnotationUpdatePayload(
        mark,
        mark.classId != null
          ? { id: mark.classId, name: mark.className ?? "" }
          : null,
        mark.mark,
      );
      try {
        await updateDefectAnnotation(mark.serverId, payload);
      } catch (error) {
        console.warn("Failed to update annotation:", error);
      }
    },
    [buildAnnotationUpdatePayload],
  );

  const removeSubmittedMark = useCallback(async (markId: number) => {
    try {
      await deleteDefectAnnotation(markId);
    } catch (error) {
      console.warn("Failed to delete annotation:", error);
    }
  }, []);

  const clampTransform = useCallback(
    (next: { x: number; y: number; scale: number }) => {
      if (
        panMargin == null ||
        containerSize.width === 0 ||
        containerSize.height === 0
      ) {
        return next;
      }

      const margin = panMargin;
      const cw = containerSize.width;
      const ch = containerSize.height;

      const minX = cw - (imageWidth + margin) * next.scale;
      const maxX = margin * next.scale;
      const minY = ch - (imageHeight + margin) * next.scale;
      const maxY = margin * next.scale;

      const clampRange = (value: number, lower: number, upper: number) => {
        if (lower > upper) {
          const mid = (lower + upper) / 2;
          lower = upper = mid;
        }
        return Math.min(Math.max(value, lower), upper);
      };

      return {
        scale: next.scale,
        x: clampRange(next.x, minX, maxX),
        y: clampRange(next.y, minY, maxY),
      };
    },
    [panMargin, containerSize, imageWidth, imageHeight],
  );

  // Calculate constraints
  const getConstraints = useCallback(() => {
    const cw = containerSize.width;
    const ch = containerSize.height;
    const fitScale = fitToWidth
      ? cw / imageWidth
      : fitToHeight
        ? ch / imageHeight
        : Math.min(cw / imageWidth, ch / imageHeight);
    if (lockScale) {
      return { minScale: fitScale, maxScale: fitScale };
    }
    const maxScale = 1.0;
    const minScale = Math.min(fitScale, maxScale);
    return { minScale, maxScale };
  }, [containerSize, imageWidth, imageHeight, fitToHeight, fitToWidth, lockScale]);

  const ensureInitialized = useCallback(() => {
    if (
      didInitRef.current ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return;
    }

    const { minScale, maxScale } = getConstraints();
    const requestedScale = initialScale === 'fit' ? minScale : initialScale;
    const nextScale = clamp(requestedScale, minScale, maxScale);

    transform.current = clampTransform({
      scale: nextScale,
      x: (containerSize.width - imageWidth * nextScale) / 2,
      y: (containerSize.height - imageHeight * nextScale) / 2,
    });
    didInitRef.current = true;

    if (onPreferredLevelChange) {
      const preferredLevel = computePreferredLevel(nextScale);
      lastPreferredLevelRef.current = preferredLevel;
      onPreferredLevelChange(preferredLevel);
    }

    setTick(t => t + 1);
  }, [
    clampTransform,
    computePreferredLevel,
    containerSize,
    getConstraints,
    imageHeight,
    imageWidth,
    initialScale,
    onPreferredLevelChange,
  ]);

  // Main Draw Function
  const draw = useCallback(() => {
    const canvas = frontCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || containerSize.width === 0) return;

    // 透明背景：仅清除内容，不填充底色，让父容器背景透出
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ensureInitialized();

    const { x, y, scale } = transform.current;

    // 计算推荐等级（用于通知上层）
    const computedMaxLevel = Math.max(
      0,
      Math.ceil(Math.log2(Math.max(1, imageWidth / tileSize))),
    );
    const maxLevel =
      typeof maxLevelProp === 'number'
        ? Math.max(0, Math.floor(maxLevelProp))
        : computedMaxLevel;
    const preferredLevel = computePreferredLevel(scale);
    if (onPreferredLevelChange && lastPreferredLevelRef.current !== preferredLevel) {
      lastPreferredLevelRef.current = preferredLevel;
      onPreferredLevelChange(preferredLevel);
    }

    const visibleRect = {
      x: -x / scale,
      y: -y / scale,
      width: containerSize.width / scale,
      height: containerSize.height / scale,
    };

    if (onViewportChange) {
      const now = performance.now();
      const last = lastViewportRef.current;
      const shouldEmit =
        !last ||
        Math.abs(last.x - visibleRect.x) > 0.5 ||
        Math.abs(last.y - visibleRect.y) > 0.5 ||
        Math.abs(last.width - visibleRect.width) > 0.5 ||
        Math.abs(last.height - visibleRect.height) > 0.5;
      if (shouldEmit && now - lastViewportEmitAtRef.current > 80) {
        lastViewportRef.current = visibleRect;
        lastViewportEmitAtRef.current = now;
        onViewportChange(visibleRect);
      }
    }
    if (onTransformChange) {
      const now = performance.now();
      const current = transform.current;
      const last = lastTransformRef.current;
      const shouldEmit =
        !last ||
        Math.abs(last.x - current.x) > 0.5 ||
        Math.abs(last.y - current.y) > 0.5 ||
        Math.abs(last.scale - current.scale) > 0.0005;
      if (shouldEmit && now - lastTransformEmitAtRef.current > 80) {
        lastTransformRef.current = { ...current };
        lastTransformEmitAtRef.current = now;
        onTransformChange({ x: current.x, y: current.y, scale: current.scale });
      }
    }

    const safeScale = Math.max(scale, 1e-6);
    const extra = Math.max(0, prefetchMargin) / safeScale;
    const paddedVisibleRect = extra
      ? {
          x: visibleRect.x - extra,
          y: visibleRect.y - extra,
          width: visibleRect.width + extra * 2,
          height: visibleRect.height + extra * 2,
        }
      : visibleRect;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, imageWidth, imageHeight);

    const tiles = getVisibleTiles(
      paddedVisibleRect,
      tileSize,
      { width: imageWidth, height: imageHeight },
      scale,
      fixedLevel,
      maxLevel,
    );

    tiles.forEach(tile => {
      // Always fill background with dark theme color
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height);

      if (renderTile) {
        renderTile(ctx, tile, tileSize, scale);
      } else {



        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);

        ctx.fillStyle = '#666';

        ctx.save();
        ctx.translate(tile.x, tile.y);
        const textScale = 1 / scale;
        ctx.scale(textScale, textScale);
        ctx.font = '12px sans-serif';
        ctx.fillText(`L${tile.level} [${tile.col},${tile.row}]`, 8, 20);
        ctx.restore();
      }
    });

    // 瓦片预热逻辑
    triggerTilePreheat && triggerTilePreheat(tiles, scale, visibleRect);

    // 在所有瓦片绘制完成后，绘制覆盖层（如表面边框）
    if (renderOverlay) {
      renderOverlay(ctx, scale);
    }

    if (drawMode !== "none") {
      if (showMeasureData) {
        drawRects(ctx, scale, measureRects, '#22d3ee');
      }
      if (showMarkData) {
        const visibleMarks = markRects.filter((item) => {
          if (item.status === "submitted") return showSubmittedMarks;
          return showDraftMarks;
        });
        drawRects(ctx, scale, visibleMarks, '#fb923c');
        const selected = visibleMarks.find((item) => item.id === selectedMarkId);
        if (selected) {
          drawActiveRect(ctx, scale, selected, '#fbbf24');
        }
      }
      if (drawingRef.current) {
        const rect = getDrawRect(drawingRef.current);
        const color = drawingRef.current.mode === "measure" ? '#22d3ee' : '#fb923c';
        drawActiveRect(ctx, scale, rect, color);
      }
    }

    ctx.restore();
  }, [
    computePreferredLevel,
    containerSize,
    ensureInitialized,
    fixedLevel,
    imageHeight,
    imageWidth,
    maxLevelProp,
    onPreferredLevelChange,
    onTransformChange,
    onViewportChange,
    prefetchMargin,
    renderOverlay,
    renderTile,
    drawMode,
    showMeasureData,
    showMarkData,
    showSubmittedMarks,
    showDraftMarks,
    measureRects,
    markRects,
    selectedMarkId,
    tileSize,
  ]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      draw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);

  useEffect(() => {
    didInitRef.current = false;
    transform.current = { x: 0, y: 0, scale: 1 };
  }, [imageWidth, imageHeight, initialScale, fitToHeight]);

  // Initial centering
  useEffect(() => {
    if (
      didInitRef.current ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return;
    }

    const { minScale, maxScale } = getConstraints();
    const requestedScale =
      initialScale === 'fit' ? minScale : initialScale;
    const nextScale = clamp(requestedScale, minScale, maxScale);

    transform.current = clampTransform({
      scale: nextScale,
      x: (containerSize.width - imageWidth * nextScale) / 2,
      y: (containerSize.height - imageHeight * nextScale) / 2,
    });
    didInitRef.current = true;
    setTick(t => t + 1);
  }, [containerSize, imageWidth, imageHeight, getConstraints, clampTransform, initialScale]);

  useEffect(() => {
    if (!lockScale || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }
    const { minScale } = getConstraints();
    const nextScale = minScale;
    const current = transform.current;
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;
    const centerWorldX = (viewportCenterX - current.x) / current.scale;
    const centerWorldY = (viewportCenterY - current.y) / current.scale;
    const newX = viewportCenterX - centerWorldX * nextScale;
    const newY = viewportCenterY - centerWorldY * nextScale;
    transform.current = clampTransform({ x: newX, y: newY, scale: nextScale });
    setTick(t => t + 1);
  }, [lockScale, containerSize, getConstraints, clampTransform]);

  useEffect(() => {
    if (forcedScale == null || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }
    const nextScale = forcedScale;
    const current = transform.current;
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;
    const centerWorldX = (viewportCenterX - current.x) / current.scale;
    const centerWorldY = (viewportCenterY - current.y) / current.scale;
    const newX = viewportCenterX - centerWorldX * nextScale;
    const newY = viewportCenterY - centerWorldY * nextScale;
    transform.current = clampTransform({ x: newX, y: newY, scale: nextScale });
    setTick(t => t + 1);
  }, [forcedScale, containerSize, clampTransform]);

  useEffect(() => {
    if (!annotationContext || drawMode !== "mark") {
      return;
    }
    let cancelled = false;
    const loadAnnotations = async () => {
      try {
        const res = await getDefectAnnotations({
          lineKey: annotationContext.lineKey,
          seqNo: annotationContext.seqNo,
          view: annotationContext.view,
        });
        if (cancelled) return;
        const submitted = res.items.map((item) => ({
          id: `server-${item.id}`,
          x: item.bbox.left,
          y: item.bbox.top,
          width: item.bbox.right - item.bbox.left,
          height: item.bbox.bottom - item.bbox.top,
          status: "submitted" as const,
          classId: item.class_id ?? undefined,
          className: item.class_name ?? undefined,
          mark: item.mark ?? undefined,
          surface: item.surface,
          view: item.view,
          serverId: item.id,
        }));
        setMarkRects((prev) => {
          const drafts = prev.filter((item) => item.status === "draft");
          return [...drafts, ...submitted];
        });
      } catch (error) {
        console.warn("Failed to load annotations:", error);
      }
    };
    loadAnnotations();
    return () => {
      cancelled = true;
    };
  }, [annotationContext, drawMode]);

  useEffect(() => {
    if (selectedMarkId && !markRects.some((item) => item.id === selectedMarkId)) {
      setSelectedMarkId(null);
    }
  }, [selectedMarkId, markRects]);

  // Center Target - keep scale, only pan to a point
  useEffect(() => {
    if (
      !centerTarget ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return;
    }

    const current = transform.current;
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;

    const newX = viewportCenterX - centerTarget.x * current.scale;
    const newY = viewportCenterY - centerTarget.y * current.scale;
    transform.current = clampTransform({
      x: newX,
      y: newY,
      scale: current.scale,
    });
    setTick((t) => t + 1);
  }, [centerTarget, clampTransform, containerSize]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
        if (backCanvasRef.current) {
          backCanvasRef.current.width = entry.contentRect.width;
          backCanvasRef.current.height = entry.contentRect.height;
        }
        if (frontCanvasRef.current) {
          frontCanvasRef.current.width = entry.contentRect.width;
          frontCanvasRef.current.height = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Interactions - 使用原生 wheel 事件避免被动监听限制
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { minScale, maxScale } = getConstraints();
    const current = transform.current;

    const shouldZoom = wheelMode !== "scroll" || e.ctrlKey;
    if (!shouldZoom) {
      const next = clampTransform({
        scale: current.scale,
        x: current.x,
        y: current.y - e.deltaY,
      });
      transform.current = next;
      setTick(t => t + 1);
      return;
    }

    if (lockScale) {
      return;
    }

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const factor = Math.exp(delta);

    const newScale = clamp(current.scale * factor, minScale, maxScale);

    // 缩放预热：检测缩放方向，提前预热下一层级的瓦片
    const currentLevel = computePreferredLevel(current.scale);
    const newLevel = computePreferredLevel(newScale);

    // 如果缩小（level 变大），预热更高层级的瓦片
    if (newLevel > currentLevel) {
      triggerTilePreheatForLevel(newLevel);
    }
    // 如果放大（level 变小），预热当前层级的瓦片
    else if (newLevel < currentLevel) {
      triggerTilePreheatForLevel(newLevel);
    }

    const rect = frontCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mouseVirtualX = (mouseX - current.x) / current.scale;
    const mouseVirtualY = (mouseY - current.y) / current.scale;

    const newX = mouseX - mouseVirtualX * newScale;
    const newY = mouseY - mouseVirtualY * newScale;

    transform.current = clampTransform({ x: newX, y: newY, scale: newScale });
    setTick(t => t + 1);
  }, [getConstraints, clampTransform, wheelMode, lockScale, computePreferredLevel, triggerTilePreheatForLevel]);

  useEffect(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const wheelHandler = (event: WheelEvent) => {
      handleWheel(event);
    };
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  const resolvePointerInfo = useCallback((clientX: number, clientY: number) => {
    const rect = frontCanvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const current = transform.current;
    const worldX = (screenX - current.x) / current.scale;
    const worldY = (screenY - current.y) / current.scale;
    return {
      worldX,
      worldY,
      screenX,
      screenY,
      scale: current.scale,
    };
  }, []);

  const addDraftMark = useCallback(
    (
      rect: AnnotationRect,
      classOption: DefectClassOption | null,
      markLabel?: string | null,
    ) => {
      const meta = resolveAnnotationMeta?.(rect);
      const newMark = {
        id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        status: "draft" as const,
        classId: classOption?.id,
        className: classOption?.name,
        mark: markLabel ?? undefined,
        surface: meta?.surface,
        view: meta?.view,
      };
      setMarkRects((prev) => [...prev, newMark]);
      setSelectedMarkId(newMark.id);
      return newMark;
    },
    [resolveAnnotationMeta],
  );

  const finalizeDrawing = useCallback(() => {
    if (!drawingRef.current) return;
    const rect = getDrawRect(drawingRef.current);
    if (rect.width >= 2 && rect.height >= 2) {
      if (drawingRef.current.mode === "measure") {
        setMeasureRects((prev) => [...prev, rect]);
      } else {
        if (defaultClass) {
          const mark = addDraftMark(rect, defaultClass);
          if (autoSubmitMarks) {
            submitDraftMarks([mark]);
          }
        } else {
          setPendingMarkRect(rect);
          setClassPickerTarget({ type: "new" });
          setClassPickerOpen(true);
        }
      }
    }
    drawingRef.current = null;
    setTick(t => t + 1);
  }, [getDrawRect, defaultClass, addDraftMark, autoSubmitMarks, submitDraftMarks]);

  const clearMeasure = useCallback(() => {
    setMeasureRects([]);
    if (drawingRef.current?.mode === "measure") {
      drawingRef.current = null;
    }
    setTick(t => t + 1);
  }, []);

  const exitEditMode = useCallback(() => {
    setDrawMode("none");
    setMeasureRects([]);
    setMarkRects((prev) => prev.filter((item) => item.status === "submitted"));
    drawingRef.current = null;
    setTick(t => t + 1);
  }, []);

  const updateMarkById = useCallback(
    (
      markId: string,
      updates: Partial<(typeof markRects)[number]>,
    ) => {
      setMarkRects((prev) =>
        prev.map((item) =>
          item.id === markId ? { ...item, ...updates } : item,
        ),
      );
    },
    [],
  );

  const handleClassPick = useCallback(
    (option: DefectClassOption) => {
      if (!classPickerTarget) {
        setClassPickerOpen(false);
        return;
      }
      if (classPickerTarget.type === "default") {
        setDefaultClass(option);
      } else if (classPickerTarget.type === "new") {
        if (pendingMarkRect) {
          const mark = addDraftMark(pendingMarkRect, option);
          if (autoSubmitMarks) {
            submitDraftMarks([mark]);
          }
        }
      } else if (classPickerTarget.type === "edit" && classPickerTarget.markId) {
        updateMarkById(classPickerTarget.markId, {
          classId: option.id,
          className: option.name,
        });
        const selected = markRects.find((item) => item.id === classPickerTarget.markId);
        if (selected?.status === "submitted") {
          syncSubmittedMark({ ...selected, classId: option.id, className: option.name });
        }
      }
      setPendingMarkRect(null);
      setClassPickerTarget(null);
      setClassPickerOpen(false);
    },
    [
      classPickerTarget,
      pendingMarkRect,
      addDraftMark,
      autoSubmitMarks,
      submitDraftMarks,
      updateMarkById,
      markRects,
      syncSubmittedMark,
    ],
  );

  const handleMarkSave = useCallback(() => {
    if (!markEditorTargetId) {
      setMarkEditorOpen(false);
      return;
    }
    updateMarkById(markEditorTargetId, { mark: pendingMarkLabel });
    const selected = markRects.find((item) => item.id === markEditorTargetId);
    if (selected?.status === "submitted") {
      syncSubmittedMark({ ...selected, mark: pendingMarkLabel });
    }
    setMarkEditorTargetId(null);
    setMarkEditorOpen(false);
  }, [markEditorTargetId, pendingMarkLabel, updateMarkById, markRects, syncSubmittedMark]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 && drawMode !== "none") {
      isDragging.current = true;
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0 && drawMode === "mark") {
      const info = resolvePointerInfo(e.clientX, e.clientY);
      if (!info) return;
      const hit = findMarkAtPoint(info.worldX, info.worldY);
      if (hit) {
        setSelectedMarkId(hit.id);
        const handle = getResizeHandle(hit, info.worldX, info.worldY, info.scale);
        editActionRef.current = {
          type: handle ? "resize" : "move",
          markId: hit.id,
          start: { x: info.worldX, y: info.worldY },
          origin: { x: hit.x, y: hit.y, width: hit.width, height: hit.height },
          handle: handle ?? undefined,
        };
        return;
      }
      setSelectedMarkId(null);
    }

    if (e.button === 0 && (drawMode === "measure" || drawMode === "mark")) {
      const info = resolvePointerInfo(e.clientX, e.clientY);
      if (!info) return;
      drawingRef.current = {
        mode: drawMode,
        start: { x: info.worldX, y: info.worldY },
        end: { x: info.worldX, y: info.worldY },
      };
      setTick(t => t + 1);
      return;
    }

    const info = resolvePointerInfo(e.clientX, e.clientY);
    if (info && onPointerDown) {
      const handled = onPointerDown(info);
      if (handled) {
        return;
      }
    }
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  }, [onPointerDown, resolvePointerInfo, drawMode, findMarkAtPoint, getResizeHandle]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey) {
      setDrawMode("view");
      return;
    }
    if (lockScale) {
      return;
    }
    const info = resolvePointerInfo(e.clientX, e.clientY);
    if (!info) return;
    const current = transform.current;
    const currentLevel = computePreferredLevel(current.scale);
    const { minScale, maxScale } = getConstraints();
    const targetScale = currentLevel >= 2 ? maxScale : minScale;

    const targetX = info.screenX - info.worldX * targetScale;
    const targetY = info.screenY - info.worldY * targetScale;

    if (zoomAnimRef.current !== null) {
      cancelAnimationFrame(zoomAnimRef.current);
      zoomAnimRef.current = null;
    }

    const start = { ...transform.current };
    const duration = 500;
    const startAt = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      const eased = easeOutCubic(t);
      const next = {
        scale: start.scale + (targetScale - start.scale) * eased,
        x: start.x + (targetX - start.x) * eased,
        y: start.y + (targetY - start.y) * eased,
      };
      transform.current = clampTransform(next);
      setTick(v => v + 1);
      if (t < 1) {
        zoomAnimRef.current = requestAnimationFrame(animate);
      } else {
        zoomAnimRef.current = null;
      }
    };

    zoomAnimRef.current = requestAnimationFrame(animate);
  }, [lockScale, resolvePointerInfo, computePreferredLevel, getConstraints, clampTransform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (drawingRef.current) {
      const info = resolvePointerInfo(e.clientX, e.clientY);
      if (info) {
        drawingRef.current = {
          ...drawingRef.current,
          end: { x: info.worldX, y: info.worldY },
        };
        setTick(t => t + 1);
      }
      return;
    }
    if (editActionRef.current) {
      const info = resolvePointerInfo(e.clientX, e.clientY);
      if (!info) return;
      const action = editActionRef.current;
      const dx = info.worldX - action.start.x;
      const dy = info.worldY - action.start.y;
      let next = { ...action.origin };
      if (action.type === "move") {
        next = {
          x: action.origin.x + dx,
          y: action.origin.y + dy,
          width: action.origin.width,
          height: action.origin.height,
        };
      } else if (action.handle) {
        let left = action.origin.x;
        let right = action.origin.x + action.origin.width;
        let top = action.origin.y;
        let bottom = action.origin.y + action.origin.height;
        if (action.handle.includes("w")) left += dx;
        if (action.handle.includes("e")) right += dx;
        if (action.handle.includes("n")) top += dy;
        if (action.handle.includes("s")) bottom += dy;
        const minSize = 2;
        if (right - left < minSize) right = left + minSize;
        if (bottom - top < minSize) bottom = top + minSize;
        next = {
          x: Math.min(left, right),
          y: Math.min(top, bottom),
          width: Math.abs(right - left),
          height: Math.abs(bottom - top),
        };
      }
      setMarkRects((prev) =>
        prev.map((item) =>
          item.id === action.markId ? { ...item, ...next } : item,
        ),
      );
      setTick(t => t + 1);
      return;
    }
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    const current = transform.current;
    transform.current = clampTransform({
      scale: current.scale,
      x: current.x + dx,
      y: current.y + dy,
    });
  }, [clampTransform, resolvePointerInfo]);

  const handleHoverMove = useCallback(
    (e: React.MouseEvent) => {
      if (!onPointerMove || isDragging.current) return;
      const info = resolvePointerInfo(e.clientX, e.clientY);
      if (info) {
        onPointerMove(info);
      }
    },
    [onPointerMove, resolvePointerInfo],
  );

  const handleMouseUp = useCallback(() => {
    finalizeDrawing();
    if (editActionRef.current) {
      const mark = markRects.find((item) => item.id === editActionRef.current?.markId);
      if (mark && mark.status === "submitted") {
        syncSubmittedMark(mark);
      }
      editActionRef.current = null;
    }
    isDragging.current = false;
  }, [finalizeDrawing, markRects, syncSubmittedMark]);

  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<Point | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const info = resolvePointerInfo(e.touches[0].clientX, e.touches[0].clientY);
      if (info && (drawMode === "measure" || drawMode === "mark")) {
        drawingRef.current = {
          mode: drawMode,
          start: { x: info.worldX, y: info.worldY },
          end: { x: info.worldX, y: info.worldY },
        };
        setTick(t => t + 1);
        return;
      }
      isDragging.current = true;
      lastMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      lastTouchDistance.current = getTouchDistance(e.touches);
      const rect = frontCanvasRef.current?.getBoundingClientRect();
      if (rect) {
        const center = getTouchCenter(e.touches);
        lastTouchCenter.current = { x: center.x - rect.left, y: center.y - rect.top };
      }
    }
  }, [drawMode, resolvePointerInfo]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (drawingRef.current && e.touches.length === 1) {
      const info = resolvePointerInfo(e.touches[0].clientX, e.touches[0].clientY);
      if (info) {
        drawingRef.current = {
          ...drawingRef.current,
          end: { x: info.worldX, y: info.worldY },
        };
        setTick(t => t + 1);
      }
      return;
    }
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastMousePosition.current.x;
      const dy = e.touches[0].clientY - lastMousePosition.current.y;
      lastMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const current = transform.current;
      transform.current = clampTransform({
        scale: current.scale,
        x: current.x + dx,
        y: current.y + dy,
      });
    } else if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const rect = frontCanvasRef.current?.getBoundingClientRect();
      if (!rect || lastTouchDistance.current === null || !lastTouchCenter.current) return;

      const { minScale, maxScale } = getConstraints();
      const current = transform.current;

      const factor = dist / lastTouchDistance.current;
      const newScale = clamp(current.scale * factor, minScale, maxScale);

      const centerScreen = getTouchCenter(e.touches);
      const centerX = centerScreen.x - rect.left;
      const centerY = centerScreen.y - rect.top;

      const mouseVirtualX = (centerX - current.x) / current.scale;
      const mouseVirtualY = (centerY - current.y) / current.scale;

      const newX = centerX - mouseVirtualX * newScale;
      const newY = centerY - mouseVirtualY * newScale;

      transform.current = clampTransform({ x: newX, y: newY, scale: newScale });
      lastTouchDistance.current = dist;
      lastTouchCenter.current = { x: centerX, y: centerY };

      setTick(t => t + 1);
    }
  }, [getConstraints, clampTransform, resolvePointerInfo]);

  const handleTouchEnd = useCallback(() => {
    finalizeDrawing();
    isDragging.current = false;
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
  }, [finalizeDrawing]);

  // Focus Target - 自动聚焦到指定区域
  useEffect(() => {
    if (!focusTarget || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }

    const { x, y, width, height } = focusTarget;
    const { minScale, maxScale } = getConstraints();

    // 计算使目标区域完整显示所需的缩放比例（留出10%的边距）
    const targetScaleX = (containerSize.width * 0.9) / width;
    const targetScaleY = (containerSize.height * 0.9) / height;
    const targetScale = Math.min(targetScaleX, targetScaleY);
    
    // 限制在允许的缩放范围内
    const newScale = clamp(targetScale, minScale, maxScale);

    // 计算目标区域的中心点（图像坐标）
    const targetCenterX = x + width / 2;
    const targetCenterY = y + height / 2;

    // 计算视口中心（屏幕坐标）
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;

    // 计算平移量：使目标中心对齐视口中心
    // transform: screenX = imageX * scale + offsetX
    // 我们希望: targetCenterX * newScale + newOffsetX = viewportCenterX
    const newX = viewportCenterX - targetCenterX * newScale;
    const newY = viewportCenterY - targetCenterY * newScale;

    transform.current = clampTransform({ x: newX, y: newY, scale: newScale });
    setTick(t => t + 1);
  }, [focusTarget, containerSize, getConstraints]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-muted transition-colors duration-300 ${showScrollbars ? "overflow-auto" : "overflow-hidden"} ${className ?? ''}`}
    >
      <canvas
        ref={backCanvasRef}
        className="absolute inset-0 block touch-none cursor-move"
      />
      <canvas
        ref={frontCanvasRef}
        className={`absolute inset-0 block touch-none ${cursor ? "" : "cursor-move"}`}
        style={cursor ? { cursor } : undefined}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleHoverMove(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          if (onPointerLeave) onPointerLeave();
        }}
        onTouchStart={(e) => {
          if (e.cancelable && e.nativeEvent.cancelable) e.preventDefault();
          handleTouchStart(e);
        }}
        onTouchMove={(e) => {
          if (e.cancelable && e.nativeEvent.cancelable) e.preventDefault();
          handleTouchMove(e);
        }}
        onTouchEnd={handleTouchEnd}
      />
      {drawMode === "none" && (
        <div className="absolute bottom-3 right-3 z-20">
          <button
            className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80 hover:text-white"
            onClick={() => setDrawMode("view")}
          >
            编辑
          </button>
        </div>
      )}
      {drawMode !== "none" && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-0 text-[11px]">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80">
            <input
              type="checkbox"
              className="accent-white"
              checked={showScrollbars}
              onChange={(e) => setShowScrollbars(e.target.checked)}
            />
            滚动条
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80">
            <input
              type="checkbox"
              className="accent-white"
              checked={showMeasureData}
              onChange={(e) => setShowMeasureData(e.target.checked)}
            />
            检测数据
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80">
            <input
              type="checkbox"
              className="accent-white"
              checked={showMarkData}
              onChange={(e) => setShowMarkData(e.target.checked)}
            />
            标注数据
          </label>
          {drawMode === "mark" && (
            <>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={showSubmittedMarks}
                  onChange={(e) => setShowSubmittedMarks(e.target.checked)}
                />
                已提交
              </label>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={showDraftMarks}
                  onChange={(e) => setShowDraftMarks(e.target.checked)}
                />
                未提交
              </label>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/80">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={autoSubmitMarks}
                  onChange={(e) => setAutoSubmitMarks(e.target.checked)}
                />
                自动提交
              </label>
            </>
          )}
        </div>
      )}
      {drawMode !== "none" && (
        <div className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center gap-2 text-[11px]">
          {measureRects.length > 0 && (
            <button
              className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
              onClick={clearMeasure}
            >
              清空测量
            </button>
          )}
          <button
            className={`px-3 py-1.5 rounded-sm border ${drawMode === "view" ? "bg-white/10 border-white/30 text-white" : "bg-black/40 border-white/10 text-white/70"}`}
            onClick={() => setDrawMode("view")}
          >
            查看
          </button>
          <button
            className={`px-3 py-1.5 rounded-sm border ${drawMode === "measure" ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-black/40 border-white/10 text-white/70"}`}
            onClick={() => setDrawMode("measure")}
          >
            测量
          </button>
          <button
            className={`px-3 py-1.5 rounded-sm border ${drawMode === "mark" ? "bg-orange-500/20 border-orange-400 text-orange-200" : "bg-black/40 border-white/10 text-white/70"}`}
            onClick={() => setDrawMode("mark")}
          >
            标注
          </button>
          {drawMode === "mark" && (
            <>
              <button
                className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                onClick={() => {
                  setClassPickerTarget({ type: "default" });
                  setClassPickerOpen(true);
                }}
              >
                默认类别: {defaultClass?.name ?? "未设置"}
              </button>
              {defaultClass && (
                <button
                  className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                  onClick={() => setDefaultClass(null)}
                >
                  清除默认
                </button>
              )}
              <button
                className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                onClick={() => submitDraftMarks(markRects.filter((item) => item.status === "draft"))}
              >
                全部提交
              </button>
              <button
                className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                onClick={() =>
                  setMarkRects((prev) => prev.filter((item) => item.status === "submitted"))
                }
              >
                清除未提交
              </button>
              {selectedMarkId && (
                <>
                  <button
                    className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                    onClick={() => {
                      setClassPickerTarget({ type: "edit", markId: selectedMarkId });
                      setClassPickerOpen(true);
                    }}
                  >
                    更改类别
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                    onClick={() => {
                      const selected = markRects.find((item) => item.id === selectedMarkId);
                      setPendingMarkLabel(selected?.mark ?? "");
                      setMarkEditorTargetId(selectedMarkId);
                      setMarkEditorOpen(true);
                    }}
                  >
                    更改标记
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70"
                    onClick={() => {
                      const selected = markRects.find((item) => item.id === selectedMarkId);
                      if (selected?.status === "submitted" && selected.serverId) {
                        removeSubmittedMark(selected.serverId);
                      }
                      setMarkRects((prev) => prev.filter((item) => item.id !== selectedMarkId));
                      setSelectedMarkId(null);
                    }}
                  >
                    删除
                  </button>
                </>
              )}
            </>
          )}
          <button
            className="px-3 py-1.5 rounded-sm border bg-red-500/20 border-red-400 text-red-200"
            onClick={exitEditMode}
          >
            退出
          </button>
        </div>
      )}
      <Dialog
        open={classPickerOpen}
        onOpenChange={(open) => {
          setClassPickerOpen(open);
          if (!open) {
            setPendingMarkRect(null);
            setClassPickerTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-[720px] bg-[#0b1220]/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-base">选择缺陷类别</DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              选择用于标注的缺陷类型
            </DialogDescription>
          </DialogHeader>
          {defectClasses.length === 0 ? (
            <div className="text-xs text-white/60">暂无缺陷类别</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {defectClasses.map((item) => (
                <button
                  key={item.id}
                  className="px-3 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-left"
                  onClick={() => handleClassPick(item)}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: item.color ?? "#f97316" }}
                  />
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={markEditorOpen}
        onOpenChange={(open) => {
          setMarkEditorOpen(open);
          if (!open) {
            setMarkEditorTargetId(null);
          }
        }}
      >
        <DialogContent className="max-w-[420px] bg-[#0b1220]/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-base">修改标记</DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              为当前标注输入说明或标签
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
              value={pendingMarkLabel}
              onChange={(e) => setPendingMarkLabel(e.target.value)}
              placeholder="输入标记"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-sm border bg-black/40 border-white/10 text-white/70 text-xs"
                onClick={() => setMarkEditorOpen(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1.5 rounded-sm border bg-blue-500/20 border-blue-400 text-blue-100 text-xs"
                onClick={handleMarkSave}
              >
                保存
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
