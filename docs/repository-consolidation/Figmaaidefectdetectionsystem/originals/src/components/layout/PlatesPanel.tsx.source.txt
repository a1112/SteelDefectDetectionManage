import {
  Database,
  Search,
  Filter,
  BarChart3,
  Activity,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SteelPlate } from "../../types/app.types";
import type {
  SearchCriteria,
  FilterCriteria,
} from "../SearchDialog";
import { getLevelText } from "../../utils/steelPlates";
import { useNewItemKeys } from "../../hooks/useNewItems";

interface PlatesPanelProps {
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  setSelectedPlateId: (id: string | null) => void;
  isMobileDevice: boolean;
  setShowPlatesPanel: (show: boolean) => void;
  searchCriteria: SearchCriteria;
  setSearchCriteria: (criteria: SearchCriteria) => void;
  filterCriteria: FilterCriteria;
  setFilterCriteria: (criteria: FilterCriteria) => void;
  setIsFilterDialogOpen: (open: boolean) => void;
  setActiveTab: (tab: "reports" | "settings") => void;
  setIsDiagnosticDialogOpen: (open: boolean) => void;
  onPlateHover?: (
    plate: SteelPlate,
    position: { screenX: number; screenY: number },
  ) => void;
  onPlateHoverEnd?: () => void;
}

export const PlatesPanel: React.FC<PlatesPanelProps> = ({
  filteredSteelPlates,
  selectedPlateId,
  setSelectedPlateId,
  isMobileDevice,
  setShowPlatesPanel,
  searchCriteria,
  setSearchCriteria,
  filterCriteria,
  setFilterCriteria,
  setIsFilterDialogOpen,
  setActiveTab,
  setIsDiagnosticDialogOpen,
  onPlateHover,
  onPlateHoverEnd,
}) => {
  const navigate = useNavigate();
  const newPlateKeys = useNewItemKeys(
    filteredSteelPlates,
    (plate) => plate.serialNumber,
  );
  return (
    <div className="h-full flex flex-col bg-background">
      {/* 手机模式：顶部搜索栏 */}
      {isMobileDevice && (
        <div className="p-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索钢板号、流水号..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchCriteria({
                    plateId: value,
                    serialNumber: value,
                  });
                }}
              />
            </div>
            <button
              onClick={() => setIsFilterDialogOpen(true)}
              className={`p-2.5 rounded-lg border transition-colors ${
                filterCriteria.levels.length > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* 筛选标签显示 */}
          {(Object.keys(searchCriteria).length > 0 ||
            filterCriteria.levels.length > 0) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {filterCriteria.levels.map((level) => (
                <span
                  key={level}
                  className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full border border-primary/30"
                >
                  {getLevelText(level)}
                </span>
              ))}
              <button
                onClick={() => {
                  setSearchCriteria({});
                  setFilterCriteria({ levels: [] });
                }}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                清除筛选
              </button>
            </div>
          )}
        </div>
      )}

      {/* 钢板列表 */}
      <div className="flex-1 overflow-auto">
        {/* 统计信息 */}
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
                {
                  filteredSteelPlates.filter(
                    (p) => p.level === "A",
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                一等品
              </p>
            </div>
            <div className="text-center">
              <p
                className={`${isMobileDevice ? "text-xl" : "text-2xl"} font-bold text-yellow-500`}
              >
                {
                  filteredSteelPlates.filter(
                    (p) => p.level === "B" || p.level === "C",
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                合格品
              </p>
            </div>
            <div className="text-center">
              <p
                className={`${isMobileDevice ? "text-xl" : "text-2xl"} font-bold text-red-500`}
              >
                {
                  filteredSteelPlates.filter(
                    (p) => p.level === "D",
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                等外品
              </p>
            </div>
          </div>
        </div>

        {/* 钢板列表项 */}
        {filteredSteelPlates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Database className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm">没有找到匹配的钢板记录</p>
            <button
              onClick={() => {
                setSearchCriteria({});
                setFilterCriteria({ levels: [] });
              }}
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
                onClick={() => {
                  setSelectedPlateId(plate.serialNumber);
                  if (isMobileDevice) {
                    // 手机模式下点击后关闭钢板面板
                    setShowPlatesPanel(false);
                  }
                }}
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
                {/* 头部：流水号和等级 */}
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

                {/* 主要信息 */}
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

      {/* 底部导航栏（钢板面板显示时） - 报表/监控/设置 */}
      <div
        className={`bg-card border-t border-border flex items-center justify-around shrink-0 ${isMobileDevice ? "h-16 px-4 safe-area-inset-bottom" : "h-12 px-8"}`}
      >
        <button
          onClick={() => {
            setShowPlatesPanel(false);
            navigate("/reports");
          }}
          className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
            isMobileDevice
              ? "flex-col px-4 py-2"
              : "flex-row px-6 py-2"
          }`}
        >
          <BarChart3
            className={isMobileDevice ? "w-7 h-7" : "w-5 h-5"}
          />
          <span
            className={
              isMobileDevice
                ? "text-[11px] font-medium"
                : "text-sm font-medium"
            }
          >
            报表
          </span>
        </button>

        <button
          onClick={() => {
            setIsDiagnosticDialogOpen(true);
            setShowPlatesPanel(false);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
            isMobileDevice
              ? "flex-col px-4 py-2"
              : "flex-row px-6 py-2"
          }`}
        >
          <Activity
            className={isMobileDevice ? "w-7 h-7" : "w-5 h-5"}
          />
          <span
            className={
              isMobileDevice
                ? "text-[11px] font-medium"
                : "text-sm font-medium"
            }
          >
            系统监控
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("settings");
            setShowPlatesPanel(false);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
            isMobileDevice
              ? "flex-col px-4 py-2"
              : "flex-row px-6 py-2"
          }`}
        >
          <Settings
            className={isMobileDevice ? "w-7 h-7" : "w-5 h-5"}
          />
          <span
            className={
              isMobileDevice
                ? "text-[11px] font-medium"
                : "text-sm font-medium"
            }
          >
            设置
          </span>
        </button>
      </div>
    </div>
  );
};
