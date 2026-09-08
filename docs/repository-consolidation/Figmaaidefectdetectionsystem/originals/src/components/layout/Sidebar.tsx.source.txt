import { Search, Filter, RotateCcw } from 'lucide-react';
import type { SteelPlate } from '../../types/app.types';
import type { SearchCriteria, FilterCriteria } from '../SearchDialog';
import { getLevelText } from '../../utils/steelPlates';
import { useNewItemKeys } from '../../hooks/useNewItems';

interface SidebarProps {
  isCollapsed: boolean;
  filteredSteelPlates: SteelPlate[];
  steelPlates: SteelPlate[];
  selectedPlateId: string | null;
  setSelectedPlateId: (id: string | null) => void;
  isLoadingSteels: boolean;
  searchCriteria: SearchCriteria;
  setSearchCriteria: (criteria: SearchCriteria) => void;
  filterCriteria: FilterCriteria;
  setFilterCriteria: (criteria: FilterCriteria) => void;
  setIsSearchDialogOpen: (open: boolean) => void;
  setIsFilterDialogOpen: (open: boolean) => void;
  searchButtonRef: React.RefObject<HTMLButtonElement>;
  filterButtonRef: React.RefObject<HTMLButtonElement>;
  onPlateHover?: (
    plate: SteelPlate,
    position: { screenX: number; screenY: number },
  ) => void;
  onPlateHoverEnd?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  filteredSteelPlates,
  steelPlates,
  selectedPlateId,
  setSelectedPlateId,
  isLoadingSteels,
  searchCriteria,
  setSearchCriteria,
  filterCriteria,
  setFilterCriteria,
  setIsSearchDialogOpen,
  setIsFilterDialogOpen,
  searchButtonRef,
  filterButtonRef,
  onPlateHover,
  onPlateHoverEnd,
}) => {
  if (isCollapsed) return null;
  const newPlateKeys = useNewItemKeys(
    filteredSteelPlates,
    (plate) => plate.serialNumber,
  );

  const currentPlate = filteredSteelPlates.find(p => p.serialNumber === selectedPlateId) || 
                       filteredSteelPlates[0] || 
                       steelPlates[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t border-border">
      {/* 当前钢板信息 + 统计 */}
      <div className="p-2 bg-muted/10 border-b border-border">
        <div className="bg-card border border-border/50">
          {!currentPlate ? (
            <div className="p-2 text-xs text-center text-muted-foreground">
              {isLoadingSteels ? '加载中...' : '暂无钢板数据'}
            </div>
          ) : (
            <div className="p-2 text-xs space-y-1">
              {/* 当前板号 */}
              <div className="flex justify-between items-center py-0.5 border-b border-border/30">
                <span className="text-muted-foreground">当前板号</span>
                <span className="font-mono font-bold text-sm">{currentPlate.plateId}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground">流水号</span>
                <span className="font-mono font-bold">{currentPlate.serialNumber}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground">钢种</span>
                <span className="font-mono font-bold">{currentPlate.steelGrade}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground">规格</span>
                <span className="font-mono font-bold text-[10px]">
                  {currentPlate.dimensions.length}×{currentPlate.dimensions.width}×{currentPlate.dimensions.thickness}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground">时间</span>
                <span className="font-mono">{currentPlate.timestamp.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground">等级</span>
                <span className={`px-1.5 py-0.5 rounded-sm border ${
                  currentPlate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                  currentPlate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  currentPlate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                  'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>{getLevelText(currentPlate.level)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">缺陷数</span>
                <span className="font-mono font-bold text-red-400">{currentPlate.defectCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 钢板质量统计概览：总数 / 一等品 / 合格品 / 等外品 */}
      <div className="px-2 pt-2 pb-1 bg-muted/10 border-b border-border">
        <div className="bg-card border border-border p-2">
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">
                {filteredSteelPlates.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">总数</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-500">
                {filteredSteelPlates.filter(p => p.level === 'A').length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">一等品</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-500">
                {filteredSteelPlates.filter(p => p.level === 'B' || p.level === 'C').length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">合格品</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-500">
                {filteredSteelPlates.filter(p => p.level === 'D').length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">等外品</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-2 bg-muted/20 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          钢板记录 
          <span className="ml-1 text-[9px] text-primary">
            {(Object.keys(searchCriteria).length > 0 || filterCriteria.levels.length > 0) 
              ? `(${filteredSteelPlates.length}/${steelPlates.length})`
              : `(${steelPlates.length})`
            }
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <button 
            ref={searchButtonRef}
            onClick={() => setIsSearchDialogOpen(true)}
            className={`p-1 hover:bg-accent/50 border transition-colors rounded ${
              Object.keys(searchCriteria).length > 0 
                ? 'bg-primary/20 border-primary/50 text-primary' 
                : 'border-border/50 bg-card/50 text-muted-foreground'
            }`}
            title="查询"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button 
            ref={filterButtonRef}
            onClick={() => setIsFilterDialogOpen(true)}
            className={`p-1 hover:bg-accent/50 border transition-colors rounded ${
              filterCriteria.levels.length > 0 
                ? 'bg-primary/20 border-primary/50 text-primary' 
                : 'border-border/50 bg-card/50 text-muted-foreground'
            }`}
            title="筛选"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => {
              setSearchCriteria({});
              setFilterCriteria({ levels: [] });
            }}
            className="p-1 hover:bg-accent/50 border border-border/50 bg-card/50 text-muted-foreground transition-colors rounded"
            title="刷新/重置"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {filteredSteelPlates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-xs">没有找到匹配的钢板记录</p>
            <button
              onClick={() => {
                setSearchCriteria({});
                setFilterCriteria({ levels: [] });
              }}
              className="mt-2 text-[10px] text-primary hover:underline"
            >
              清除筛选条件
            </button>
          </div>
        ) : (
          filteredSteelPlates.map((plate, index) => (
          <div 
            key={`${plate.plateId}-${plate.serialNumber}-${index}`}
            onClick={() => setSelectedPlateId(plate.serialNumber)}
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
            className={`p-1.5 border transition-all cursor-pointer ${
              selectedPlateId === plate.serialNumber 
                ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' 
                : 'bg-card/50 border-border/50 hover:bg-accent/30 hover:border-border'
            } ${newPlateKeys.has(String(plate.serialNumber)) ? "list-enter" : ""}`}
          >
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[9px] font-mono text-muted-foreground">
                {plate.serialNumber}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                plate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                plate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                plate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {getLevelText(plate.level)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className={`text-xs font-mono font-bold ${selectedPlateId === plate.serialNumber ? 'text-primary-foreground' : ''}`}>
                {plate.plateId}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {plate.steelGrade}
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
              {plate.dimensions.length}×{plate.dimensions.width}×{plate.dimensions.thickness}
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">
              Defects: {plate.defectCount}
            </div>
          </div>
          ))
        )}
      </div>
      
    </div>
  );
};
