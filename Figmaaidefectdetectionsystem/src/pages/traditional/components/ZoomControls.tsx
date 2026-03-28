import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit?: () => void;
  disabled?: boolean;
}

/**
 * 缩放控制组件
 *
 * 提供放大、缩小、重置等缩放功能
 */
export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  disabled = false,
}: ZoomControlsProps) {
  const scalePercent = Math.round(scale * 100);

  return (
    <div className="flex items-center gap-1 bg-card/80 backdrop-blur border border-border/50 rounded-lg px-1.5 py-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        disabled={disabled || scale <= 0.1}
        className="w-7 h-7 p-0"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </Button>
      <span className="text-xs font-mono w-12 text-center">
        {scalePercent}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        disabled={disabled || scale >= 10}
        className="w-7 h-7 p-0"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </Button>
      <div className="w-px h-4 bg-border/50" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={disabled}
        className="w-7 h-7 p-0"
        title="重置缩放"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </Button>
      {onFit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onFit}
          disabled={disabled}
          className="w-7 h-7 p-0"
          title="适应窗口"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
