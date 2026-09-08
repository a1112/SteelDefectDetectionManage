import { DefectList } from "../DefectList";
import { DefectDistributionChart } from "../DefectDistributionChart";
import { DefectImageView, type ViewportInfo } from "../DefectImageView";
import { DefectNavigationBar } from "../DefectNavigationBar";
import type {
  ActiveTab,
  SurfaceFilter,
  ImageViewMode,
  ManualConfirmStatus,
  Defect,
  SteelPlate,
  ImageOrientation,
  DistributionScaleMode,
} from "../../types/app.types";
import type { SurfaceImageInfo } from "../../api/types";
import type {
  SearchCriteria,
  FilterCriteria,
} from "../SearchDialog";
import { useEffect, useMemo, useState } from "react";

interface DefectsPageProps {
  isMobileDevice: boolean;
  steelPlates: SteelPlate[];
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  plateDefects: Defect[];
  surfaceImageInfo: SurfaceImageInfo[] | null;
  surfaceFilter: SurfaceFilter;
  setSurfaceFilter: (filter: SurfaceFilter) => void;
  availableDefectTypes: string[];
  selectedDefectTypes: string[];
  setSelectedDefectTypes: (types: string[]) => void;
  defectColors: {
    [key: string]: {
      bg: string;
      border: string;
      text: string;
      activeBg: string;
      activeBorder: string;
      activeText: string;
    };
  };
  defectAccentColors: Record<string, string>;
  imageViewMode: ImageViewMode;
  setImageViewMode: (mode: ImageViewMode) => void;
  manualConfirmStatus: ManualConfirmStatus;
  setManualConfirmStatus: (status: ManualConfirmStatus) => void;
  selectedDefectId: string | null;
  selectedDefectSurface: "top" | "bottom" | null;
  setSelectedDefectId: (id: string | null) => void;
  setSelectedDefectSurface: (surface: "top" | "bottom" | null) => void;
  searchCriteria: SearchCriteria;
  filterCriteria: FilterCriteria;
  imageOrientation: ImageOrientation;
  defaultTileSize: number;
  maxTileLevel: number;
  showDistributionImages: boolean;
  showTileBorders: boolean;
  distributionScaleMode: DistributionScaleMode;
  setDistributionScaleMode?: (mode: DistributionScaleMode) => void;
  onDefectHover?: (defect: Defect, position: { screenX: number; screenY: number }) => void;
  onDefectHoverEnd?: () => void;
}

export const DefectsPage: React.FC<DefectsPageProps> = ({
  isMobileDevice,
  steelPlates,
  filteredSteelPlates,
  selectedPlateId,
  plateDefects,
  surfaceImageInfo,
  surfaceFilter,
  setSurfaceFilter,
  availableDefectTypes,
  selectedDefectTypes,
  setSelectedDefectTypes,
  defectColors,
  defectAccentColors,
  imageViewMode,
  setImageViewMode,
  manualConfirmStatus,
  setManualConfirmStatus,
  selectedDefectId,
  selectedDefectSurface,
  setSelectedDefectId,
  setSelectedDefectSurface,
  searchCriteria,
  filterCriteria,
  imageOrientation,
  defaultTileSize,
  maxTileLevel,
  showDistributionImages,
  showTileBorders,
  distributionScaleMode,
  setDistributionScaleMode,
  onDefectHover,
  onDefectHoverEnd,
}) => {
  const activeDefects: Defect[] = plateDefects;

  const filteredDefectsByControls = activeDefects.filter(
    (defect) =>
      (surfaceFilter === "all" ||
        defect.surface === surfaceFilter) &&
      selectedDefectTypes.includes(defect.type),
  );

  const selectedPlate: SteelPlate | undefined =
    filteredSteelPlates.find(
      (p) => p.serialNumber === selectedPlateId,
    ) || filteredSteelPlates[0];

  const selectedDefect =
    selectedDefectId && filteredDefectsByControls.length > 0
      ? filteredDefectsByControls.find(
          (d) =>
            d.id === selectedDefectId &&
            (selectedDefectSurface ? d.surface === selectedDefectSurface : true),
        ) || null
      : null;
  const selectedDefectByIdOnly = useMemo(
    () =>
      selectedDefectId
        ? filteredDefectsByControls.find((d) => d.id === selectedDefectId) ?? null
        : null,
    [filteredDefectsByControls, selectedDefectId],
  );

  const handleDefectSelectDetail = (defect: Defect | null) => {
    setSelectedDefectId(defect?.id ?? null);
    setSelectedDefectSurface(defect?.surface ?? null);
  };

  const [viewportInfo, setViewportInfo] = useState<ViewportInfo | null>(null);
  const [viewerSurface, setViewerSurface] = useState<"top" | "bottom">("top");
  const [centerTarget, setCenterTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const next =
      selectedDefect?.surface === "bottom" ? "bottom" : selectedDefect?.surface === "top" ? "top" : null;
    if (next) {
      setViewerSurface(next);
    }
  }, [selectedDefect?.surface]);

  useEffect(() => {
    if (!selectedDefectId || selectedDefect || !selectedDefectByIdOnly) return;
    setSelectedDefectSurface(selectedDefectByIdOnly.surface);
  }, [selectedDefectId, selectedDefect, selectedDefectByIdOnly, setSelectedDefectSurface]);

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 主区域：左侧图像 / 右侧列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
        {/* 左侧：图像区域（仅保留主图，移除缺陷分布图） */}
        <div className="lg:col-span-2 flex flex-col gap-2 min-h-0">
          <div className="flex-1 bg-card border border-border p-1 relative min-h-[260px] flex flex-col">
            {/* 顶部标签栏：视图模式 + 人工确认状态 + 选中缺陷信息 */}
            <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-bold z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 bg-black/20 rounded p-0.5 shrink-0">
                  <button
                    onClick={() => setImageViewMode("full")}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      imageViewMode === "full"
                        ? "bg-white text-primary"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    大图
                  </button>
                  <button
                    onClick={() => setImageViewMode("single")}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      imageViewMode === "single"
                        ? "bg-white text-primary"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    缺陷
                  </button>
                </div>
                {manualConfirmStatus && (
                  <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-0.5 border border-white/20">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        manualConfirmStatus === "unprocessed"
                          ? "bg-gray-400"
                          : manualConfirmStatus === "ignore"
                            ? "bg-blue-400"
                            : manualConfirmStatus === "A"
                              ? "bg-green-500"
                              : manualConfirmStatus === "B"
                                ? "bg-blue-500"
                                : manualConfirmStatus === "C"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                      }`}
                    />
                    <span className="text-[10px] text-white/90">
                      {manualConfirmStatus === "unprocessed"
                        ? "未处理"
                        : manualConfirmStatus === "ignore"
                          ? "不处理"
                          : manualConfirmStatus === "A"
                            ? "一等品"
                            : manualConfirmStatus === "B"
                              ? "二等品"
                              : manualConfirmStatus === "C"
                                ? "三等品"
                                : "等外品"}
                    </span>
                  </div>
                )}
              </div>

              {/* 右侧：缺陷详细信息 + 视图像素信息 */}
              <div className="flex items-center gap-2 text-[10px] font-normal">
                {imageViewMode === "full" && viewportInfo && (
                  <div className="flex items-center gap-2 bg-black/30 rounded px-2 py-0.5 border border-white/10 font-mono">
                    <span>X: {Math.round(viewportInfo.x)}</span>
                    <span>Y: {Math.round(viewportInfo.y)}</span>
                    <span>W: {Math.round(viewportInfo.width)}</span>
                    <span>H: {Math.round(viewportInfo.height)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black/40 mt-5 relative">
              {selectedPlate ? (
                <DefectImageView
                  selectedPlate={selectedPlate}
                  defects={activeDefects}
                  viewerSurface={viewerSurface}
                  imageViewMode={imageViewMode}
                  selectedDefectId={selectedDefectId}
                  selectedDefectSurface={selectedDefectSurface}
                  onDefectSelect={setSelectedDefectId}
                  onDefectHover={onDefectHover}
                  onDefectHoverEnd={onDefectHoverEnd}
                  surfaceImageInfo={surfaceImageInfo}
                  onViewportChange={setViewportInfo}
                  centerTarget={centerTarget}
                  imageOrientation={imageOrientation}
                  defaultTileSize={defaultTileSize}
                  maxTileLevel={maxTileLevel}
                />
              ) : (
                <div className="text-xs text-muted-foreground">
                  请选择左侧钢板记录。
                </div>
              )}
            </div>
          </div>

          {/* 缺陷缩略分布图（小钢板示意） */}
          <div className={`bg-card border border-border ${isMobileDevice ? "hidden" : ""}`}>
            <DefectDistributionChart
              defects={filteredDefectsByControls}
              surface={surfaceFilter}
              defectColors={defectColors}
              surfaceImageInfo={surfaceImageInfo}
              selectedDefectId={selectedDefectId}
              selectedDefectSurface={selectedDefectSurface}
              onDefectSelect={setSelectedDefectId}
              onDefectSelectDetail={handleDefectSelectDetail}
              onDefectHover={onDefectHover}
              onDefectHoverEnd={onDefectHoverEnd}
              viewportInfo={viewportInfo}
              viewportSurface={selectedDefect?.surface ?? null}
              imageOrientation={imageOrientation}
              onViewportCenterChange={setCenterTarget}
              defaultTileSize={defaultTileSize}
              maxTileLevel={maxTileLevel}
              showDistributionImages={showDistributionImages}
              showTileBorders={showTileBorders}
              distributionScaleMode={distributionScaleMode}
              setDistributionScaleMode={setDistributionScaleMode}
              seqNo={
                selectedPlate
                  ? parseInt(selectedPlate.serialNumber, 10)
                  : undefined
              }
            />
          </div>
        </div>

        {/* 右侧：缺陷列表 */}
        <div className="flex flex-col gap-2 min-h-0 h-full">
          <div className="flex-1 min-h-0">
            <div className="bg-card border border-border p-1.5 flex flex-col h-full min-h-[180px]">
              <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                缺陷信息
              </span>
            </div>

            {/* 选中缺陷的详细信息卡片 */}
            {selectedDefect && (
              <div className="mb-2 p-2 bg-card/50 rounded border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ 
                        backgroundColor: defectAccentColors[selectedDefect.type] || '#888' 
                      }}
                    />
                    <span className="text-xs font-semibold">{selectedDefect.type}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                    selectedDefect.severity === 'high' 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : selectedDefect.severity === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {selectedDefect.severity}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">位置: </span>
                    <span className="font-mono">({selectedDefect.x.toFixed(0)}, {selectedDefect.y.toFixed(0)})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">尺寸: </span>
                    <span className="font-mono">{selectedDefect.width.toFixed(0)}×{selectedDefect.height.toFixed(0)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">置信度: </span>
                    <span className="font-mono font-semibold">{Math.round(selectedDefect.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 缺陷列表标题 */}
            <div className="mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                缺陷列表
              </span>
            </div>

            {/* 缺陷列表 */}
            <div className="flex-1 min-h-0 overflow-auto">
              <DefectList
                defects={filteredDefectsByControls}
                surface={surfaceFilter}
                defectColors={defectColors}
                selectedDefectId={selectedDefectId}
                selectedDefectSurface={selectedDefectSurface}
                onDefectSelect={setSelectedDefectId}
                onDefectSelectDetail={handleDefectSelectDetail}
                onDefectHover={onDefectHover}
                onDefectHoverEnd={onDefectHoverEnd}
              />
            </div>

            {/* 缺陷导航栏 */}
            <div className="mt-2">
              <DefectNavigationBar
                defects={filteredDefectsByControls}
                selectedDefectId={selectedDefectId}
                selectedDefectSurface={selectedDefectSurface}
                onDefectSelect={setSelectedDefectId}
                onDefectSelectDetail={handleDefectSelectDetail}
              />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
