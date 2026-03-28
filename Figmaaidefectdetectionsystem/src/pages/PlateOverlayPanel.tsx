import type { Dispatch, SetStateAction } from "react";
import { Database, Filter, Search, X } from "lucide-react";
import type { SearchCriteria } from "../components/SearchDialog";
import type { FilterCriteria } from "../components/FilterDialog";
import type { SteelPlate } from "../types/app.types";
import { getLevelText } from "../utils/steelPlates";
import { PlateListContent } from "./PlateListContent";

interface PlateOverlayPanelProps {
  isMobileDevice: boolean;
  searchCriteria: SearchCriteria;
  setSearchCriteria: Dispatch<SetStateAction<SearchCriteria>>;
  filterCriteria: FilterCriteria;
  setFilterCriteria: Dispatch<SetStateAction<FilterCriteria>>;
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  setSelectedPlateId: (plateId: string) => void;
  setIsSearchDialogOpen: (open: boolean) => void;
  setIsFilterDialogOpen: (open: boolean) => void;
  setShowPlatesPanel: (open: boolean) => void;
  onPlateHover?: (
    plate: SteelPlate,
    position: { screenX: number; screenY: number },
  ) => void;
  onPlateHoverEnd?: () => void;
}

export function PlateOverlayPanel({
  isMobileDevice,
  searchCriteria,
  setSearchCriteria,
  filterCriteria,
  setFilterCriteria,
  filteredSteelPlates,
  selectedPlateId,
  setSelectedPlateId,
  setIsSearchDialogOpen,
  setIsFilterDialogOpen,
  setShowPlatesPanel,
  onPlateHover,
  onPlateHoverEnd,
}: PlateOverlayPanelProps) {
  const handleClearFilters = () => {
    setSearchCriteria({});
    setFilterCriteria({ levels: [] });
  };

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col bg-background ${isMobileDevice ? "-m-2" : "-m-4"}`}
    >
      <div
        className={`bg-card border-b border-border shrink-0 ${isMobileDevice ? "p-3" : "p-4"}`}
      >
        <div className="flex items-center gap-2">
          {!isMobileDevice && (
            <div className="flex items-center gap-2 mr-2">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="font-medium">钢板列表</h2>
            </div>
          )}

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索钢板号、流水号..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onChange={(event) => {
                const value = event.target.value;
                setSearchCriteria({
                  plateId: value,
                  serialNumber: value,
                });
              }}
            />
          </div>
          <button
            onClick={() => setIsSearchDialogOpen(true)}
            className={`p-2.5 rounded-lg border transition-colors ${
              Object.keys(searchCriteria).length > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-border text-muted-foreground"
            }`}
            title="高级查询"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsFilterDialogOpen(true)}
            className={`p-2.5 rounded-lg border transition-colors ${
              filterCriteria.levels.length > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-border text-muted-foreground"
            }`}
            title="筛选"
          >
            <Filter className="w-5 h-5" />
          </button>

          {!isMobileDevice && (
            <button
              onClick={() => setShowPlatesPanel(false)}
              className="p-2.5 rounded-lg border border-border bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="关闭钢板列表"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

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
              onClick={handleClearFilters}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      <PlateListContent
        filteredSteelPlates={filteredSteelPlates}
        selectedPlateId={selectedPlateId}
        onPlateSelect={(plateId) => {
          setSelectedPlateId(plateId);
          setShowPlatesPanel(false);
        }}
        isMobileDevice={isMobileDevice}
        onClearFilters={handleClearFilters}
        onPlateHover={onPlateHover}
        onPlateHoverEnd={onPlateHoverEnd}
      />
    </div>
  );
}
