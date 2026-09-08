import { Database } from "lucide-react";
import type { SteelPlate } from "../types/app.types";
import { getLevelText } from "../utils/steelPlates";
import { useNewItemKeys } from "../hooks/useNewItems";

interface PlateListContentProps {
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  onPlateSelect: (plateId: string) => void;
  isMobileDevice: boolean;
  onClearFilters: () => void;
  onPlateHover?: (
    plate: SteelPlate,
    position: { screenX: number; screenY: number },
  ) => void;
  onPlateHoverEnd?: () => void;
}

export function PlateListContent({
  filteredSteelPlates,
  selectedPlateId,
  onPlateSelect,
  isMobileDevice,
  onClearFilters,
  onPlateHover,
  onPlateHoverEnd,
}: PlateListContentProps) {
  const newPlateKeys = useNewItemKeys(
    filteredSteelPlates,
    (plate) => plate.serialNumber,
  );
  const totalQualified = filteredSteelPlates.filter(
    (plate) => plate.level === "A",
  ).length;
  const totalNormal = filteredSteelPlates.filter(
    (plate) => plate.level === "B" || plate.level === "C",
  ).length;
  const totalRejected = filteredSteelPlates.filter(
    (plate) => plate.level === "D",
  ).length;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div
        className={`bg-card border-b border-border ${isMobileDevice ? "p-3" : "p-4"}`}
      >
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p
              className={`${isMobileDevice ? "text-xl" : "text-2xl"} font-bold text-primary`}
            >
              {filteredSteelPlates.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              总数
            </p>
          </div>
          <div className="text-center">
            <p
              className={`${isMobileDevice ? "text-xl" : "text-2xl"} font-bold text-green-500`}
            >
              {totalQualified}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              一等品
            </p>
          </div>
          <div className="text-center">
            <p
              className={`${isMobileDevice ? "text-xl" : "text-2xl"} font-bold text-yellow-500`}
            >
              {totalNormal}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              合格品
            </p>
          </div>
          <div className="text-center">
            <p
              className={`${isMobileDevice ? "text-xl" : "text-2xl"} font-bold text-red-500`}
            >
              {totalRejected}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              等外品
            </p>
          </div>
        </div>
      </div>

      {filteredSteelPlates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Database className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm">没有找到匹配的钢板记录</p>
          <button
            onClick={onClearFilters}
            className="mt-4 px-4 py-2 text-xs text-primary hover:underline"
          >
            清除筛选条件
          </button>
        </div>
      ) : (
        <div
          className={`${isMobileDevice ? "p-2" : "p-4"} space-y-2`}
        >
          {filteredSteelPlates.map((plate) => (
            <div
              key={plate.plateId}
              onClick={() => onPlateSelect(plate.serialNumber)}
              onMouseEnter={(event) =>
                onPlateHover?.(plate, {
                  screenX: event.clientX,
                  screenY: event.clientY,
                })
              }
              onMouseMove={(event) =>
                onPlateHover?.(plate, {
                  screenX: event.clientX,
                  screenY: event.clientY,
                })
              }
              onMouseLeave={() => onPlateHoverEnd?.()}
              className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedPlateId === plate.serialNumber
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border hover:border-primary/50"
              } ${newPlateKeys.has(String(plate.serialNumber)) ? "list-enter" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-muted-foreground">
                  NO.{plate.serialNumber}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    plate.level === "A"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : plate.level === "B"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : plate.level === "C"
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  {getLevelText(plate.level)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-bold text-foreground">
                    {plate.plateId}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {plate.steelGrade}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="font-medium">规格:</span>
                    <span className="font-mono">
                      {plate.dimensions.length}×
                      {plate.dimensions.width}×
                      {plate.dimensions.thickness}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="font-medium">缺陷:</span>
                    <span
                      className={`font-mono ${plate.defectCount > 5 ? "text-red-400" : "text-foreground"}`}
                    >
                      {plate.defectCount}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                  {plate.timestamp.toLocaleString("zh-CN")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
