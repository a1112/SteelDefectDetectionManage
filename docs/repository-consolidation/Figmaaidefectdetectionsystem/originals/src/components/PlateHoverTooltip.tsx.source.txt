import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { getDefectImageUrl } from "../api/client";
import type { Surface } from "../api/types";
import type { SteelPlate } from "../types/app.types";
import { getLevelText } from "../utils/steelPlates";

interface PlateHoverTooltipProps {
  plate: SteelPlate;
  screenX: number;
  screenY: number;
  offset?: number;
  defectSummary?: Array<{ type: string; count: number }>;
  showPreview?: boolean;
  previewGroups?: Array<{
    label: string;
    count: number;
    classId?: number | null;
    items: Array<{ id: string; surface: Surface }>;
  }>;
  maxSummaryItems?: number;
  previewMaxCategories?: number;
  previewMaxItems?: number;
  previewItemSize?: number;
}

export function PlateHoverTooltip({
  plate,
  screenX,
  screenY,
  offset = 6,
  defectSummary,
  showPreview = false,
  previewGroups,
  maxSummaryItems = 5,
  previewMaxCategories = 6,
  previewMaxItems = 5,
  previewItemSize = 32,
}: PlateHoverTooltipProps) {
  const tooltipStyle = useMemo(() => {
    const maxWidth = 260 + (showPreview ? 280 : 0);
    const maxHeight = 170;
    let left = screenX + offset;
    let top = screenY + offset;

    if (typeof window !== "undefined") {
      const maxLeft = Math.max(0, window.innerWidth - maxWidth - 12);
      left = Math.min(left, maxLeft);

      // 检查是否应该显示在鼠标上方
      const spaceBelow = window.innerHeight - screenY - offset - 12;
      const spaceAbove = screenY - offset - 12;

      if (spaceBelow < maxHeight && spaceAbove > spaceBelow) {
        // 显示在鼠标上方
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
    return { left, top };
  }, [screenX, screenY, offset, showPreview]);

  const levelBadgeClass =
    plate.level === "A"
      ? "bg-green-500/10 border-green-500/30 text-green-400"
      : plate.level === "B"
        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
        : plate.level === "C"
          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
          : "bg-red-500/10 border-red-500/30 text-red-400";

  const displaySummary = defectSummary?.slice(0, maxSummaryItems) ?? [];
  const summaryRemaining = Math.max(
    0,
    (defectSummary?.length ?? 0) - displaySummary.length,
  );
  const displayPreviewGroups =
    previewGroups?.slice(0, previewMaxCategories) ?? [];
  const previewImageStyle = {
    width: previewItemSize,
    height: previewItemSize,
  };

  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
    >
      <div className="flex items-start gap-2">
        <div className="relative w-[260px] bg-popover/95 text-popover-foreground border border-border rounded-sm shadow-lg backdrop-blur-sm overflow-hidden">
          <div className="px-2 py-1.5 bg-muted/40 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-primary">
                {plate.plateId}
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] border rounded ${levelBadgeClass}`}
              >
                {getLevelText(plate.level)}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              NO.{plate.serialNumber}
            </div>
          </div>
          <div className="p-2 text-[10px] text-foreground/90 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">钢种</span>
              <span className="font-mono">{plate.steelGrade}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">规格</span>
              <span className="font-mono">
                {plate.dimensions.length}×{plate.dimensions.width}×{plate.dimensions.thickness}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">缺陷数量</span>
              <span
                className={`font-mono ${plate.defectCount > 5 ? "text-destructive" : ""}`}
              >
                {plate.defectCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">时间</span>
              <span className="font-mono">
                {plate.timestamp.toLocaleString("zh-CN")}
              </span>
            </div>
            <div className="pt-1">
              <div className="text-muted-foreground">缺陷分布</div>
              {defectSummary ? (
                defectSummary.length === 0 ? (
                  <div className="text-muted-foreground">无缺陷</div>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {displaySummary.map((item) => (
                      <span
                        key={item.type}
                        className="px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/90"
                      >
                        {item.type} {item.count}
                      </span>
                    ))}
                    {summaryRemaining > 0 && (
                      <span className="px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                        +{summaryRemaining}
                      </span>
                    )}
                  </div>
                )
              ) : (
                <div className="text-muted-foreground">加载中...</div>
              )}
            </div>
          </div>
          {!showPreview && (
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-popover/90 p-1 shadow">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
        {showPreview && (
          <div className="w-[280px] bg-popover/95 text-popover-foreground border border-border rounded-sm shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="px-2 py-1.5 bg-muted/40 border-b border-border text-[10px] text-muted-foreground">
              缺陷小图
            </div>
            <div className="p-2 text-[10px] space-y-2">
              {!previewGroups ? (
                <div className="text-muted-foreground">加载中...</div>
              ) : displayPreviewGroups.length === 0 ? (
                <div className="text-muted-foreground">无缺陷</div>
              ) : (
                displayPreviewGroups.map((group) => (
                  <div key={`${group.label}-${group.classId ?? "na"}`}>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{group.label}</span>
                      <span className="font-mono">{group.count}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {group.items.slice(0, previewMaxItems).map((item) => (
                        <img
                          key={item.id}
                          src={getDefectImageUrl({
                            defectId: item.id,
                            surface: item.surface,
                          })}
                          alt={group.label}
                          className="rounded border border-border object-cover"
                          style={previewImageStyle}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
