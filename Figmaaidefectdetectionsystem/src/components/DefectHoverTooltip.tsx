import { useMemo } from "react";
import { getDefectImageUrl } from "../api/client";
import type { Surface } from "../api/types";

interface HoverDefectInfo {
  id: string;
  type: string;
  surface: Surface;
  imageIndex?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  xMm?: number;
  yMm?: number;
}

interface DefectHoverTooltipProps {
  defect: HoverDefectInfo;
  screenX: number;
  screenY: number;
  offset?: number;
  plateSize?: { width: number; length: number };
  cardWidth?: number;
  imageStretch?: boolean;
}

export function DefectHoverTooltip({
  defect,
  screenX,
  screenY,
  offset = 4,
  plateSize,
  cardWidth = 220,
  imageStretch = false,
}: DefectHoverTooltipProps) {
  const imageHeight = Math.round(cardWidth * (120 / 220));
  const tooltipHeight = imageHeight + 92;
  const imageUrl = useMemo(
    () =>
      getDefectImageUrl({
        defectId: defect.id,
        surface: defect.surface,
      }),
    [defect.id, defect.surface],
  );

  const tooltipStyle = useMemo(() => {
    const maxWidth = cardWidth;
    const maxHeight = tooltipHeight;
    let left = screenX + offset;
    let top = screenY + offset;
    let positionAbove = false;

    if (typeof window !== "undefined") {
      const maxLeft = Math.max(0, window.innerWidth - maxWidth - 12);
      left = Math.min(left, maxLeft);

      // 检查是否应该显示在鼠标上方
      const spaceBelow = window.innerHeight - screenY - offset - 12;
      const spaceAbove = screenY - offset - 12;

      if (spaceBelow < maxHeight && spaceAbove > spaceBelow) {
        // 显示在鼠标上方
        positionAbove = true;
        top = screenY - maxHeight - offset;
      } else {
        // 显示在鼠标下方，但确保不超出屏幕
        const maxTop = Math.max(0, window.innerHeight - maxHeight - 12);
        top = Math.min(top, maxTop);
      }

      // 确保不超出顶部
      if (top < 12) {
        top = 12;
      }
    }
    return { left, top, positionAbove };
  }, [cardWidth, tooltipHeight, screenX, screenY, offset]);

  const displayX = Math.round(defect.xMm ?? defect.x);
  const displayY = Math.round(defect.yMm ?? defect.y);
  const defectWidth = defect.width ?? 0;
  const defectHeight = defect.height ?? 0;
  const distLeft = displayX;
  const distHead = displayY;
  const distRight =
    plateSize && plateSize.width > 0
      ? Math.max(0, plateSize.width - (displayX + defectWidth))
      : null;
  const distTail =
    plateSize && plateSize.length > 0
      ? Math.max(0, plateSize.length - (displayY + defectHeight))
      : null;

  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
    >
      <div
        className="bg-black/85 border border-[#30363d] rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-sm overflow-hidden"
        style={{ width: cardWidth }}
      >
        <div
          className="bg-[#0d1117] flex items-center justify-center overflow-hidden"
          style={{ height: imageHeight }}
        >
          <img
            src={imageUrl}
            alt="缺陷图像"
            className={`w-full h-full ${imageStretch ? "object-fill" : "object-cover"}`}
          />
        </div>
        <div className="p-2 text-[10px] text-[#c9d1d9] space-y-1">
          <div className="text-[11px] font-bold text-[#58a6ff]">
            {defect.type}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8b949e]">表面</span>
            <span>{defect.surface === "top" ? "上表" : "下表"}</span>
            {typeof defect.imageIndex === "number" && (
              <>
                <span className="text-[#8b949e]">图像</span>
                <span>{defect.imageIndex}</span>
              </>
            )}
          </div>
          <div className="text-[#8b949e]">
            缺陷ID: {defect.id}
          </div>
          <div className="text-[#8b949e]">
            位置: X {displayX}, Y {displayY}
          </div>
          <div className="text-[#8b949e] flex flex-wrap gap-x-2">
            <span>距头: {distHead}</span>
            <span>距尾: {distTail ?? "--"}</span>
            <span>距左: {distLeft}</span>
            <span>距右: {distRight ?? "--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
