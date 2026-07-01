import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import type { SteelPlate } from '../../types/app.types';
import type { SearchCriteria, FilterCriteria } from '../SearchDialog';
import { getLevelText } from '../../utils/steelPlates';
import { useNewItemKeys } from '../../hooks/useNewItems';
import {
  getCacheStatus,
  listCacheRecords,
  type CacheRecordItem,
  type CacheStatus,
} from '../../api/cache';

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

type PlateCacheBadge = {
  label: string;
  className: string;
  title: string;
};

const parseSeqNo = (value: string | number): number | null => {
  const seqNo = Number(value);
  return Number.isFinite(seqNo) ? seqNo : null;
};

const getRunningCacheSeqNo = (status: CacheStatus | null): number | null => {
  const seqNo = Number(status?.seq_no ?? status?.task?.current_seq);
  return Number.isFinite(seqNo) ? seqNo : null;
};

const resolveCacheBadge = (
  plate: SteelPlate,
  cacheRecord: CacheRecordItem | undefined,
  cacheRangeMin: number | null,
  cacheStatus: CacheStatus | null,
  isLoading: boolean,
): PlateCacheBadge => {
  const seqNo = parseSeqNo(plate.serialNumber);
  const runningSeqNo = getRunningCacheSeqNo(cacheStatus);
  const surfaces = cacheRecord?.surfaces ?? [];
  const missingCount = surfaces.filter((surface) => surface.image_missing).length;
  const staleCount = surfaces.filter((surface) => surface.stale).length;
  const cachedCount = surfaces.filter((surface) => surface.cached).length;
  const cacheRecordIsReady =
    Boolean(cacheRecord) &&
    missingCount === 0 &&
    staleCount === 0 &&
    (cacheRecord?.status === "complete" || cachedCount >= 2);
  if (
    seqNo !== null &&
    runningSeqNo === seqNo &&
    cacheStatus?.state &&
    cacheStatus.state !== "ready" &&
    !cacheRecordIsReady
  ) {
    return {
      label: "缓存中",
      className: "border-blue-400/50 bg-blue-500/15 text-blue-300",
      title: cacheStatus.message || "后台正在建立缓存",
    };
  }
  if (seqNo !== null && cacheRangeMin !== null && seqNo < cacheRangeMin) {
    return {
      label: "范围外",
      className: "border-slate-500/40 bg-slate-500/10 text-slate-300",
      title: `超出当前磁盘缓存保留范围，最小流水号 ${cacheRangeMin}`,
    };
  }
  if (!cacheRecord) {
    return {
      label: isLoading ? "查询中" : "未扫描",
      className: isLoading
        ? "border-blue-400/40 bg-blue-500/10 text-blue-300"
        : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
      title: isLoading ? "正在读取缓存状态" : "暂未发现该钢卷的缓存记录",
    };
  }

  const surfaceText = surfaces
    .map((surface) => `${surface.surface === "top" ? "上" : "下"}:${surface.cached ? "已" : "无"}${surface.stale ? "/旧" : ""}${surface.image_missing ? "/缺图" : ""}`)
    .join(" ");

  if (missingCount > 0) {
    return {
      label: "缺图",
      className: "border-red-500/50 bg-red-500/15 text-red-300",
      title: `缓存状态：图像缺失 ${surfaceText}`,
    };
  }
  if (staleCount > 0) {
    return {
      label: "过期",
      className: "border-yellow-500/50 bg-yellow-500/15 text-yellow-300",
      title: `缓存参数已变化，需要重建 ${surfaceText}`,
    };
  }
  if (cacheRecord.status === "building" || surfaces.some((surface) => surface.building)) {
    return {
      label: "缓存中",
      className: "border-blue-400/50 bg-blue-500/15 text-blue-300",
      title: `后台正在建立缓存 ${surfaceText}`,
    };
  }
  if (cacheRecord.status === "complete" || cachedCount >= 2) {
    return {
      label: "已缓存",
      className: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
      title: `上下表缓存完整 ${surfaceText}`,
    };
  }
  if (cacheRecord.status === "partial" || cachedCount === 1) {
    return {
      label: "半缓存",
      className: "border-cyan-500/50 bg-cyan-500/15 text-cyan-300",
      title: `部分表面已缓存 ${surfaceText}`,
    };
  }
  return {
    label: "未缓存",
    className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
    title: `尚未建立磁盘缓存 ${surfaceText}`,
  };
};

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
  const newPlateKeys = useNewItemKeys(
    filteredSteelPlates,
    (plate) => plate.serialNumber,
  );
  const [cacheItems, setCacheItems] = useState<CacheRecordItem[]>([]);
  const [cacheRangeMin, setCacheRangeMin] = useState<number | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  const visibleSeqNos = useMemo(
    () =>
      filteredSteelPlates
        .map((plate) => parseSeqNo(plate.serialNumber))
        .filter((seqNo): seqNo is number => seqNo !== null)
        .slice(0, 200),
    [filteredSteelPlates],
  );
  const visibleSeqKey = visibleSeqNos.join(",");
  const cacheRecordMap = useMemo(() => {
    const map = new Map<number, CacheRecordItem>();
    cacheItems.forEach((item) => {
      map.set(item.seq_no, item);
    });
    return map;
  }, [cacheItems]);

  useEffect(() => {
    if (isCollapsed || visibleSeqNos.length === 0) {
      setCacheItems([]);
      setCacheRangeMin(null);
      setCacheStatus(null);
      return;
    }

    let cancelled = false;
    let loading = false;
    const loadCacheState = async () => {
      if (document.visibilityState === "hidden" || loading) {
        return;
      }
      loading = true;
      setIsLoadingCache(true);
      try {
        const pageSize = Math.max(1, Math.min(200, visibleSeqNos.length));
        const [recordsResult, statusResult] = await Promise.allSettled([
          listCacheRecords(1, pageSize, visibleSeqNos),
          getCacheStatus().catch(() => null),
        ]);
        if (cancelled) return;
        if (recordsResult.status === "fulfilled") {
          setCacheItems(recordsResult.value.items ?? []);
          setCacheRangeMin(recordsResult.value.cache_range_min ?? null);
        } else {
          console.warn("Load plate cache records failed", recordsResult.reason);
        }
        if (statusResult.status === "fulfilled") {
          setCacheStatus(statusResult.value);
        }
      } catch (error) {
        console.warn("Load plate cache state failed", error);
      } finally {
        loading = false;
        if (!cancelled) {
          setIsLoadingCache(false);
        }
      }
    };

    loadCacheState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadCacheState();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const timer = window.setInterval(loadCacheState, 10000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(timer);
    };
  }, [isCollapsed, visibleSeqKey]);

  if (isCollapsed) return null;

  const currentPlate = filteredSteelPlates.find(p => p.serialNumber === selectedPlateId) || 
                       filteredSteelPlates[0] || 
                       steelPlates[0];
  const currentSeqNo = currentPlate ? parseSeqNo(currentPlate.serialNumber) : null;
  const currentCacheBadge = currentPlate
    ? resolveCacheBadge(
        currentPlate,
        currentSeqNo !== null ? cacheRecordMap.get(currentSeqNo) : undefined,
        cacheRangeMin,
        cacheStatus,
        isLoadingCache,
      )
    : null;

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
              {currentCacheBadge && (
                <div className="flex justify-between py-0.5 border-t border-border/30">
                  <span className="text-muted-foreground">缓存</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-sm border text-[10px] ${currentCacheBadge.className}`}
                    title={currentCacheBadge.title}
                  >
                    {currentCacheBadge.label}
                  </span>
                </div>
              )}
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
          filteredSteelPlates.map((plate, index) => {
            const seqNo = parseSeqNo(plate.serialNumber);
            const cacheBadge = resolveCacheBadge(
              plate,
              seqNo !== null ? cacheRecordMap.get(seqNo) : undefined,
              cacheRangeMin,
              cacheStatus,
              isLoadingCache,
            );
            return (
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
              <div className="flex items-center gap-1">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-sm border ${cacheBadge.className}`}
                  title={cacheBadge.title}
                >
                  {cacheBadge.label}
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
            );
          })
        )}
      </div>
      
    </div>
  );
};
