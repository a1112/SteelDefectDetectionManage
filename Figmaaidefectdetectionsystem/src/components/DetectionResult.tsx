import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import type { Defect } from "../types/app.types";

interface DetectionResultProps {
  imageUrl: string;
  defects: Defect[];
  isDetecting: boolean;
}

export function DetectionResult({
  imageUrl,
  defects,
  isDetecting,
}: DetectionResultProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 缩放和平移状态
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] =
    useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = useState(1);

  // 绘制图像（不绘制缺陷标注）
  const drawCanvas = useCallback(() => {
    if (imageRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = imageRef.current;

      if (ctx && img.complete) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image only (no defect annotations)
        ctx.drawImage(img, 0, 0);
      }
    }
  }, [imageUrl]);

  // 重绘 canvas
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, imageUrl]);

  // 滚轮缩放
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const delta = e.deltaY * -0.01;
      const newScale = Math.min(
        Math.max(0.1, scale + delta * 0.5),
        10,
      );

      // 获取容器的位置信息
      const rect = container.getBoundingClientRect();
      const containerCenterX = rect.width / 2;
      const containerCenterY = rect.height / 2;

      // 鼠标相对于容器的位置
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 鼠标相对于图像中心的偏移（缩放前）
      const offsetX =
        (mouseX - containerCenterX - position.x) / scale;
      const offsetY =
        (mouseY - containerCenterY - position.y) / scale;

      // 计算新的位置，使鼠标指向的点保持不变
      const newPositionX =
        mouseX - containerCenterX - offsetX * newScale;
      const newPositionY =
        mouseY - containerCenterY - offsetY * newScale;

      setScale(newScale);
      setPosition({ x: newPositionX, y: newPositionY });
    },
    [scale, position],
  );

  // 鼠标按下开始拖拽
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [position],
  );

  // 鼠标移动拖拽
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart],
  );

  // 鼠标抬起停止拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 缩放按钮功能
  const zoomIn = () =>
    setScale((prev) => Math.min(prev + 0.25, 10));
  const zoomOut = () =>
    setScale((prev) => Math.max(prev - 0.25, 0.1));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 添加滚轮事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, {
        passive: false,
      });
      return () =>
        container.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  // 计算两个触摸点之间的距离
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 触摸开始
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // 单指拖拽
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      } else if (e.touches.length === 2) {
        // 双指缩放
        e.preventDefault();
        const distance = getTouchDistance(e.touches);
        setInitialPinchDistance(distance);
        setInitialPinchScale(scale);
        setIsDragging(false);
      }
    },
    [position, scale],
  );

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        // 单指拖拽
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      } else if (
        e.touches.length === 2 &&
        initialPinchDistance !== null
      ) {
        // 双指缩放
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const scaleChange =
          currentDistance / initialPinchDistance;
        const newScale = Math.min(
          Math.max(0.1, initialPinchScale * scaleChange),
          10,
        );
        setScale(newScale);
      }
    },
    [
      isDragging,
      dragStart,
      initialPinchDistance,
      initialPinchScale,
    ],
  );

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black/50 overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isDetecting && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
            <Loader2 className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <p className="text-primary font-mono mt-4 tracking-widest">
            PROCESSING DATA STREAM...
          </p>
          <div className="w-48 h-1 bg-secondary mt-2 overflow-hidden">
            <div className="h-full bg-primary animate-[progress_1s_ease-in-out_infinite] origin-left scale-x-50"></div>
          </div>
        </div>
      )}

      {/* 缩放控制面板 */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-card/90 hover:bg-primary border border-border hover:border-primary text-foreground hover:text-primary-foreground flex items-center justify-center transition-colors backdrop-blur-sm"
          title="放大 (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-card/90 hover:bg-primary border border-border hover:border-primary text-foreground hover:text-primary-foreground flex items-center justify-center transition-colors backdrop-blur-sm"
          title="缩小 (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          className="w-8 h-8 bg-card/90 hover:bg-primary border border-border hover:border-primary text-foreground hover:text-primary-foreground flex items-center justify-center transition-colors backdrop-blur-sm"
          title="重置 (Reset)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* 缩放比例显示 */}
        <div className="w-8 h-8 bg-card/90 border border-border text-foreground flex items-center justify-center text-[10px] font-mono font-bold backdrop-blur-sm">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* 可缩放和平移的图像 */}
      <div
        className="relative transition-transform duration-150 ease-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Detection Source"
          className="hidden"
          onLoad={drawCanvas}
        />
        <canvas
          ref={canvasRef}
          className="shadow-2xl border border-border/50"
          style={{
            display: "block",
            maxWidth: "none",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}