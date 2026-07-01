import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import type {
  Defect,
  ImageOrientation,
  DistributionScaleMode,
  ImageField,
} from "../types/app.types";
import type {
  SurfaceImageInfo,
  Surface,
} from "../api/types";
import { getTileImageUrl } from "../api/client";
import { env } from "../config/env";
import type { ViewportInfo } from "./DefectImageView";
import type { Tile } from "./LargeImageViewer/utils";

interface DefectDistributionChartProps {
  defects: Defect[];
  surface: "all" | "top" | "bottom";
  plateDimensions?: {
    length?: number;
    width?: number;
  } | null;
  defectColors?: {
    [key: string]: { bg: string; border: string; text: string };
  };
  surfaceImageInfo?: SurfaceImageInfo[] | null;
  selectedDefectId?: string | null;
  selectedDefectSurface?: "top" | "bottom" | null;
  onDefectSelect?: (id: string | null) => void;
  onDefectSelectDetail?: (defect: Defect | null) => void;
  onDefectHover?: (defect: Defect, position: { screenX: number; screenY: number }) => void;
  onDefectHoverEnd?: () => void;
  seqNo?: number;
  defaultTileSize?: number;
  maxTileLevel?: number;
  viewportInfo?: ViewportInfo | null;
  viewportSurface?: Surface | null;
  imageOrientation?: ImageOrientation;
  showDistributionImages?: boolean;
  showTileBorders?: boolean;
  distributionScaleMode?: DistributionScaleMode;
  setDistributionScaleMode?: (mode: DistributionScaleMode) => void;
  activeImageField?: ImageField;
  onViewportCenterChange?: (center: { x: number; y: number } | null) => void;
}

const MAX_DEFECTS_TO_DRAW = 1000;
const DRAG_CLICK_THRESHOLD = 4;
const RULER_HEIGHT = 16;
const MIDDLE_SCROLLBAR_HIT_HEIGHT = 12;
const MIDDLE_SCROLLBAR_THUMB_HEIGHT = 4;

// 模拟示例数据（用于没有真实数据时的占位展示）
/* const SAMPLE_DEFECTS: Defect[] = [
  {
    id: "sample-1",
    type: "纵向裂纹",
    severity: "high",
    confidence: 0.89,
    x: 120,
    y: 80,
    width: 25,
    height: 45,
    surface: "top",
  },
  {
    id: "sample-2",
    type: "划伤",
    severity: "medium",
    confidence: 0.76,
    x: 220,
    y: 160,
    width: 35,
    height: 12,
    surface: "top",
  },
  {
    id: "sample-3",
    type: "辊印",
    severity: "low",
    confidence: 0.82,
    x: 70,
    y: 220,
    width: 18,
    height: 28,
    surface: "bottom",
  },
  {
    id: "sample-4",
    type: "横向裂纹",
    severity: "high",
    confidence: 0.92,
    x: 280,
    y: 100,
    width: 40,
    height: 8,
    surface: "top",
  },
  {
    id: "sample-5",
    type: "孔洞",
    severity: "medium",
    confidence: 0.85,
    x: 150,
    y: 190,
    width: 15,
    height: 15,
    surface: "bottom",
  },
]; */

export function DefectDistributionChart({
  defects,
  surface,
  plateDimensions,
  defectColors,
  surfaceImageInfo,
  selectedDefectId,
  selectedDefectSurface,
  onDefectSelect,
  onDefectSelectDetail,
  onDefectHover,
  onDefectHoverEnd,
  seqNo,
  defaultTileSize,
  maxTileLevel,
  viewportInfo,
  viewportSurface,
  imageOrientation: _imageOrientation,
  onViewportCenterChange,
  showDistributionImages = true,
  showTileBorders = false,
  distributionScaleMode = "fit",
  setDistributionScaleMode,
  activeImageField = "all",
}: DefectDistributionChartProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-muted-foreground";
    }
  };

  const getDefectBorderColor = (type: string) => {
    if (defectColors && defectColors[type] && typeof defectColors[type].border === "string") {
      // 从Tailwind类名中提取颜色
      const colorMatch = defectColors[type].border.match(
        /border-(\w+)-(\d+)/,
      );
      if (colorMatch) {
        return `border-${colorMatch[1]}-${colorMatch[2]}`;
      }
    }
    return "border-primary";
  };

  const getDefectTextColor = (type: string) => {
    if (defectColors && defectColors[type] && typeof defectColors[type].text === "string") {
      return defectColors[type].text;
    }
    return "text-primary";
  };

  // 钢板缩略显示尺寸
  // 横向布局：宽度 = 高度 × 单图比例 × 图像数量
  const plateHeight = 160; // 固定高度，增加以确保图像正确显示

  const getDistributionTileLevel = (
    worldWidth: number,
    worldHeight: number,
    displayWidth: number,
    displayHeight: number,
  ): number => {
    const scaleX = worldWidth / Math.max(1, displayWidth);
    const scaleY = worldHeight / Math.max(1, displayHeight);
    const desiredDownscale = Math.max(scaleX, scaleY);
    const normalized = Math.max(
      0,
      Math.ceil(Math.log2(Math.max(1, desiredDownscale))),
    );
    return normalized;
  };

  // 开发/无真实数据时才使用示例数据：存在 surfaceImageInfo 说明是后端真实数据场景
  // Use useMemo to prevent creating new array reference on every render
  const displayDefects = defects;
  
  // Use useMemo to prevent filteredDefects from creating new array reference on every render
  const filteredDefects = useMemo(() => 
    displayDefects.filter(
      (d) => surface === "all" || d.surface === surface,
    ),
    [displayDefects, surface]
  );

  // 在缺陷数过多时限制绘制数量，避免阻塞渲染。
  const visibleDefects = useMemo(() => {
    if (filteredDefects.length <= MAX_DEFECTS_TO_DRAW) {
      return filteredDefects;
    }
    // 仅在超过上限时启用：简单取前 MAX_DEFECTS_TO_DRAW 个，
    // 后续如需按视图窗口动态裁剪，可在这里加入视图相关逻辑。
    return filteredDefects.slice(0, MAX_DEFECTS_TO_DRAW);
  }, [filteredDefects]);
  const fallbackFrameCount = useMemo(() => {
    const maxIndex = visibleDefects.reduce((maxValue, defect) => {
      const imageIndex = Number.isFinite(defect.imageIndex)
        ? defect.imageIndex
        : 1;
      return Math.max(maxValue, imageIndex);
    }, 1);
    return Math.max(1, maxIndex);
  }, [visibleDefects]);
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!onDefectSelect || visibleDefects.length === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      const direction = delta > 0 ? 1 : -1;
      const currentIndex = selectedDefectId
        ? visibleDefects.findIndex(
            (defect) =>
              defect.id === selectedDefectId &&
              (selectedDefectSurface ? defect.surface === selectedDefectSurface : true),
          )
        : -1;
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : visibleDefects.length - 1
          : (currentIndex + direction + visibleDefects.length) %
            visibleDefects.length;
      const nextDefect = visibleDefects[nextIndex];
      if (nextDefect) {
        onDefectSelectDetail?.(nextDefect);
        onDefectSelect(nextDefect.id);
      }
    },
    [onDefectSelect, onDefectSelectDetail, selectedDefectId, selectedDefectSurface, visibleDefects],
  );
  const endDistributionDrag = useCallback(() => {
    dragStateRef.current = null;
    setIsDraggingDistribution(false);
  }, []);

  const syncDistributionScroll = useCallback((scrollLeft: number) => {
    const refs = [
      scrollContainerRef.current,
      topViewportRef.current,
      bottomViewportRef.current,
    ];
    refs.forEach((element) => {
      if (!element || Math.abs(element.scrollLeft - scrollLeft) < 1) {
        return;
      }
      element.scrollLeft = scrollLeft;
    });
    const actualScrollLeft = scrollContainerRef.current?.scrollLeft ?? scrollLeft;
    setDistributionScrollLeft((previous) =>
      Math.abs(previous - actualScrollLeft) < 1 ? previous : actualScrollLeft,
    );
  }, []);

  const handleDistributionScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      syncDistributionScroll(event.currentTarget.scrollLeft);
    },
    [syncDistributionScroll],
  );

  const handleDistributionPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const container = scrollContainerRef.current;
      if (!container || container.scrollWidth <= container.clientWidth) {
        return;
      }
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: container.scrollLeft,
        hasDragged: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [],
  );

  const handleDistributionPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      const container = scrollContainerRef.current;
      if (!dragState || !container || dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (
        !dragState.hasDragged &&
        Math.hypot(deltaX, deltaY) >= DRAG_CLICK_THRESHOLD
      ) {
        dragState.hasDragged = true;
        setIsDraggingDistribution(true);
      }

      if (dragState.hasDragged) {
        event.preventDefault();
        const nextScrollLeft = dragState.scrollLeft - deltaX;
        container.scrollLeft = nextScrollLeft;
        syncDistributionScroll(nextScrollLeft);
      }
    },
    [syncDistributionScroll],
  );

  const handleDistributionPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (dragState?.pointerId === event.pointerId && dragState.hasDragged) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      endDistributionDrag();
    },
    [endDistributionDrag],
  );

  const handleDistributionMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || dragStateRef.current) return;
      const container = scrollContainerRef.current;
      if (!container || container.scrollWidth <= container.clientWidth) {
        return;
      }
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: container.scrollLeft,
        hasDragged: false,
      };
    },
    [],
  );

  const handleDistributionMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      const container = scrollContainerRef.current;
      if (!dragState || dragState.pointerId !== undefined || !container) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (
        !dragState.hasDragged &&
        Math.hypot(deltaX, deltaY) >= DRAG_CLICK_THRESHOLD
      ) {
        dragState.hasDragged = true;
        setIsDraggingDistribution(true);
      }

      if (dragState.hasDragged) {
        event.preventDefault();
        const nextScrollLeft = dragState.scrollLeft - deltaX;
        container.scrollLeft = nextScrollLeft;
        syncDistributionScroll(nextScrollLeft);
      }
    },
    [syncDistributionScroll],
  );

  const handleDistributionMouseUp = useCallback(() => {
    const dragState = dragStateRef.current;
    if (dragState?.pointerId === undefined && dragState.hasDragged) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    if (!dragState || dragState.pointerId === undefined) {
      endDistributionDrag();
    }
  }, [endDistributionDrag]);

  const handleDistributionClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!suppressClickRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    },
    [],
  );

  const handleMiddleScrollbarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const container = scrollContainerRef.current;
      if (!container || container.scrollWidth <= container.clientWidth) {
        return;
      }

      const track = event.currentTarget;
      const rect = track.getBoundingClientRect();
      const trackWidth = Math.max(1, rect.width);
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const thumbWidth = Math.min(
        trackWidth,
        Math.max(36, (container.clientWidth / container.scrollWidth) * trackWidth),
      );
      const trackTravel = Math.max(1, trackWidth - thumbWidth);
      const nextScrollLeft = Math.min(
        maxScroll,
        Math.max(
          0,
          ((event.clientX - rect.left - thumbWidth / 2) / trackTravel) * maxScroll,
        ),
      );

      container.scrollLeft = nextScrollLeft;
      syncDistributionScroll(nextScrollLeft);
      middleScrollbarDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollLeft: nextScrollLeft,
        trackWidth,
        thumbWidth,
      };
      setIsDraggingDistribution(true);
      track.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    [syncDistributionScroll],
  );

  const handleMiddleScrollbarPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = middleScrollbarDragRef.current;
      const container = scrollContainerRef.current;
      if (!dragState || !container || dragState.pointerId !== event.pointerId) {
        return;
      }

      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const trackTravel = Math.max(1, dragState.trackWidth - dragState.thumbWidth);
      const deltaX = event.clientX - dragState.startX;
      const nextScrollLeft = Math.min(
        maxScroll,
        Math.max(0, dragState.scrollLeft + (deltaX / trackTravel) * maxScroll),
      );

      container.scrollLeft = nextScrollLeft;
      syncDistributionScroll(nextScrollLeft);
      event.preventDefault();
      event.stopPropagation();
    },
    [syncDistributionScroll],
  );

  const endMiddleScrollbarDrag = useCallback(
    (event?: React.PointerEvent<HTMLDivElement>) => {
      if (
        event &&
        middleScrollbarDragRef.current?.pointerId === event.pointerId
      ) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
      middleScrollbarDragRef.current = null;
      setIsDraggingDistribution(false);
    },
    [],
  );

  const findMetaForSurface = (
    surf: "top" | "bottom",
  ): SurfaceImageInfo | undefined =>
    surfaceImageInfo?.find((info) => info.surface === surf);
  
  // Container refs for sizing and scroll synchronization.
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topViewportRef = useRef<HTMLDivElement>(null);
  const bottomViewportRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId?: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    hasDragged: boolean;
  } | null>(null);
  const middleScrollbarDragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    trackWidth: number;
    thumbWidth: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [isDraggingDistribution, setIsDraggingDistribution] = useState(false);
  const [distributionScrollLeft, setDistributionScrollLeft] = useState(0);

  // 监听容器宽度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      if (width > 0 && height > 0) {
        setContainerWidth(width);
        setContainerHeight(height);
      }
    };

    // 使用 setTimeout 确保在布局完成后执行
    const timer = setTimeout(updateSize, 0);
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);
  
  // 计算横向布局的宽度
  const calculatePlateWidth = (
    meta: SurfaceImageInfo | undefined,
    displayHeight: number,
  ): number => {
    if (!meta) return 360; // 默认宽度
    const frameCount = meta.frame_count || 1;
    const imageWidth = meta.image_width || 1;
    const imageHeight = meta.image_height || 1;
    
    // 正确的映射关系：
    // 原图：宽度 imageWidth × 总长度 (imageHeight × frameCount)
    // 显示旋转90度：原图宽度 → 显示高度，原图长度 → 显示宽度
    // plateHeight / plateWidth = imageWidth / (imageHeight × frameCount)
    // plateWidth = plateHeight × (imageHeight × frameCount) / imageWidth
    const totalLength = imageHeight * frameCount;
    return displayHeight * totalLength / imageWidth;
  };

  // 计算最终显示高度和宽度（包括拉伸逻辑）
  const calculateFinalDimensions = useMemo(() => {
    const topMeta = findMetaForSurface("top");
    const bottomMeta = findMetaForSurface("bottom");

    const baseHeight = plateHeight * 2;
    let finalHeight = baseHeight;
    let scale = 1;

    // 计算每个表面的高度（非拉伸模式）
    const perSurfaceHeight =
      surface === "all"
        ? Math.max(80, (baseHeight - RULER_HEIGHT * 2) / 2)
        : Math.max(120, baseHeight - RULER_HEIGHT);
    const topWidth = calculatePlateWidth(topMeta, perSurfaceHeight);
    const bottomWidth = calculatePlateWidth(bottomMeta, perSurfaceHeight);

    let finalTopWidth = topWidth;
    let finalBottomWidth = bottomWidth;
    let finalPerSurfaceHeight = perSurfaceHeight;

    if (distributionScaleMode === "stretch") {
      const targetWidth =
        containerWidth > 0
          ? containerWidth
          : Math.max(topWidth, bottomWidth);
      // 拉伸模式只拉伸宽度，高度保持固定，避免撑开布局高度。
      if (surface === "all") {
        finalTopWidth = targetWidth;
        finalBottomWidth = targetWidth;
        finalPerSurfaceHeight = perSurfaceHeight;
        finalHeight = baseHeight;
      } else if (surface === "top") {
        finalTopWidth = targetWidth;
        finalPerSurfaceHeight = perSurfaceHeight;
        finalHeight = baseHeight;
      } else {
        finalBottomWidth = targetWidth;
        finalPerSurfaceHeight = perSurfaceHeight;
        finalHeight = baseHeight;
      }

      return {
        height: finalHeight,
        topWidth: finalTopWidth,
        bottomWidth: finalBottomWidth,
        scale,
        perSurfaceHeight: finalPerSurfaceHeight,
      };
    }

    finalHeight = baseHeight;

    return {
      height: finalHeight,
      topWidth: finalTopWidth,
      bottomWidth: finalBottomWidth,
      scale,
      perSurfaceHeight,
    };
  }, [surface, containerWidth, surfaceImageInfo, distributionScaleMode, plateHeight]);

  useEffect(() => {
    syncDistributionScroll(scrollContainerRef.current?.scrollLeft ?? 0);
  }, [
    calculateFinalDimensions.topWidth,
    calculateFinalDimensions.bottomWidth,
    surface,
    syncDistributionScroll,
  ]);

  const computeDisplayRect = (
    defect: Defect,
    meta: SurfaceImageInfo | undefined,
    perSurfaceHeight: number,
    plateWidth: number,
  ) => {
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    if (!meta || typeof defect.imageIndex !== "number") {
      const fallbackFrameWidth = 4096;
      const fallbackFrameHeight = 1024;
      const frameIndex = Math.max(0, (defect.imageIndex || 1) - 1);
      const lengthCenter = clamp01(
        (frameIndex + (defect.y + defect.height / 2) / fallbackFrameHeight) /
          fallbackFrameCount,
      );
      const widthCenter = clamp01(
        (defect.x + defect.width / 2) / fallbackFrameWidth,
      );
      const markerSize = 4;
      return {
        x: lengthCenter * plateWidth - markerSize / 2,
        y: (1 - widthCenter) * perSurfaceHeight - markerSize / 2,
        w: markerSize,
        h: markerSize,
      };
    }

    const frameCount = meta.frame_count || 1;
    const imageWidth = meta.image_width || 1;
    const imageHeight = meta.image_height || 1;

    // 数据库存储：沿长度方向按帧逐个向“下”堆叠
    const rawIndex =
      typeof defect.imageIndex === "number"
        ? defect.imageIndex
        : 0;
    // 防止索引越界（兼容 0/1-based）
    const zeroBasedIndex = rawIndex > 0 ? rawIndex - 1 : 0;
    const frameIndex = Math.min(
      Math.max(zeroBasedIndex, 0),
      frameCount - 1,
    );

    const totalLength = frameCount * imageHeight;

    // 这里使用“帧索引 + 单帧内坐标”来近似 topInSrcImg / bottomInSrcImg
    const y1Global = frameIndex * imageHeight + defect.y;
    const y2Global =
      frameIndex * imageHeight + defect.y + defect.height;

    const x1 = defect.x;
    const x2 = defect.x + defect.width;

    // 长度方向：0~1 映射到钢板缩略图宽度，从左往右
    let lengthStart =
      totalLength > 0 ? y1Global / totalLength : 0;
    let lengthEnd =
      totalLength > 0 ? y2Global / totalLength : 0;
    lengthStart = clamp01(lengthStart);
    lengthEnd = clamp01(lengthEnd);
    if (lengthEnd < lengthStart) {
      const tmp = lengthStart;
      lengthStart = lengthEnd;
      lengthEnd = tmp;
    }

    // 宽度方向：0~1 映射到钢板缩略图高度，从下往上（0 点在左下角）
    let widthStart = imageWidth > 0 ? x1 / imageWidth : 0;
    let widthEnd = imageWidth > 0 ? x2 / imageWidth : 0;
    widthStart = clamp01(widthStart);
    widthEnd = clamp01(widthEnd);
    if (widthEnd < widthStart) {
      const tmp = widthStart;
      widthStart = widthEnd;
      widthEnd = tmp;
    }

    let lengthWidth = lengthEnd - lengthStart;
    const plateLength = plateDimensions?.length ?? 0;
    const defectLengthMm = defect.heightMm ?? 0;
    if (plateLength > 0 && defectLengthMm > 0) {
      lengthWidth = defectLengthMm / plateLength;
    }

    let widthHeight = widthEnd - widthStart;
    const platePhysicalWidth = plateDimensions?.width ?? 0;
    const defectWidthMm = defect.widthMm ?? 0;
    if (platePhysicalWidth > 0 && defectWidthMm > 0) {
      widthHeight = defectWidthMm / platePhysicalWidth;
    }

    lengthWidth = Math.max(lengthWidth, 2 / Math.max(plateWidth, 1));
    widthHeight = Math.max(widthHeight, 2 / Math.max(perSurfaceHeight, 1));

    const lengthCenter = (lengthStart + lengthEnd) / 2;
    const widthCenter = (widthStart + widthEnd) / 2;
    const displayX = clamp01(lengthCenter - lengthWidth / 2) * plateWidth;
    const displayWidth = lengthWidth * plateWidth;
    // 0 点在左下角：把 0 映射到 bottom
    const displayY =
      (1 - clamp01(widthCenter + widthHeight / 2)) * perSurfaceHeight;
    const displayHeight = widthHeight * perSurfaceHeight;

    return {
      x: displayX,
      y: displayY,
      w: displayWidth,
      h: displayHeight,
    };
  };

  // 分布图固定横向显示，不跟随主图方向切换。
  const orientation: ImageOrientation = "horizontal";

  const renderPlate = (
    surf: Surface,
    containerHeight: number,
  ) => {
    const perSurfaceHeight = containerHeight;
    const title =
      surf === "top"
        ? "TOP SURFACE"
        : surf === "bottom"
          ? "BOTTOM SURFACE"
          : "SURFACE";
    const meta = findMetaForSurface(surf);
    const plateDefects = visibleDefects.filter(
      (d) => d.surface === surf,
    );
    
    // 使用计算后的宽度（包括拉伸）
    const plateWidth = surf === "top" 
      ? calculateFinalDimensions.topWidth 
      : calculateFinalDimensions.bottomWidth;
    const frameCount = meta?.frame_count || 1;
    const selectedDefect = selectedDefectId
      ? plateDefects.find(
          (defect) =>
            defect.id === selectedDefectId &&
            (selectedDefectSurface ? defect.surface === selectedDefectSurface : true),
        )
      : undefined;

    const tileImages: JSX.Element[] = [];
    if (
      showDistributionImages &&
      meta &&
      typeof (seqNo as number | undefined) === "number"
    ) {
      // 直接使用 mosaic 尺寸，不使用 buildOrientationLayout
      const sourceWidth = meta.image_width ?? 0;
      const sourceLength = (meta.frame_count ?? 0) * (meta.image_height ?? 0);
      const mosaicWidth =
        orientation === "horizontal" ? sourceLength : sourceWidth;
      const mosaicHeight =
        orientation === "horizontal" ? sourceWidth : sourceLength;

      if (mosaicWidth > 0 && mosaicHeight > 0) {
        // 计算瓦片层级
        const requestedLevel = getDistributionTileLevel(
          mosaicWidth,
          mosaicHeight,
          plateWidth,
          perSurfaceHeight,
        );
        const level = Math.min(requestedLevel, 16);

        let tileSize = Math.max(
          defaultTileSize ?? 0,
          meta.image_height ?? 0,
          512,
        );

        const virtualTileSize = tileSize * Math.pow(2, level);
        const tilesX = Math.max(
          1,
          Math.ceil(mosaicWidth / virtualTileSize),
        );
        const tilesY = Math.max(
          1,
          Math.ceil(mosaicHeight / virtualTileSize),
        );

        for (let row = 0; row < tilesY; row += 1) {
          for (let col = 0; col < tilesX; col += 1) {
            const x = col * virtualTileSize;
            const y = row * virtualTileSize;
            const width =
              col === tilesX - 1
                ? mosaicWidth - col * virtualTileSize
                : virtualTileSize;
            const height =
              row === tilesY - 1
                ? mosaicHeight - row * virtualTileSize
                : virtualTileSize;

            const url = getTileImageUrl({
              surface: surf,
              seqNo: seqNo as number,
              level,
              tileX: col,
              tileY: row,
              tileSize,
              orientation: "horizontal",
              field: activeImageField,
              // 分布图不使用 view 参数，因为后端直接返回适合横向布局的瓦片
            });

            const left = (x / mosaicWidth) * plateWidth;
            const top = (y / mosaicHeight) * perSurfaceHeight;
            const displayWidth = (width / mosaicWidth) * plateWidth;
            const displayHeight = (height / mosaicHeight) * perSurfaceHeight;

            tileImages.push(
              <img
                key={`tile-${activeImageField}-${surf}-L${level}-${tileSize}-${col}-${row}`}
                src={url}
                alt="mosaic-tile"
                className="absolute select-none"
                draggable={false}
                loading="lazy"
                decoding="async"
                onDragStart={(e) => e.preventDefault()}
                style={{
                  left,
                  top,
                  width: displayWidth,
                  height: displayHeight,
                  objectFit: "fill",
                  border: showTileBorders ? "1px solid rgba(255,255,255,0.3)" : "none",
                }}
              />,
            );
          }
        }
      }
    }

    const viewportBox = (() => {
      if (
        !meta ||
        !viewportInfo ||
        !viewportSurface ||
        viewportSurface !== surf
      ) {
        return null;
      }

      const sourceWidth = meta.image_width ?? 0;
      const sourceLength = (meta.frame_count ?? 0) * (meta.image_height ?? 0);
      const mosaicWidth =
        orientation === "horizontal" ? sourceLength : sourceWidth;
      const mosaicHeight =
        orientation === "horizontal" ? sourceWidth : sourceLength;
      if (mosaicWidth <= 0 || mosaicHeight <= 0) {
        return null;
      }

      const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
      const mosaicRect = {
        x: viewportInfo.x,
        y: viewportInfo.y,
        width: viewportInfo.width,
        height: viewportInfo.height,
      };

      const lengthStart = clamp01(mosaicRect.x / mosaicWidth);
      const lengthEnd = clamp01((mosaicRect.x + mosaicRect.width) / mosaicWidth);
      const widthStart = clamp01(mosaicRect.y / mosaicHeight);
      const widthEnd = clamp01((mosaicRect.y + mosaicRect.height) / mosaicHeight);

      const displayX = Math.min(lengthStart, lengthEnd) * plateWidth;
      const displayWidth =
        Math.max(0.002, Math.abs(lengthEnd - lengthStart)) * plateWidth;
      const displayY = (1 - Math.max(widthStart, widthEnd)) * perSurfaceHeight;
      const displayHeight =
        Math.max(0.002, Math.abs(widthEnd - widthStart)) * perSurfaceHeight;

      return (
        <div
          className="absolute border-2 pointer-events-none"
          style={{
            left: displayX,
            top: displayY,
            width: displayWidth,
            height: displayHeight,
            borderColor: "#3b82f6",
            backgroundColor: "#12000000",
          }}
        />
      );
    })();

    // 生成刻度尺
    const renderRuler = (position: "top" | "bottom") => (
      <div 
        className="relative w-full h-4 bg-muted/20"
        style={{ width: plateWidth }}
      >
        {/* 刻度线和标签 */}
        {Array.from({ length: frameCount + 1 }).map((_, i) => {
          const positionPercent = (i / frameCount) * 100;
          return (
            <div
              key={`ruler-${position}-${surf}-${i}`}
              className="absolute h-full border-l border-muted-foreground/40"
              style={{ left: `${positionPercent}%` }}
            >
              {/* 刻度数字 */}
              <div className={`absolute text-[9px] text-muted-foreground font-mono ${
                position === "top" ? "bottom-0" : "top-0"
              } left-0 transform -translate-x-1/2`}>
                {i}
              </div>
            </div>
          );
        })}
      </div>
    );

    return (
      <div key={surf} className="flex flex-col gap-0">
        {/* 上刻度尺 - 仅在上表面显示 */}
        {surf === "top" && renderRuler("top")}
        
        <div
          className="relative bg-muted/5 overflow-hidden"
          style={{ width: plateWidth, height: perSurfaceHeight }}
          onDragStart={(e) => e.preventDefault()}
          onMouseLeave={() => onDefectHoverEnd?.()}
          onClick={(e) => {
            if (
              !meta ||
              !onViewportCenterChange ||
              !viewportSurface ||
              viewportSurface !== surf
            ) {
              return;
            }

            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
            const relY = (e.clientY - rect.top) / Math.max(1, rect.height);
            const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

            const sourceWidth = meta.image_width ?? 0;
            const sourceLength = (meta.frame_count ?? 0) * (meta.image_height ?? 0);
            const mosaicWidth =
              orientation === "horizontal" ? sourceLength : sourceWidth;
            const mosaicHeight =
              orientation === "horizontal" ? sourceWidth : sourceLength;
            if (mosaicWidth <= 0 || mosaicHeight <= 0) {
              return;
            }

            const lengthRatio = clamp01(relX);
            const widthRatio = clamp01(1 - relY);
            const imageWorldWidth = mosaicWidth;
            const imageWorldHeight = mosaicHeight;

            let centerX = lengthRatio * imageWorldWidth;
            let centerY = widthRatio * imageWorldHeight;

            if (viewportInfo) {
              const halfW = viewportInfo.width / 2;
              const halfH = viewportInfo.height / 2;
              if (halfW * 2 <= imageWorldWidth) {
                centerX = Math.min(
                  imageWorldWidth - halfW,
                  Math.max(halfW, centerX),
                );
              } else {
                centerX = imageWorldWidth / 2;
              }
              if (halfH * 2 <= imageWorldHeight) {
                centerY = Math.min(
                  imageWorldHeight - halfH,
                  Math.max(halfH, centerY),
                );
              } else {
                centerY = imageWorldHeight / 2;
              }
            } else {
              centerX = Math.min(imageWorldWidth, Math.max(0, centerX));
              centerY = Math.min(imageWorldHeight, Math.max(0, centerY));
            }

            onViewportCenterChange({ x: centerX, y: centerY });
          }}
        >
          <div className="absolute -top-4 left-0 right-0 text-center text-[10px] text-muted-foreground/50 font-mono">
            {title}
          </div>

          {/* 右上角：图像数量标签 */}
          <div className="absolute -top-4 right-0 text-[10px] text-primary/80 font-mono bg-background/80 px-1.5 py-0.5 rounded">
            {frameCount} frames
          </div>

          {/* 瓦片背景 */}
          {tileImages}
          {showTileBorders && (
            <div className="absolute inset-0 border-2 border-dashed border-yellow-500/50 pointer-events-none z-10" />
          )}

          {/* 鸟瞰图视口框 */}
          {viewportBox}

          {/* 帧刻度线（替换原有网格） */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {Array.from({ length: frameCount + 1 }).map((_, i) => {
              const position = (i / frameCount) * 100;
              return (
                <div
                  key={`frame-${surf}-${i}`}
                  className="absolute h-full border-l border-muted-foreground"
                  style={{ left: `${position}%` }}
                />
              );
            })}
          </div>

          {/* 坐标原点调试点：表示旋转后 (0,0) 期望位置 */}
          {/* Selected defect marker (hollow cross) */}
          {selectedDefect && (() => {
            const { x, y, w, h } = computeDisplayRect(
              selectedDefect,
              meta,
              perSurfaceHeight,
              plateWidth,
            );
            const centerX = x + w / 2;
            const centerY = y + h / 2;
            const crossSize = Math.max(
              12,
              Math.min(
                28,
                Math.round(Math.min(perSurfaceHeight, plateWidth) * 0.06),
              ),
            );
            return (
              <div
                className="absolute pointer-events-none z-20"
                style={{
                  left: centerX,
                  top: centerY,
                  width: crossSize,
                  height: crossSize,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary" />
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary" />
              </div>
            );
          })()}

          {/* 缺陷矩形 */}
          {plateDefects.map((defect) => {
            const { x, y, w, h } = computeDisplayRect(
              defect,
              meta,
              perSurfaceHeight,
              plateWidth,
            );
            const borderColor = getDefectBorderColor(defect.type);
            const isSelected =
              selectedDefectId === defect.id &&
              (selectedDefectSurface ? selectedDefectSurface === defect.surface : true);

            return (
              <div
                key={`${defect.surface}-${defect.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDefectSelectDetail?.(defect);
                  onDefectSelect?.(defect.id);
                }}
                onMouseEnter={(e) =>
                  onDefectHover?.(defect, { screenX: e.clientX, screenY: e.clientY })
                }
                onMouseMove={(e) =>
                  onDefectHover?.(defect, { screenX: e.clientX, screenY: e.clientY })
                }
                onMouseLeave={() => onDefectHoverEnd?.()}
                className={`absolute border-2 ${borderColor} opacity-30 ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-primary/80 ring-offset-background"
                    : ""
                } cursor-pointer`}
                style={{
                  left: x,
                  top: y,
                  width: Math.max(w, 3),
                  height: Math.max(h, 3),
                }}
                title={`${defect.type} - ${defect.severity} (${Math.round(defect.confidence * 100)}%)`}
              />
            );
          })}
        </div>

        {/* 下刻度尺 - 仅在下表面显示 */}
        {surf === "bottom" && renderRuler("bottom")}
      </div>
    );
  };

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    surface?: Surface;
    tileX?: number;
    tileY?: number;
    level?: number;
    tileWidth?: number;
    tileHeight?: number;
  } | null>(null);

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 打开缺陷图片
  const handleOpenImage = useCallback((seqNo: number) => {
    const surface = contextMenu?.surface || "top";

    if (!seqNo) {
      closeContextMenu();
      return;
    }

    // 计算图像URL（使用默认的缺陷图像URL或大图URL）
    const baseUrl = env.getApiBaseUrl();
    const imageUrl = `${baseUrl}/images/crop?surface=${surface}&seq_no=${seqNo}&fmt=JPEG&scale=1`;

    window.open(imageUrl, "_blank");
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const jumpToImageUrl = useCallback(() => {
    if (typeof seqNo === "number") {
      handleOpenImage(seqNo);
    }
    closeContextMenu();
  }, [seqNo, handleOpenImage, closeContextMenu]);

  const toggleScaleMode = useCallback(() => {
    if (setDistributionScaleMode) {
      const newMode: DistributionScaleMode = distributionScaleMode === "stretch" ? "fit" : "stretch";
      setDistributionScaleMode(newMode);
    }
    closeContextMenu();
  }, [distributionScaleMode, setDistributionScaleMode, closeContextMenu]);

  // 处理右键点击事件
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const sharedScrollWidth = Math.max(
    containerWidth,
    surface === "top"
      ? calculateFinalDimensions.topWidth
      : surface === "bottom"
        ? calculateFinalDimensions.bottomWidth
        : Math.max(
            calculateFinalDimensions.topWidth,
            calculateFinalDimensions.bottomWidth,
          ),
  );
  const perSurfaceHeight =
    calculateFinalDimensions.perSurfaceHeight ??
    calculateFinalDimensions.height / (surface === "all" ? 2 : 1);
  const surfaceViewportHeight = perSurfaceHeight + RULER_HEIGHT;
  const dragCursor = isDraggingDistribution ? "grabbing" : "grab";
  const middleScrollbarMaxScroll = Math.max(
    0,
    sharedScrollWidth - Math.max(1, containerWidth),
  );
  const middleScrollbarThumbWidth =
    middleScrollbarMaxScroll > 1
      ? Math.min(
          Math.max(1, containerWidth),
          Math.max(
            36,
            (Math.max(1, containerWidth) / Math.max(1, sharedScrollWidth)) *
              Math.max(1, containerWidth),
          ),
        )
      : Math.max(1, containerWidth);
  const middleScrollbarTravel = Math.max(
    1,
    Math.max(1, containerWidth) - middleScrollbarThumbWidth,
  );
  const middleScrollbarLeft =
    middleScrollbarMaxScroll > 1
      ? Math.min(
          middleScrollbarTravel,
          Math.max(
            0,
            (Math.min(distributionScrollLeft, middleScrollbarMaxScroll) /
              middleScrollbarMaxScroll) *
              middleScrollbarTravel,
          ),
        )
      : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col"
      style={{ 
        height: `${calculateFinalDimensions.height}px`,
        minHeight: `${calculateFinalDimensions.height}px`
      }}
    >

      {/* 横向滚动容器 - 支持横向滚动查看长钢板 */}
      <div
        ref={scrollContainerRef}
        className="distribution-scroll-container flex-1 overflow-x-auto overflow-y-hidden select-none"
        onScroll={handleDistributionScroll}
        onWheel={handleWheel}
        onPointerDown={handleDistributionPointerDown}
        onPointerMove={handleDistributionPointerMove}
        onPointerUp={handleDistributionPointerUp}
        onPointerCancel={endDistributionDrag}
        onPointerLeave={endDistributionDrag}
        onMouseDown={handleDistributionMouseDown}
        onMouseMove={handleDistributionMouseMove}
        onMouseUp={handleDistributionMouseUp}
        onMouseLeave={handleDistributionMouseUp}
        onClickCapture={handleDistributionClickCapture}
        style={{ cursor: dragCursor }}
        // onContextMenu={handleContextMenu}  // 暂时禁用右键菜单
      >
        <div className="flex flex-col gap-0 h-full" style={{ width: sharedScrollWidth }}>
          {surface === "all" ? (
            <>
              {renderPlate("top", perSurfaceHeight)}
              {renderPlate("bottom", perSurfaceHeight)}
            </>
          ) : (
            renderPlate(
              surface === "top" ? "top" : "bottom",
              perSurfaceHeight,
            )
          )}
        </div>
      </div>

      {surface === "all" && middleScrollbarMaxScroll > 1 && (
        <div
          className="absolute left-0 right-0 z-30 bg-transparent"
          style={{
            height: MIDDLE_SCROLLBAR_HIT_HEIGHT,
            top: surfaceViewportHeight - MIDDLE_SCROLLBAR_HIT_HEIGHT / 2,
            pointerEvents: "none",
          }}
        >
          <div
            className="distribution-middle-scrollbar relative h-full bg-transparent"
            onPointerDown={handleMiddleScrollbarPointerDown}
            onPointerMove={handleMiddleScrollbarPointerMove}
            onPointerUp={endMiddleScrollbarDrag}
            onPointerCancel={endMiddleScrollbarDrag}
            style={{ pointerEvents: "auto" }}
          >
            <div
              className="distribution-middle-scrollbar-thumb absolute"
              style={{
                left: middleScrollbarLeft,
                top:
                  (MIDDLE_SCROLLBAR_HIT_HEIGHT -
                    MIDDLE_SCROLLBAR_THUMB_HEIGHT) /
                  2,
                width: middleScrollbarThumbWidth,
                height: MIDDLE_SCROLLBAR_THUMB_HEIGHT,
              }}
            />
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-[#1e293b] text-white rounded shadow-xl z-50 p-2 border border-[#30363d]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            transform: "translate(4px, 4px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold mb-1 text-[#e0e0e0]">分布图选项</div>
          <button
            onClick={toggleScaleMode}
            className="w-full text-left px-2 py-1 text-xs hover:bg-[#30363d] rounded"
          >
            {distributionScaleMode === "stretch" ? "切换到等比模式" : "切换到拉伸模式"}
          </button>
          <button
            onClick={jumpToImageUrl}
            className="w-full text-left px-2 py-1 text-xs hover:bg-[#30363d] rounded"
          >
            跳转到高分辨率图像
          </button>
          <button
            onClick={closeContextMenu}
            className="w-full text-left px-2 py-1 text-xs hover:bg-[#30363d] rounded"
          >
            取消
          </button>
        </div>
      )}
      <div
        className="absolute top-0 right-0 p-2 text-[10px] text-muted-foreground pointer-events-none"
        title="缩放模式：拉伸模式会将分布图拉伸到容器宽度，等比模式保持比例"
      >
            {distributionScaleMode === "stretch" ? "拉伸模式" : "等比模式"}
      </div>
      <div
        className="absolute bottom-0 right-0 p-2 text-[10px] text-muted-foreground pointer-events-none"
      >
        右键查看选项
      </div>
    </div>
  );
}
