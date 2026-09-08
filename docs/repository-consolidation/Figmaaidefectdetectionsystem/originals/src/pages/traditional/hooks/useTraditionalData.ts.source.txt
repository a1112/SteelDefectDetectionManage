import { useState, useCallback, useEffect } from "react";
import { env } from "../../../config/env";
import {
  listSteels,
  searchSteels,
  getTestModelStatus,
  getConfigStatusSimple,
  type SteelItem,
  type SearchCriteria,
} from "../../../api/client";
import { toast } from "sonner";

export interface TraditionalDataState {
  plates: SteelItem[];
  selectedPlate: SteelItem | null;
  plateDefects: any[];
  surfaceImages: any[];
  isLoading: boolean;
  searchCriteria: SearchCriteria;
  filterCriteria: any;
  testModelEnabled: boolean;
  simpleStatus: any;
}

export interface TraditionalDataActions {
  setSelectedPlate: (plate: SteelItem | null) => void;
  setPlateDefects: (defects: any[]) => void;
  setSurfaceImages: (images: any[]) => void;
  setSearchCriteria: (criteria: SearchCriteria) => void;
  setFilterCriteria: (criteria: any) => void;
  loadPlatesWithCriteria: (criteria: SearchCriteria, limit: number, forceSearch: boolean) => Promise<void>;
  handleRefresh: (refreshLimit: number) => Promise<void>;
}

const DEFAULT_DEFECT_CROP_EXPAND = 100;

/**
 * 数据管理 Hook
 *
 * 负责钢板数据、缺陷数据和搜索过滤状态的管理
 */
export function useTraditionalData(
  currentLineKey: string,
  refreshLimit: number
): [TraditionalDataState, TraditionalDataActions] {
  const [plates, setPlates] = useState<SteelItem[]>([]);
  const [selectedPlate, setSelectedPlate] = useState<SteelItem | null>(null);
  const [plateDefects, setPlateDefects] = useState<any[]>([]);
  const [surfaceImages, setSurfaceImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [filterCriteria, setFilterCriteria] = useState<any>({ levels: [] });
  const [testModelEnabled, setTestModelEnabled] = useState(false);
  const [simpleStatus, setSimpleStatus] = useState<any>(null);

  // 加载测试模型状态
  useEffect(() => {
    let mounted = true;
    const loadTestModel = async () => {
      try {
        const status = await getTestModelStatus();
        if (mounted) setTestModelEnabled(Boolean(status.enabled));
      } catch {
        if (mounted) setTestModelEnabled(false);
      }
    };
    void loadTestModel();
    return () => {
      mounted = false;
    };
  }, []);

  // 加载系统状态
  useEffect(() => {
    let mounted = true;
    const loadSimple = async () => {
      try {
        const kind = "2D";
        const status = await getConfigStatusSimple(currentLineKey || env.getLineName(), kind);
        if (mounted) setSimpleStatus(status);
      } catch {
        if (mounted) setSimpleStatus(null);
      }
    };
    void loadSimple();
    const timer = window.setInterval(loadSimple, 2000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [currentLineKey]);

  // 加载钢板数据
  const loadPlatesWithCriteria = useCallback(
    async (criteria: SearchCriteria, limit: number, forceSearch: boolean) => {
      setIsLoading(true);
      try {
        const hasCriteria = Object.keys(criteria).length > 0;
        const limitToUse = Math.max(1, Math.min(limit, 200));

        let items: SteelItem[];
        const shouldSearch = env.isProduction() && (hasCriteria || forceSearch);

        if (shouldSearch) {
          try {
            items = await searchSteels({
              limit: limitToUse,
              serialNumber: criteria.serialNumber,
              plateId: criteria.plateId,
              dateFrom: criteria.dateFrom,
              dateTo: criteria.dateTo,
            });
          } catch (err) {
            console.warn("查询接口不可用，回退到列表接口", err);
            items = await listSteels(limitToUse);
          }
        } else {
          items = await listSteels(limitToUse);
        }

        setPlates(items);

        if (items.length > 0) {
          setSelectedPlate((prev) => {
            if (prev) {
              const found = items.find((s) => s.serialNumber === prev.serialNumber);
              return found || items[0];
            }
            return items[0];
          });
        } else {
          setSelectedPlate(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleRefresh = useCallback(
    async (refreshLimit: number) => {
      await loadPlatesWithCriteria(searchCriteria, refreshLimit, false);
      toast.success(`已刷新数据 (最新 ${refreshLimit} 条)`);
    },
    [loadPlatesWithCriteria, searchCriteria]
  );

  const state: TraditionalDataState = {
    plates,
    selectedPlate,
    plateDefects,
    surfaceImages,
    isLoading,
    searchCriteria,
    filterCriteria,
    testModelEnabled,
    simpleStatus,
  };

  const actions: TraditionalDataActions = {
    setSelectedPlate,
    setPlateDefects,
    setSurfaceImages,
    setSearchCriteria,
    setFilterCriteria,
    loadPlatesWithCriteria,
    handleRefresh,
  };

  return [state, actions];
}
