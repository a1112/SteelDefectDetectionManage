import { AlertTriangle, Circle, Target } from "lucide-react";
import { useCallback, memo } from "react";
import type { Defect } from "../types/app.types";
import { useNewItemKeys } from "../hooks/useNewItems";
import { getDefectSelectionKey } from "../utils/defectSelection";

interface DefectListProps {
  defects: Defect[];
  surface: "all" | "top" | "bottom";
  defectColors?: {
    [key: string]: { bg: string; border: string; text: string };
  };
  selectedDefectId?: string | null;
  selectedDefectSurface?: "top" | "bottom" | null;
  onDefectSelect?: (id: string | null) => void;
  onDefectSelectDetail?: (defect: Defect | null) => void;
  onDefectHover?: (defect: Defect, position: { screenX: number; screenY: number }) => void;
  onDefectHoverEnd?: () => void;
}

export function DefectList({
  defects,
  surface,
  defectColors,
  selectedDefectId,
  selectedDefectSurface,
  onDefectSelect,
  onDefectSelectDetail,
  onDefectHover,
  onDefectHoverEnd,
}: DefectListProps) {
  const newDefectKeys = useNewItemKeys(defects, (defect) =>
    getDefectSelectionKey({ id: defect.id, surface: defect.surface }),
  );

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-500 border-red-500/50 bg-red-500/10";
      case "medium":
        return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
      case "low":
        return "text-green-500 border-green-500/50 bg-green-500/10";
      default:
        return "text-muted-foreground border-border bg-muted/50";
    }
  }, []);

  const getDefectColor = useCallback((type: string) => {
    if (defectColors && defectColors[type]) {
      return defectColors[type];
    }
    return {
      bg: "bg-primary/10",
      border: "border-primary/40",
      text: "text-primary",
    };
  }, [defectColors]);

  return (
    <div className="h-full flex flex-col">
      {defects.length === 0 ? (
        <div className="flex-1 flex flex-col text-muted-foreground/50">
          <div className="flex flex-col items-center justify-center py-4 border-b border-border/30">
            <Target className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">NO DEFECTS DETECTED</p>
            <p className="text-[10px] mt-1 opacity-50">
              SHOWING SAMPLE DATA
            </p>
          </div>

          {/* 模拟示例数据 */}
          <div className="p-2 space-y-1">
              {[
                {
                id: "sample-1",
                type: "纵向裂纹",
                severity: "high" as const,
                confidence: 0.89,
                x: 45,
                y: 32,
                width: 8,
                height: 15,
                surface: "top" as const,
              },
              {
                id: "sample-2",
                type: "划伤",
                severity: "medium" as const,
                confidence: 0.76,
                x: 68,
                y: 54,
                width: 12,
                height: 4,
                surface: "top" as const,
              },
              {
                id: "sample-3",
                type: "辊印",
                severity: "low" as const,
                confidence: 0.82,
                x: 23,
                y: 71,
                width: 6,
                height: 9,
                surface: "bottom" as const,
              },
            ]
              .filter(
                (d) =>
                  surface === "all" || d.surface === surface,
              )
              .map((defect, index) => (
                <div
                  key={defect.id}
                  className="flex items-center gap-2 px-2 py-1.5 border border-border/30 bg-card/30 opacity-40 text-xs"
                >
                  <span className="text-muted-foreground font-mono w-8">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-foreground flex-1">
                    {defect.type}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    ({Math.round(defect.x)},
                    {Math.round(defect.y)})
                  </span>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                      defect.surface === "top"
                        ? "border-blue-300 text-blue-500/90 bg-blue-500/10"
                        : "border-orange-300 text-orange-500/90 bg-orange-500/10"
                    }`}
                  >
                    {defect.surface === "top" ? "TOP" : "BOTTOM"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] uppercase border ${getSeverityColor(defect.severity)}`}
                  >
                    {Math.round(defect.confidence * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {defects.map((defect, index) => {
            const typeColor = getDefectColor(defect.type);
            const isSelected =
              selectedDefectId === defect.id &&
              (selectedDefectSurface ? selectedDefectSurface === defect.surface : true);
            return (
            <div
              key={`${defect.surface}-${defect.id}-${index}`}
              onClick={() => {
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
              className={`flex items-center gap-2 px-2 py-1.5 border bg-card hover:bg-accent/50 transition-colors text-xs cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border"
              } ${newDefectKeys.has(getDefectSelectionKey({ id: defect.id, surface: defect.surface })) ? "list-enter" : ""}`}
            >
              <span className="text-muted-foreground font-mono w-8">
                #{index + 1}
              </span>
              <span
                className={`font-medium flex-1 ${typeColor.text}`}
              >
                {defect.type}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                ({Math.round(defect.x)},{Math.round(defect.y)}
                )
              </span>
              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                  defect.surface === "top"
                    ? "border-blue-300 text-blue-500/90 bg-blue-500/10"
                    : "border-orange-300 text-orange-500/90 bg-orange-500/10"
                }`}
              >
                {defect.surface === "top" ? "TOP" : "BOTTOM"}
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] uppercase border ${getSeverityColor(defect.severity)}`}
              >
                {Math.round(defect.confidence * 100)}%
              </span>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}

export const DefectListMemo = memo(DefectList);
