import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Images,
} from "lucide-react";
import type {
  ActiveTab,
  SurfaceFilter,
  SteelPlate,
} from "../../types/app.types";

interface MobileNavBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  setSelectedPlateId: (id: string | null) => void;
  surfaceFilter: SurfaceFilter;
  setSurfaceFilter: (filter: SurfaceFilter) => void;
  setShowPlatesPanel: (show: boolean) => void;
  lineLabel?: string;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  setActiveTab,
  filteredSteelPlates,
  selectedPlateId,
  setSelectedPlateId,
  surfaceFilter,
  setSurfaceFilter,
  setShowPlatesPanel,
  lineLabel,
}) => {
  const handleTabSwitch = () => {
    if (activeTab === "defects") {
      setActiveTab("images");
    } else if (activeTab === "images") {
      setActiveTab("defects");
    } else {
      setActiveTab("defects");
    }
  };

  const handlePrevPlate = () => {
    if (filteredSteelPlates.length === 0) return;
    const currentIndex = filteredSteelPlates.findIndex(
      (p) => p.serialNumber === selectedPlateId,
    );
    const prevIndex =
      currentIndex > 0
        ? currentIndex - 1
        : filteredSteelPlates.length - 1;
    const prevPlate = filteredSteelPlates[prevIndex];
    if (prevPlate) setSelectedPlateId(prevPlate.serialNumber);
  };

  const handleNextPlate = () => {
    if (filteredSteelPlates.length === 0) return;
    const currentIndex = filteredSteelPlates.findIndex(
      (p) => p.serialNumber === selectedPlateId,
    );
    const nextIndex =
      currentIndex < filteredSteelPlates.length - 1
        ? currentIndex + 1
        : 0;
    const nextPlate = filteredSteelPlates[nextIndex];
    if (nextPlate) setSelectedPlateId(nextPlate.serialNumber);
  };

  const currentPlateId = (() => {
    const currentPlate =
      filteredSteelPlates.find(
        (p) => p.serialNumber === selectedPlateId,
      ) || filteredSteelPlates[0];
    return currentPlate?.plateId || "-";
  })();

  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-2 shrink-0 gap-2">
      {/* 左侧：钢板列表按钮 */}
      <button
        onClick={() => setShowPlatesPanel(true)}
        className="p-2 bg-[rgba(23,23,23,0)] text-[rgb(0,0,0)] hover:bg-primary/80 rounded shrink-0"
        title="钢板列表"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* 中间区域：缺陷/图像切换 + 钢板切换 + 表面切换 */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
        {lineLabel && (
          <span className="max-w-[120px] truncate text-[10px] text-muted-foreground border border-border/50 bg-muted/40 px-2 py-0.5 rounded">
            {lineLabel}
          </span>
        )}
        {/* 缺陷/图像切换 */}
        <button
          onClick={handleTabSwitch}
          className="flex items-center gap-1 px-2 py-1.5 bg-muted hover:bg-accent border border-border rounded shrink-0 transition-colors"
          title={
            activeTab === "defects"
              ? "切换到图像"
              : activeTab === "images"
                ? "切换到缺陷"
                : "缺陷/图像"
          }
        >
          {activeTab === "defects" ? (
            <>
              <AlertCircle className="w-4 h-4" />
              <ChevronRight className="w-3 h-3" />
              <Images className="w-4 h-4" />
            </>
          ) : (
            <>
              <Images className="w-4 h-4" />
              <ChevronRight className="w-3 h-3" />
              <AlertCircle className="w-4 h-4" />
            </>
          )}
        </button>

        {/* 钢板切换 */}
        {filteredSteelPlates.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded shrink-0">
            <button
              onClick={handlePrevPlate}
              className="p-0.5 hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-colors rounded"
              disabled={filteredSteelPlates.length === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-foreground px-1 min-w-[70px] text-center">
              {currentPlateId}
            </span>
            <button
              onClick={handleNextPlate}
              className="p-0.5 hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-colors rounded"
              disabled={filteredSteelPlates.length === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 表面切换（上表/下表/全部） */}
        {(activeTab === "defects" ||
          activeTab === "images") && (
          <div className="flex items-center gap-1 bg-muted border border-border rounded p-0.5 shrink-0">
            <button
              onClick={() => setSurfaceFilter("top")}
              className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                surfaceFilter === "top"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              上表
            </button>
            <button
              onClick={() => setSurfaceFilter("bottom")}
              className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                surfaceFilter === "bottom"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              下表
            </button>
            <button
              onClick={() => setSurfaceFilter("all")}
              className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                surfaceFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              全部
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
