import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Menu, Bell, User, Settings, Database, Shield, Monitor, 
  ChevronLeft, ChevronRight, Search, Play, Pause, Square,
  Maximize2, Minimize2, Minus, ZoomIn, ZoomOut, RefreshCcw, Clock, RotateCw, Gavel,
  Layout, BarChart3, AlertCircle, FileText, ChevronDown, Activity, Download,
  LogOut, Box, Terminal, Home, Calendar, LayoutGrid, Filter, ArrowUpToLine, X, Link2, ArrowLeftRight,
  PanelRightOpen, PanelRightClose, Target, Locate, Wrench, FlaskConical
} from "lucide-react";
import { StatusBar } from "../../components/layout/StatusBar";
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from "../../components/ThemeContext";
import { env } from "../../config/env";
import { isElectronRuntime, isTauriRuntime } from "../../utils/runtime";
import { withTauriWindow } from "../../utils/tauriWindow";
import { 
  listSteels, 
  getDefectsRaw, 
  getSteelMeta, 
  getTileImageUrl,
  getDefectImageUrl,
  getApiList,
  searchSteels,
  getGlobalMeta,
} from "../../api/client";
import { getConfigMate } from "../../api/admin";
import type { SteelItem, DefectItem, DefectItemRaw, SurfaceImageInfo, ApiNode } from "../../api/types";
import { toast } from "sonner@2.0.3";
import { DataSourceModal } from "../../components/modals/DataSourceModal";
import { SettingsModal } from "../../components/modals/SettingsModal";
import { SystemDiagnosticDialog } from "../../components/SystemDiagnosticDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";
import { getTestModelStatus } from "../../api/testModel";
import { getConfigStatusSimple } from "../../api/status";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { LoginModal } from "../../components/auth/LoginModal";
import { User as UserIcon, LogIn } from "lucide-react";
import type { AuthUser } from "../../api/admin";
import type { SearchCriteria } from "../../components/SearchDialog";
import type { FilterCriteria } from "../../components/FilterDialog";
import { FilterDialog } from "../../components/FilterDialog";
import { LargeImageViewer } from "../../components/LargeImageViewer/LargeImageViewer";
import { DefectHoverTooltip } from "../../components/DefectHoverTooltip";
import { PlateHoverTooltip } from "../../components/PlateHoverTooltip";
import { useGlobalUiSettings } from "../../hooks/useGlobalUiSettings";
import type { Tile } from "../../components/LargeImageViewer/utils";
import { drawTileImage, tryDrawFallbackTile } from "../../utils/tileFallback";
import { globalPreheatManager } from "../../utils/tilePreheatManager";
import {
  buildOrientationLayout,
  pickSurfaceForTile,
  computeTileRequestInfo,
  convertDefectToWorldRect,
  type SurfaceLayout,
} from "../../utils/imageOrientation";
import type { ImageOrientation } from "../../types/app.types";
import { useNewItemKeys } from "../../hooks/useNewItems";
import { getDefectSelectionKey } from "../../utils/defectSelection";

// Separate Clock component to prevent full page re-renders every second
const DEFAULT_DEFECT_TYPES = [
  { label: "划痕", color: "#3fb950" }, { label: "辊印", color: "#f85149" }, 
  { label: "头尾", color: "#d29922" }, { label: "氧化铁皮", color: "#58a6ff" },
  { label: "异物压入", color: "#bc8cff" }, { label: "周期性缺陷", color: "#ffffff" },
  { label: "油渍", color: "#1f6feb" }, { label: "气泡", color: "#db61a2" },
  { label: "结疤", color: "#79c0ff" }, { label: "折叠", color: "#fa7e7e" },
  { label: "边缘缺陷", color: "#ffa657" }, { label: "黑点", color: "#8b949e" }
];

const NAV_ITEMS = ["缺陷分析", "图像分析"];
const DEFAULT_DEFECT_CROP_EXPAND = 100;

// LRU 图像缓存导入
import { getOrCreateLRUCache } from "../../utils/lruImageCache";

// 使用 LRU 缓存，限制最大缓存数量防止内存泄漏
const mapTileImageCache = getOrCreateLRUCache("TraditionalMode-Map", 500);
const mapTileImageLoading = new Set<string>();
const analysisTileImageCache = getOrCreateLRUCache("TraditionalMode-Analysis", 500);
const analysisTileImageLoading = new Set<string>();

function LiveClock({ formatTime }: { formatTime: (date: Date) => string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-mono">{formatTime(time)}</span>;
}

function TimeSince({ timestamp }: { timestamp?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Only update once a minute for duration
    return () => clearInterval(timer);
  }, []);

  if (!timestamp) return <span>---</span>;
  
  const diff = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mon = Math.floor(day / 30);
  const yr = Math.floor(mon / 12);
  
  const res = [
    yr > 0 ? `${yr}年` : "",
    (mon % 12) > 0 ? `${mon % 12}月` : "",
    (day % 30) > 0 ? `${day % 30}天` : "",
    (hr % 24) > 0 ? `${hr % 24}时` : "",
    (min % 60) > 0 ? `${min % 60}分` : ""
  ].join("");
  
  return <span>{res || "刚刚"}</span>;
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function TraditionalMode() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { settings, updateSetting } = useGlobalUiSettings();
  const {
    distributionScaleMode,
    defectHoverCardWidth,
    defectHoverImageStretch,
    plateHoverEnabled,
    defectListHoverDefaultVisible,
    defectListHoverMaxCategories,
    defectListHoverMaxItems,
    defectListHoverItemSize,
  } = settings;
  const [plates, setPlates] = useState<SteelItem[]>([]);
  const [selectedPlate, setSelectedPlate] = useState<SteelItem | null>(null);
  const [plateDefects, setPlateDefects] = useState<DefectItem[]>([]);
  const [surfaceImages, setSurfaceImages] = useState<SurfaceImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [surfaceFilter, setSurfaceFilter] = useState<"all" | "top" | "bottom">("all");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const raw = window.localStorage.getItem("auth_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });

  const saveUser = (user: AuthUser | null) => {
    if (!user) {
      window.localStorage.removeItem("auth_user");
      return;
    }
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  };
  const [activeNav, setActiveNav] = useState("缺陷分析");
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testModelEnabled, setTestModelEnabled] = useState(false);
  const [simpleStatus, setSimpleStatus] = useState<{
    state?: string | null;
    message?: string | null;
    service?: string | null;
    data?: Record<string, any>;
  } | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const isElectron = isElectronRuntime();
  const isTauri = isTauriRuntime();
  const canDrag = isElectron || isTauri;
  const useElectronDragRegion = isElectron;
  const hasWindowControls = isElectron || isTauri;
  const isWebOnly = !isElectron && !isTauri;
  const handleTauriDragStart = (event: React.MouseEvent<HTMLElement>) => {
    if (!isTauri || event.button !== 0) return;
    if (event.detail > 1) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-radix-collection-item], [data-no-drag="true"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    void withTauriWindow((appWindow) => appWindow.startDragging());
  };
  const handleDragDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-radix-collection-item], [data-no-drag="true"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    if (isElectron) {
      window.electronWindow?.toggleMaximize?.().then((next) => {
        if (typeof next === "boolean") setIsMaximized(next);
      });
      return;
    }
    void withTauriWindow(async (appWindow) => {
      await appWindow.toggleMaximize();
      const next = await appWindow.isMaximized();
      if (typeof next === "boolean") setIsMaximized(next);
    });
  };
  const [isMaximized, setIsMaximized] = useState(false);
  const diagnosticButtonRef = useRef<HTMLButtonElement>(null);
  const [gridCols, setGridCols] = useState(6);
  const [isImageFit, setIsImageFit] = useState(true);
  const [queryTab, setQueryTab] = useState("SN"); // SN, ID, TIME
  const [sidebarTab, setSidebarTab] = useState<'records' | 'defects'>('records');
  const [refreshLimit, setRefreshLimit] = useState(20);
  
  useEffect(() => {
    if (!isElectron || !window.electronWindow?.isMaximized) return;
    window.electronWindow
      .isMaximized()
      .then(setIsMaximized)
      .catch(() => undefined);
  }, [isElectron]);
  useEffect(() => {
    if (!isTauri) return;
    let active = true;
    withTauriWindow(async (appWindow) => {
      const next = await appWindow.isMaximized();
      if (active && typeof next === "boolean") setIsMaximized(next);
    });
    return () => {
      active = false;
    };
  }, [isTauri]);

  useEffect(() => {
    const element = distributionPlateRef.current;
    if (!element) return;
    const updateSize = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width > 0 && height > 0) {
        setDistributionPlateSize({ width, height });
      }
    };
    // 使用 setTimeout 确保在布局完成后执行
    const timer = setTimeout(updateSize, 0);
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    const element = bottomDistributionPlateRef.current;
    if (!element) return;
    const updateSize = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width > 0 && height > 0) {
        setBottomDistributionPlateSize({ width, height });
      }
    };
    // 使用 setTimeout 确保在布局完成后执行
    const timer = setTimeout(updateSize, 0);
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Image Analysis State
  const [analysisScrollState, setAnalysisScrollState] = useState({ top: 0, height: 1, clientHeight: 1 });
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [selectedDefectSurface, setSelectedDefectSurface] = useState<"top" | "bottom" | null>(null);
  const [topCenterTarget, setTopCenterTarget] = useState<{ x: number; y: number } | null>(null);
  const [bottomCenterTarget, setBottomCenterTarget] = useState<{ x: number; y: number } | null>(null);
  const topViewportRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const bottomViewportRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const topScaleRef = useRef<number>(1);
  const bottomScaleRef = useRef<number>(1);
  const syncLockRef = useRef(false);
  const [isAnalysisSyncEnabled, setIsAnalysisSyncEnabled] = useState(true);
  const [isWidthLockEnabled, setIsWidthLockEnabled] = useState(true);
  const [topForcedScale, setTopForcedScale] = useState<number | null>(null);
  const [bottomForcedScale, setBottomForcedScale] = useState<number | null>(null);

  // Data Source State
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [currentLineKey, setCurrentLineKey] = useState(() => {
    return (env as any).getLineName?.() ?? "";
  });
  // 搜索与过滤状态（复用现代仪表盘逻辑）
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ levels: [] });
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const refreshDataSources = useCallback(async () => {
    try {
      const nodesData = await getApiList().catch(() => []);
      setApiNodes(nodesData);
    } catch (error) {
      console.error("Failed to refresh data sources", error);
    }
  }, []);

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

  const systemStatusLabel = (() => {
    if (!simpleStatus) return "系统就绪";
    const state = (simpleStatus.state || "").toLowerCase();
    if (state === "error") {
      return simpleStatus.message || "系统异常";
    }
    if (simpleStatus.service === "image_generate" && state === "running") {
      const seq = simpleStatus.data?.seq_no;
      const index = simpleStatus.data?.image_index;
      if (seq !== undefined && index !== undefined) {
        return `图像生成中：${seq}-${index}`;
      }
      return simpleStatus.message || "图像生成中";
    }
    return simpleStatus.message || "系统就绪";
  })();

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
          setSelectedPlate(prev => {
            if (prev) {
              const found = items.find(s => s.serialNumber === prev.serialNumber);
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

  const handleRefresh = useCallback(async () => {
    await loadPlatesWithCriteria(searchCriteria, refreshLimit, false);
    toast.success(`已刷新数据 (最新 ${refreshLimit} 条)`);
  }, [loadPlatesWithCriteria, searchCriteria, refreshLimit]);
  
  // Date Picker State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const [isDraggingPicker, setIsDraggingPicker] = useState(false);
  const [pickerDragStart, setPickerDragStart] = useState({ x: 0, y: 0 });

  // Defect Selection State
  const [defectTypeOptions, setDefectTypeOptions] = useState(
    DEFAULT_DEFECT_TYPES,
  );
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>(
    DEFAULT_DEFECT_TYPES.map((t) => t.label),
  );
  const [defectSeverityByName, setDefectSeverityByName] = useState<Record<string, number>>({});
  const [defectSeverityByClassId, setDefectSeverityByClassId] = useState<Record<number, number>>({});
  // 用于 LargeImageViewer 缺陷标注的缺陷类别（包含 id）
  const [defectClassOptions, setDefectClassOptions] = useState<{ id: number; name: string; color?: string }[]>([]);

  // Defect Chart Data
  const defectChartData = useMemo(() => {
    if (!plateDefects || !plateDefects.length) return [];
    const counts: Record<string, number> = {};
    plateDefects.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return defectTypeOptions
      .map(t => ({
        name: t.label,
        count: counts[t.label] || 0,
        color: t.color
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [plateDefects, defectTypeOptions]);

  // Image Viewer State
  const [imgScale, setImgScale] = useState(1);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // 播放状态与快捷键逻辑
  const [isPlaying, setIsPlaying] = useState(false);
  const [isQueryActive, setIsQueryActive] = useState(false);
  const [listFilter, setListFilter] = useState("all"); // all, normal, alert
  const [isDefectListOpen, setIsDefectListOpen] = useState(true);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isMapMode, setIsMapMode] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [companyName, setCompanyName] = useState("北京科技大学设计研究院有限公司");
  const [mapViewport, setMapViewport] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mapCursor, setMapCursor] = useState("grab");
  const [topCursor, setTopCursor] = useState("grab");
  const [bottomCursor, setBottomCursor] = useState("grab");
  const [hoveredDefect, setHoveredDefect] = useState<{
    defect: DefectItem;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [hoveredPlateRecord, setHoveredPlateRecord] = useState<{
    plate: SteelItem;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [plateDefectSummaryMap, setPlateDefectSummaryMap] = useState<
    Record<string, Array<{ type: string; count: number }>>
  >({});
  const [plateDefectPreviewMap, setPlateDefectPreviewMap] = useState<
    Record<
      string,
      Array<{
        label: string;
        count: number;
        classId?: number | null;
        severity?: number;
        items: Array<{ id: string; surface: "top" | "bottom" }>;
      }>
    >
  >({});
  const plateDefectSummaryLoadingRef = useRef<Set<string>>(new Set());
  const [showPlatePreview, setShowPlatePreview] = useState(
    defectListHoverDefaultVisible,
  );
  const buildPlatePreviewGroups = useCallback((defects: DefectItemRaw[]) => {
    const groups = new Map<
      string,
      {
        label: string;
        count: number;
        classId?: number | null;
        severity?: number;
        items: Array<{ id: string; surface: "top" | "bottom" }>;
      }
    >();

    defects.forEach((defect) => {
      const label = defect.class_name || defect.defect_type || "-";
      const surface = defect.surface === "top" ? "top" : "bottom";
      const classId = typeof defect.class_id === "number" ? defect.class_id : null;
      const severity = classId != null ? defectSeverityByClassId[classId] ?? 1 : 1;
      const existing = groups.get(label);
      if (!existing) {
        groups.set(label, {
          label,
          count: 1,
          classId,
          severity,
          items: [{ id: defect.defect_id, surface }],
        });
        return;
      }
      existing.count += 1;
      existing.severity = Math.max(existing.severity ?? 1, severity);
      if (existing.items.length < 5) {
        existing.items.push({ id: defect.defect_id, surface });
      }
      if (classId !== null) {
        if (existing.classId === null || existing.classId === undefined) {
          existing.classId = classId;
        } else {
          existing.classId = Math.min(existing.classId, classId);
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aSeverity = a.severity ?? 1;
      const bSeverity = b.severity ?? 1;
      if (aSeverity !== bSeverity) return bSeverity - aSeverity;
      const aClass = a.classId;
      const bClass = b.classId;
      if (aClass != null && bClass != null && aClass != bClass) {
        return aClass - bClass;
      }
      if (aClass != null && bClass == null) return -1;
      if (aClass == null && bClass != null) return 1;
      if (a.count != b.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
  }, [defectSeverityByClassId]);

  const buildDefectSummary = useCallback((types: string[]) => {
    const counts = new Map<string, number>();
    types.forEach((type) => {
      if (!type) return;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
    return Array.from(counts, ([type, count]) => ({
      type,
      count,
      severity: defectSeverityByName[type] ?? 1,
    }))
      .sort((a, b) => {
        if (a.severity !== b.severity) return b.severity - a.severity;
        if (a.count !== b.count) return b.count - a.count;
        return a.type.localeCompare(b.type);
      })
      .map(({ type, count }) => ({ type, count }));
  }, [defectSeverityByName]);

  const handlePlateHover = useCallback(
    (plate: SteelItem, position: { screenX: number; screenY: number }) => {
      if (!plateHoverEnabled) {
        return;
      }
      setHoveredPlateRecord({
        plate,
        screenX: position.screenX,
        screenY: position.screenY,
      });

      const serialNumber = plate.serialNumber;
      if (plateDefectPreviewMap[serialNumber]) return;
      if (plateDefectSummaryLoadingRef.current.has(serialNumber)) return;
      const seqNo = Number.parseInt(serialNumber, 10);
      if (!Number.isFinite(seqNo)) return;

      plateDefectSummaryLoadingRef.current.add(serialNumber);
      getDefectsRaw(seqNo)
        .then((response) => {
          const previewGroups = buildPlatePreviewGroups(response.defects);
          const summary = previewGroups.map((group) => ({
            type: group.label,
            count: group.count,
          }));
          setPlateDefectPreviewMap((prev) => ({
            ...prev,
            [serialNumber]: previewGroups,
          }));
          setPlateDefectSummaryMap((prev) => ({
            ...prev,
            [serialNumber]: summary,
          }));
        })
        .catch(() => {})
        .finally(() => {
          plateDefectSummaryLoadingRef.current.delete(serialNumber);
        });
    },
    [buildPlatePreviewGroups, plateDefectPreviewMap, plateHoverEnabled],
  );

  const handlePlateHoverEnd = useCallback(() => {
    setHoveredPlateRecord(null);
    setShowPlatePreview(false);
  }, []);

  useEffect(() => {
    if (!plateHoverEnabled) {
      setHoveredPlateRecord(null);
      setShowPlatePreview(false);
    }
  }, [plateHoverEnabled]);

  useEffect(() => {
    if (hoveredPlateRecord) {
      setShowPlatePreview(defectListHoverDefaultVisible);
    }
  }, [hoveredPlateRecord?.plate.serialNumber, defectListHoverDefaultVisible]);

  const distributionPlateRef = useRef<HTMLDivElement>(null);
  const [distributionPlateSize, setDistributionPlateSize] = useState({
    width: 0,
    height: 0,
  });
  const bottomDistributionPlateRef = useRef<HTMLDivElement>(null);
  const [bottomDistributionPlateSize, setBottomDistributionPlateSize] = useState({
    width: 0,
    height: 0,
  });
  const [showMapCrop, setShowMapCrop] = useState(false);
  const [defectCropExpand, setDefectCropExpand] = useState(DEFAULT_DEFECT_CROP_EXPAND);
  const defectImageRef = useRef<HTMLImageElement>(null);
  const [defectImageMetrics, setDefectImageMetrics] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);

  const filteredPlates = useMemo(
    () =>
      plates.filter((plate) => {
        if (filterCriteria.levels.length > 0 && !filterCriteria.levels.includes(plate.level)) {
          return false;
        }
        if (
          filterCriteria.defectCountMin !== undefined &&
          plate.defectCount < filterCriteria.defectCountMin
        ) {
          return false;
        }
        if (
          filterCriteria.defectCountMax !== undefined &&
          plate.defectCount > filterCriteria.defectCountMax
        ) {
          return false;
        }
        if (listFilter === "normal" && !(plate.level === "A" || plate.level === "B")) {
          return false;
        }
        if (listFilter === "alert" && !(plate.level === "C" || plate.level === "D")) {
          return false;
        }
        return true;
      }),
    [plates, filterCriteria, listFilter]
  );
  const hoveredPlateSummary = hoveredPlateRecord
    ? plateDefectSummaryMap[hoveredPlateRecord.plate.serialNumber]
    : undefined;
  const hoveredPlatePreview = hoveredPlateRecord
    ? plateDefectPreviewMap[hoveredPlateRecord.plate.serialNumber]
    : undefined;
  const visibleDefects = useMemo(() => {
    if (!plateDefects || plateDefects.length === 0) return [];
    if (selectedDefectTypes.length === 0) return [];
    return plateDefects.filter((defect) =>
      selectedDefectTypes.includes(defect.type),
    );
  }, [plateDefects, selectedDefectTypes]);
  const newDefectKeys = useNewItemKeys(visibleDefects, (defect) =>
    getDefectSelectionKey({ id: defect.id, surface: defect.surface }),
  );
  const isDefectSelected = useCallback(
    (defect: Pick<DefectItem, "id" | "surface">) =>
      selectedDefectId === defect.id &&
      (selectedDefectSurface ? selectedDefectSurface === defect.surface : true),
    [selectedDefectId, selectedDefectSurface],
  );

  // 兜底清理：切换视图/筛选时，避免悬浮卡片残留
  useEffect(() => {
    setHoveredDefect(null);
  }, [activeNav, isGridView, isMapMode, surfaceFilter, selectedPlate?.serialNumber]);

  // 当前悬停缺陷不在可见列表中时，自动关闭悬浮卡片
  useEffect(() => {
    if (!hoveredDefect) return;
    const exists = visibleDefects.some(
      (defect) =>
        defect.id === hoveredDefect.defect.id &&
        defect.surface === hoveredDefect.defect.surface,
    );
    if (!exists) {
      setHoveredDefect(null);
    }
  }, [hoveredDefect, visibleDefects]);

  // 鼠标离开窗口/窗口失焦时，清理悬浮卡片
  useEffect(() => {
    const clearHover = () => setHoveredDefect(null);
    window.addEventListener("mouseleave", clearHover);
    window.addEventListener("blur", clearHover);
    return () => {
      window.removeEventListener("mouseleave", clearHover);
      window.removeEventListener("blur", clearHover);
    };
  }, []);
  const distributionDefects = useMemo(() => {
    if (surfaceFilter === "all") return visibleDefects;
    return visibleDefects.filter((defect) => defect.surface === surfaceFilter);
  }, [visibleDefects, surfaceFilter]);
  const topDistributionDefects = useMemo(() => {
    if (surfaceFilter === "all") {
      return visibleDefects.filter((defect) => defect.surface === "top");
    }
    return distributionDefects;
  }, [visibleDefects, distributionDefects, surfaceFilter]);
  const bottomDistributionDefects = useMemo(() => {
    if (surfaceFilter === "all") {
      return visibleDefects.filter((defect) => defect.surface === "bottom");
    }
    return surfaceFilter === "bottom" ? distributionDefects : [];
  }, [visibleDefects, distributionDefects, surfaceFilter]);
  const selectedTopDistributionDefect = useMemo(() => {
    if (!selectedDefectId) return undefined;
    return topDistributionDefects.find((defect) => isDefectSelected(defect));
  }, [selectedDefectId, topDistributionDefects, isDefectSelected]);
  const selectedBottomDistributionDefect = useMemo(() => {
    if (!selectedDefectId) return undefined;
    return bottomDistributionDefects.find((defect) => isDefectSelected(defect));
  }, [selectedDefectId, bottomDistributionDefects, isDefectSelected]);


  const analysisOrientation: ImageOrientation = "vertical";
  const analysisTopMeta = useMemo(
    () => surfaceImages.find((info) => info.surface === "top"),
    [surfaceImages],
  );
  const analysisBottomMeta = useMemo(
    () => surfaceImages.find((info) => info.surface === "bottom"),
    [surfaceImages],
  );
  const analysisTileSize = useMemo(() => {
    return Math.max(
      analysisTopMeta?.image_height ?? 0,
      analysisBottomMeta?.image_height ?? 0,
      512,
    );
  }, [analysisTopMeta, analysisBottomMeta]);
  const topLayout = useMemo(() => {
    return buildOrientationLayout({
      orientation: analysisOrientation,
      surfaceFilter: "top",
      topMeta: analysisTopMeta,
      bottomMeta: analysisBottomMeta,
      surfaceGap: 0,
    });
  }, [analysisOrientation, analysisTopMeta, analysisBottomMeta]);
  const bottomLayout = useMemo(() => {
    return buildOrientationLayout({
      orientation: analysisOrientation,
      surfaceFilter: "bottom",
      topMeta: analysisTopMeta,
      bottomMeta: analysisBottomMeta,
      surfaceGap: 0,
    });
  }, [analysisOrientation, analysisTopMeta, analysisBottomMeta]);
  const computeLayoutMaxLevel = useCallback(
    (layout: { surfaces: SurfaceLayout[] }) => {
      const widths = layout.surfaces.map((s) => s.mosaicWidth);
      const maxWidth = widths.length ? Math.max(...widths) : 0;
      if (!maxWidth || !analysisTileSize) return 0;
      return Math.max(
        0,
        Math.ceil(Math.log2(Math.max(1, maxWidth / analysisTileSize))),
      );
    },
    [analysisTileSize],
  );
  const topMaxTileLevel = useMemo(
    () => computeLayoutMaxLevel(topLayout),
    [computeLayoutMaxLevel, topLayout],
  );
  const bottomMaxTileLevel = useMemo(
    () => computeLayoutMaxLevel(bottomLayout),
    [computeLayoutMaxLevel, bottomLayout],
  );
  const topDefectRects = useMemo(() => {
    if (topLayout.surfaces.length === 0) return [];
    return visibleDefects
      .map((defect) => {
        const surfaceLayout = topLayout.surfaces.find(
          (surface) => surface.surface === defect.surface,
        );
        if (!surfaceLayout) return null;
        const rect = convertDefectToWorldRect({
          surface: surfaceLayout,
          defect,
          orientation: analysisOrientation,
        });
        if (!rect) return null;
        return { defect, surface: surfaceLayout, rect };
      })
      .filter(
        (
          item,
        ): item is {
          defect: DefectItem;
          surface: SurfaceLayout;
          rect: { x: number; y: number; width: number; height: number };
        } => item !== null,
      );
  }, [topLayout, visibleDefects, analysisOrientation]);
  const bottomDefectRects = useMemo(() => {
    if (bottomLayout.surfaces.length === 0) return [];
    return visibleDefects
      .map((defect) => {
        const surfaceLayout = bottomLayout.surfaces.find(
          (surface) => surface.surface === defect.surface,
        );
        if (!surfaceLayout) return null;
        const rect = convertDefectToWorldRect({
          surface: surfaceLayout,
          defect,
          orientation: analysisOrientation,
        });
        if (!rect) return null;
        return { defect, surface: surfaceLayout, rect };
      })
      .filter(
        (
          item,
        ): item is {
          defect: DefectItem;
          surface: SurfaceLayout;
          rect: { x: number; y: number; width: number; height: number };
        } => item !== null,
      );
  }, [bottomLayout, visibleDefects, analysisOrientation]);

  const hitTestTopDefect = useCallback(
    (worldX: number, worldY: number) => {
      for (const item of topDefectRects) {
        const rect = item.rect;
        if (
          worldX >= rect.x &&
          worldX <= rect.x + rect.width &&
          worldY >= rect.y &&
          worldY <= rect.y + rect.height
        ) {
          return item.defect;
        }
      }
      return null;
    },
    [topDefectRects],
  );

  const hitTestBottomDefect = useCallback(
    (worldX: number, worldY: number) => {
      for (const item of bottomDefectRects) {
        const rect = item.rect;
        if (
          worldX >= rect.x &&
          worldX <= rect.x + rect.width &&
          worldY >= rect.y &&
          worldY <= rect.y + rect.height
        ) {
          return item.defect;
        }
      }
      return null;
    },
    [bottomDefectRects],
  );

  const handleTopPointerMove = useCallback(
    (info: { worldX: number; worldY: number; screenX: number; screenY: number }) => {
      if (activeNav !== "图像分析") return;
      const hit = hitTestTopDefect(info.worldX, info.worldY);
      setTopCursor(hit ? "pointer" : "grab");
      if (hit) {
        setHoveredDefect({ defect: hit, screenX: info.screenX, screenY: info.screenY });
      } else {
        setHoveredDefect(null);
      }
    },
    [activeNav, hitTestTopDefect],
  );

  const handleBottomPointerMove = useCallback(
    (info: { worldX: number; worldY: number; screenX: number; screenY: number }) => {
      if (activeNav !== "图像分析") return;
      const hit = hitTestBottomDefect(info.worldX, info.worldY);
      setBottomCursor(hit ? "pointer" : "grab");
      if (hit) {
        setHoveredDefect({ defect: hit, screenX: info.screenX, screenY: info.screenY });
      } else {
        setHoveredDefect(null);
      }
    },
    [activeNav, hitTestBottomDefect],
  );

  const handleTopPointerLeave = useCallback(() => {
    setTopCursor("grab");
    setHoveredDefect(null);
  }, []);

  const handleBottomPointerLeave = useCallback(() => {
    setBottomCursor("grab");
    setHoveredDefect(null);
  }, []);
  const analysisSeverityColor = useCallback((severity: DefectItem["severity"]) => {
    switch (severity) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      default:
        return "#22c55e";
    }
  }, []);
  const defectTypeColorMap = useMemo(
    () => new Map(defectTypeOptions.map((item) => [item.label, item.color])),
    [defectTypeOptions],
  );
  const resolveDefectColor = useCallback(
    (defect: DefectItem) =>
      defectTypeColorMap.get(defect.type) ||
      analysisSeverityColor(defect.severity) ||
      "#58a6ff",
    [defectTypeColorMap, analysisSeverityColor],
  );
  const analysisSeqNo = useMemo(() => {
    if (!selectedPlate) return null;
    const parsed = parseInt(selectedPlate.serialNumber, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [selectedPlate]);
  const distributionSurface = useMemo<"top" | "bottom" | null>(() => {
    if (surfaceFilter === "top" || surfaceFilter === "bottom") {
      return surfaceFilter;
    }
    const preferred =
      surfaceImages.find((info) => info.surface === "top") ??
      surfaceImages[0];
    return preferred?.surface ?? null;
  }, [surfaceFilter, surfaceImages]);
  const distributionMeta = useMemo(() => {
    if (!distributionSurface) return null;
    return (
      surfaceImages.find(
        (info) => info.surface === distributionSurface,
      ) ?? null
    );
  }, [distributionSurface, surfaceImages]);
  const bottomDistributionMeta = useMemo(() => {
    return surfaceImages.find((info) => info.surface === "bottom") ?? null;
  }, [surfaceImages]);
  const distributionDraw = useMemo(() => {
    if (!distributionMeta) return null;
    // 使用原始马赛克尺寸（后端会根据 orientation 参数处理横向转换）
    const mosaicWidth = distributionMeta.image_width ?? 0;
    const mosaicHeight =
      (distributionMeta.frame_count ?? 0) *
      (distributionMeta.image_height ?? 0);

    if (
      !mosaicWidth ||
      !mosaicHeight ||
      distributionPlateSize.width <= 0 ||
      distributionPlateSize.height <= 0
    ) {
      return null;
    }

    if (distributionScaleMode === "stretch") {
      // 横向拉伸模式：让宽度填满容器，高度按比例计算
      const drawWidth = distributionPlateSize.width;
      const drawHeight = drawWidth * (mosaicHeight / mosaicWidth);
      return {
        mosaicWidth,
        mosaicHeight,
        drawWidth,
        drawHeight,
        offsetX: 0,
        offsetY: (distributionPlateSize.height - drawHeight) / 2,
        containerWidth: distributionPlateSize.width,
        containerHeight: distributionPlateSize.height,
      };
    }

    const scale = Math.min(
      distributionPlateSize.width / mosaicWidth,
      distributionPlateSize.height / mosaicHeight,
    );
    const drawWidth = mosaicWidth * scale;
    const drawHeight = mosaicHeight * scale;
    return {
      mosaicWidth,
      mosaicHeight,
      drawWidth,
      drawHeight,
      offsetX: (distributionPlateSize.width - drawWidth) / 2,
      offsetY: (distributionPlateSize.height - drawHeight) / 2,
      containerWidth: distributionPlateSize.width,
      containerHeight: distributionPlateSize.height,
    };
  }, [distributionMeta, distributionPlateSize, distributionScaleMode]);
  const bottomDistributionDraw = useMemo(() => {
    if (!bottomDistributionMeta) return null;
    // 使用原始马赛克尺寸（后端会根据 orientation 参数处理横向转换）
    const mosaicWidth = bottomDistributionMeta.image_width ?? 0;
    const mosaicHeight =
      (bottomDistributionMeta.frame_count ?? 0) *
      (bottomDistributionMeta.image_height ?? 0);

    if (
      !mosaicWidth ||
      !mosaicHeight ||
      bottomDistributionPlateSize.width <= 0 ||
      bottomDistributionPlateSize.height <= 0
    ) {
      return null;
    }

    if (distributionScaleMode === "stretch") {
      // 横向拉伸模式：让宽度填满容器，高度按比例计算
      const drawWidth = bottomDistributionPlateSize.width;
      const drawHeight = drawWidth * (mosaicHeight / mosaicWidth);
      return {
        mosaicWidth,
        mosaicHeight,
        drawWidth,
        drawHeight,
        offsetX: 0,
        offsetY: (bottomDistributionPlateSize.height - drawHeight) / 2,
        containerWidth: bottomDistributionPlateSize.width,
        containerHeight: bottomDistributionPlateSize.height,
      };
    }

    const scale = Math.min(
      bottomDistributionPlateSize.width / mosaicWidth,
      bottomDistributionPlateSize.height / mosaicHeight,
    );
    const drawWidth = mosaicWidth * scale;
    const drawHeight = mosaicHeight * scale;
    return {
      mosaicWidth,
      mosaicHeight,
      drawWidth,
      drawHeight,
      offsetX: (bottomDistributionPlateSize.width - drawWidth) / 2,
      offsetY: (bottomDistributionPlateSize.height - drawHeight) / 2,
      containerWidth: bottomDistributionPlateSize.width,
      containerHeight: bottomDistributionPlateSize.height,
    };
  }, [bottomDistributionMeta, bottomDistributionPlateSize, distributionScaleMode]);
  const getDistributionMarkerPosition = (
    defect: DefectItem,
    draw:
      | {
          mosaicWidth: number;
          mosaicHeight: number;
          drawWidth: number;
          drawHeight: number;
          offsetX: number;
          offsetY: number;
          containerWidth: number;
          containerHeight: number;
        }
      | null,
    surfaceMeta?: SurfaceImageInfo | null,
  ) => {
    const frameHeight = surfaceMeta?.image_height ?? 0;
    const frameWidth = surfaceMeta?.image_width ?? 0;
    const frameCount = surfaceMeta?.frame_count ?? 0;
    const mosaicHeight = frameHeight * frameCount;
    const mosaicWidth = frameWidth;
    if (!mosaicHeight || !mosaicWidth) return null;

    const rawIndex =
      typeof defect.imageIndex === "number" ? defect.imageIndex : 0;
    const frameIndex = Math.max(0, rawIndex - 1);
    const worldX = defect.x;
    const worldY = defect.y + frameIndex * frameHeight;

    let leftPos = (worldX / mosaicWidth) * 100;
    let topPos = (worldY / mosaicHeight) * 100;
    if (draw) {
      const leftPx =
        draw.offsetX + (worldX / draw.mosaicWidth) * draw.drawWidth;
      const topPx =
        draw.offsetY + (worldY / draw.mosaicHeight) * draw.drawHeight;
      leftPos = (leftPx / draw.containerWidth) * 100;
      topPos = (topPx / draw.containerHeight) * 100;
    }
    return {
      left: Math.max(0, Math.min(100, leftPos)),
      top: Math.max(0, Math.min(100, topPos)),
    };
  };
  const distributionTilePlan = useMemo(() => {
    if (!distributionMeta || !distributionDraw) return null;
    const tileSize = Math.max(
      distributionMeta.image_height ?? 0,
      512,
    );
    const {
      mosaicWidth,
      mosaicHeight,
      drawWidth,
      drawHeight,
      offsetX,
      offsetY,
      containerWidth,
      containerHeight,
    } = distributionDraw;
    if (!tileSize || !mosaicWidth || !mosaicHeight) return null;

    const scaleX = mosaicWidth / Math.max(1, drawWidth);
    const scaleY = mosaicHeight / Math.max(1, drawHeight);
    let level = Math.ceil(Math.log2(Math.max(1, Math.max(scaleX, scaleY))));
    level = Math.max(0, Math.min(12, level));

    const virtualTileSize = tileSize * Math.pow(2, level);
    const tilesX = Math.max(
      1,
      Math.ceil(mosaicWidth / virtualTileSize),
    );
    const tilesY = Math.max(
      1,
      Math.ceil(mosaicHeight / virtualTileSize),
    );

    const tiles: Array<{
      tileX: number;
      tileY: number;
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];

    for (let row = 0; row < tilesY; row += 1) {
      for (let col = 0; col < tilesX; col += 1) {
        const x = col * virtualTileSize;
        const y = row * virtualTileSize;
        const width =
          col === tilesX - 1
            ? mosaicWidth - col * virtualTileSize
            : virtualTileSize;
        const height =
          row === tilesY - 1
            ? mosaicHeight - row * virtualTileSize
            : virtualTileSize;
        const leftPx = offsetX + (x / mosaicWidth) * drawWidth;
        const topPx = offsetY + (y / mosaicHeight) * drawHeight;
        const widthPx = (width / mosaicWidth) * drawWidth;
        const heightPx = (height / mosaicHeight) * drawHeight;
        tiles.push({
          tileX: col,
          tileY: row,
          left: (leftPx / containerWidth) * 100,
          top: (topPx / containerHeight) * 100,
          width: (widthPx / containerWidth) * 100,
          height: (heightPx / containerHeight) * 100,
        });
      }
    }

    return { tileSize, level, tiles };
  }, [distributionMeta, distributionDraw]);
  const bottomDistributionTilePlan = useMemo(() => {
    if (!bottomDistributionMeta || !bottomDistributionDraw) return null;
    const tileSize = Math.max(
      bottomDistributionMeta.image_height ?? 0,
      512,
    );
    const {
      mosaicWidth,
      mosaicHeight,
      drawWidth,
      drawHeight,
      offsetX,
      offsetY,
      containerWidth,
      containerHeight,
    } = bottomDistributionDraw;
    if (!tileSize || !mosaicWidth || !mosaicHeight) return null;

    const scaleX = mosaicWidth / Math.max(1, drawWidth);
    const scaleY = mosaicHeight / Math.max(1, drawHeight);
    let level = Math.ceil(Math.log2(Math.max(1, Math.max(scaleX, scaleY))));
    level = Math.max(0, Math.min(12, level));

    const virtualTileSize = tileSize * Math.pow(2, level);
    const tilesX = Math.max(
      1,
      Math.ceil(mosaicWidth / virtualTileSize),
    );
    const tilesY = Math.max(
      1,
      Math.ceil(mosaicHeight / virtualTileSize),
    );

    const tiles: Array<{
      tileX: number;
      tileY: number;
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];

    for (let row = 0; row < tilesY; row += 1) {
      for (let col = 0; col < tilesX; col += 1) {
        const x = col * virtualTileSize;
        const y = row * virtualTileSize;
        const width =
          col === tilesX - 1
            ? mosaicWidth - col * virtualTileSize
            : virtualTileSize;
        const height =
          row === tilesY - 1
            ? mosaicHeight - row * virtualTileSize
            : virtualTileSize;
        const leftPx = offsetX + (x / mosaicWidth) * drawWidth;
        const topPx = offsetY + (y / mosaicHeight) * drawHeight;
        const widthPx = (width / mosaicWidth) * drawWidth;
        const heightPx = (height / mosaicHeight) * drawHeight;
        tiles.push({
          tileX: col,
          tileY: row,
          left: (leftPx / containerWidth) * 100,
          top: (topPx / containerHeight) * 100,
          width: (widthPx / containerWidth) * 100,
          height: (heightPx / containerHeight) * 100,
        });
      }
    }

    return { tileSize, level, tiles };
  }, [bottomDistributionMeta, bottomDistributionDraw]);
  const distributionViewportStyle = useMemo(() => {
    if (!distributionDraw || analysisScrollState.height <= 0) {
      return {
        top: `${(analysisScrollState.top / analysisScrollState.height) * 100}%`,
        height: `${(analysisScrollState.clientHeight / analysisScrollState.height) * 100}%`,
      };
    }
    const topPx =
      distributionDraw.offsetY +
      (analysisScrollState.top / analysisScrollState.height) *
        distributionDraw.drawHeight;
    const heightPx =
      (analysisScrollState.clientHeight / analysisScrollState.height) *
      distributionDraw.drawHeight;
    return {
      top: `${(topPx / distributionDraw.containerHeight) * 100}%`,
      height: `${(heightPx / distributionDraw.containerHeight) * 100}%`,
    };
  }, [analysisScrollState, distributionDraw]);
  const bottomDistributionViewportStyle = useMemo(() => {
    if (!bottomDistributionDraw || analysisScrollState.height <= 0) {
      return {
        top: `${(analysisScrollState.top / analysisScrollState.height) * 100}%`,
        height: `${(analysisScrollState.clientHeight / analysisScrollState.height) * 100}%`,
      };
    }
    const topPx =
      bottomDistributionDraw.offsetY +
      (analysisScrollState.top / analysisScrollState.height) *
        bottomDistributionDraw.drawHeight;
    const heightPx =
      (analysisScrollState.clientHeight / analysisScrollState.height) *
      bottomDistributionDraw.drawHeight;
    return {
      top: `${(topPx / bottomDistributionDraw.containerHeight) * 100}%`,
      height: `${(heightPx / bottomDistributionDraw.containerHeight) * 100}%`,
    };
  }, [analysisScrollState, bottomDistributionDraw]);

  const createAnalysisTileRenderer = useCallback(
    (layout: { surfaces: SurfaceLayout[] }, defectRects: typeof topDefectRects, maxLevel: number) =>
      (ctx: CanvasRenderingContext2D, tile: Tile, tileSizeArg: number, scale: number) => {
        if (!analysisSeqNo || layout.surfaces.length === 0) {
          ctx.fillStyle = "#0b1220";
          ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
          return;
        }
        const surfaceLayout = pickSurfaceForTile(layout, tile);
        if (!surfaceLayout) {
          ctx.fillStyle = "#0b1220";
          ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
          return;
        }
        const virtualTileSize = tileSizeArg * Math.pow(2, tile.level);
        const requestInfo = computeTileRequestInfo({
          surface: surfaceLayout,
          tile,
          orientation: analysisOrientation,
          virtualTileSize,
          tileSize: tileSizeArg,
        });
        if (!requestInfo) {
          ctx.fillStyle = "#0b1220";
          ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
          return;
        }
        const imageScale = env.getImageScale();
        const cacheKey = `${analysisOrientation}-${surfaceLayout.surface}-${analysisSeqNo}-${tile.level}-${requestInfo.tileX}-${requestInfo.tileY}-${tileSizeArg}-s${imageScale}`;
        const cached = analysisTileImageCache.get(cacheKey);
        
        // 触发瓦片预热（如果缓存未命中）
        if (!cached && analysisSeqNo > 0) {
          globalPreheatManager.preheatFromVisibleTiles({
            surface: surfaceLayout.surface,
            seqNo: analysisSeqNo,
            visibleTiles: [{
              level: tile.level,
              tileX: requestInfo.tileX,
              tileY: requestInfo.tileY,
              tileSize: tileSizeArg,
            }],
            view: analysisOrientation,
          }).catch(error => {
            // 静默失败，不影响主渲染流程
          });
        }
        const url = getTileImageUrl({
          surface: surfaceLayout.surface,
          seqNo: analysisSeqNo,
          level: tile.level,
          tileX: requestInfo.tileX,
          tileY: requestInfo.tileY,
          tileSize: tileSizeArg,
          fmt: "JPEG",
        });
        if (cached && cached.complete) {
          drawTileImage({
            ctx,
            img: cached,
            tile,
            orientation: analysisOrientation,
          });
        } else {
          const drewFallback = tryDrawFallbackTile({
            ctx,
            tile,
            orientation: analysisOrientation,
            cache: analysisTileImageCache,
            cacheKeyPrefix: analysisOrientation,
            surface: surfaceLayout.surface,
            seqNo: analysisSeqNo,
            tileX: requestInfo.tileX,
            tileY: requestInfo.tileY,
            tileSize: tileSizeArg,
            maxLevel,
            imageScale,
            useTransparentBackground: true,
          });
          if (!analysisTileImageLoading.has(cacheKey)) {
            analysisTileImageLoading.add(cacheKey);
            const img = new Image();
            img.src = url;
            img.onload = () => {
              analysisTileImageCache.set(cacheKey, img);
              analysisTileImageLoading.delete(cacheKey);
            };
            img.onerror = () => {
              analysisTileImageLoading.delete(cacheKey);
            };
          }
          if (!drewFallback) {
            ctx.fillStyle = "#0b1220";
            ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
            ctx.strokeStyle = "#1f2937";
            ctx.lineWidth = 1 / scale;
            ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
          }
        }

        const defectsInTile = defectRects.filter((item) => {
          if (item.surface.surface !== surfaceLayout.surface) {
            return false;
          }
          const { rect } = item;
          return !(
            rect.x + rect.width < tile.x ||
            rect.x > tile.x + tile.width ||
            rect.y + rect.height < tile.y ||
            rect.y > tile.y + tile.height
          );
        });
        defectsInTile.forEach(({ defect, rect }) => {
          ctx.strokeStyle = analysisSeverityColor(defect.severity);
          ctx.lineWidth =
            isDefectSelected(defect) ? 3 / scale : 1.5 / scale;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        });
      },
    [analysisSeqNo, analysisOrientation, analysisSeverityColor, selectedDefectId, isDefectSelected],
  );
  const renderTopTile = useMemo(
    () => createAnalysisTileRenderer(topLayout, topDefectRects, topMaxTileLevel),
    [createAnalysisTileRenderer, topLayout, topDefectRects, topMaxTileLevel],
  );
  const renderBottomTile = useMemo(
    () =>
      createAnalysisTileRenderer(
        bottomLayout,
        bottomDefectRects,
        bottomMaxTileLevel,
      ),
    [
      createAnalysisTileRenderer,
      bottomLayout,
      bottomDefectRects,
      bottomMaxTileLevel,
    ],
  );

  const createAnalysisOverlayRenderer = useCallback(
    (layout: { surfaces: SurfaceLayout[] }) =>
      (ctx: CanvasRenderingContext2D, scale: number) => {
        layout.surfaces.forEach((surfaceLayout) => {
          const stroke =
            surfaceLayout.surface === "top" ? "#0ea5e9" : "#f97316";
          ctx.save();
          ctx.lineWidth = 3 / scale;
          ctx.strokeStyle = stroke;
          ctx.setLineDash([10 / scale, 6 / scale]);
          ctx.strokeRect(
            surfaceLayout.offsetX,
            surfaceLayout.offsetY,
            surfaceLayout.worldWidth,
            surfaceLayout.worldHeight,
          );
          ctx.setLineDash([]);
          ctx.translate(
            surfaceLayout.offsetX + 12 / scale,
            surfaceLayout.offsetY + 18 / scale,
          );
          const labelScale = 1 / scale;
          ctx.scale(labelScale, labelScale);
          ctx.font = "bold 12px 'Consolas', sans-serif";
          ctx.fillStyle = stroke;
          ctx.fillText(
            surfaceLayout.surface === "top"
              ? "上表"
              : "下表",
            0,
            0,
          );
          ctx.restore();
        });
      },
    [],
  );
  const renderTopOverlay = useMemo(
    () => createAnalysisOverlayRenderer(topLayout),
    [createAnalysisOverlayRenderer, topLayout],
  );
  const renderBottomOverlay = useMemo(
    () => createAnalysisOverlayRenderer(bottomLayout),
    [createAnalysisOverlayRenderer, bottomLayout],
  );


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查当前焦点是否在输入框中
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      // 如果焦点在输入框中，不阻止默认行为，也不执行快捷键
      if (isInputFocused) {
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case "ArrowUp": 
        case "w":
        case "W": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx > 0) setSelectedPlate(plates[idx - 1]);
          break;
        }
        case "ArrowDown":
        case "s":
        case "S": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
          break;
        }
        case "ArrowLeft":
        case "a":
        case "A": setImgScale(prev => Math.max(0.1, prev * 0.9)); break;
        case "ArrowRight":
        case "d":
        case "D": setImgScale(prev => Math.min(10, prev * 1.1)); break;
        case " ": setIsPlaying(prev => !prev); break;
        case "t":
        case "T": 
          setSurfaceFilter(prev => prev === 'top' ? 'all' : 'top');
          break;
        case "l":
        case "L":
          setIsDefectListOpen(prev => !prev);
          break;
        case "b":
        case "B":
          setSurfaceFilter(prev => prev === 'bottom' ? 'all' : 'bottom');
          break;
        case "q":
        case "Q": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx > 0) setSelectedPlate(plates[idx - 1]);
          break;
        }
        case "e":
        case "E": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
          break;
        }
        case "Tab":
          e.preventDefault();
          if (hoveredPlateRecord) {
            setShowPlatePreview(prev => !prev);
            break;
          }
          setIsGridView(prev => !prev);
          break;
        case "f":
        case "F":
          setIsImmersiveMode(prev => !prev);
          break;
        case "Shift":
          // 切换地图模式
          setIsMapMode(prev => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [plates, selectedPlate, imgScale, hoveredPlateRecord]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      if (activeNav === "图像分析") {
        timer = setInterval(() => {
          const sourceLayout =
            surfaceFilter === "bottom" ? bottomLayout : topLayout;
          if (sourceLayout.worldHeight <= 0) return;
          const sourceViewport =
            surfaceFilter === "bottom"
              ? bottomViewportRef.current
              : topViewportRef.current;
          const currentY = sourceViewport?.y ?? 0;
          const currentH = sourceViewport?.height ?? 1;
          const maxScroll = Math.max(0, sourceLayout.worldHeight - currentH);
          const nextY = currentY >= maxScroll - 2 ? 0 : currentY + 2;
          const centerY = nextY + currentH / 2;
          if (surfaceFilter === "top" || surfaceFilter === "all") {
            const centerX =
              topViewportRef.current
                ? topViewportRef.current.x + topViewportRef.current.width / 2
                : topLayout.worldWidth / 2;
            setTopCenterTarget({ x: centerX, y: centerY });
          }
          if (
            surfaceFilter === "bottom" ||
            (surfaceFilter === "all" && isAnalysisSyncEnabled)
          ) {
            const centerX =
              bottomViewportRef.current
                ? bottomViewportRef.current.x + bottomViewportRef.current.width / 2
                : bottomLayout.worldWidth / 2;
            setBottomCenterTarget({ x: centerX, y: centerY });
            if (surfaceFilter === "all" && isAnalysisSyncEnabled && !isWidthLockEnabled) {
              setBottomForcedScale(topScaleRef.current);
            }
          }
        }, 16); // ~60fps for smooth motion
      } else {
        timer = setInterval(() => {
          setSelectedPlate(prev => {
            if (!prev) return plates[0];
            const idx = plates.findIndex(p => p.serialNumber === prev.serialNumber);
            return plates[(idx + 1) % plates.length];
          });
        }, 3000);
      }
    }
    return () => clearInterval(timer);
  }, [isPlaying, plates, activeNav, surfaceFilter, topLayout, bottomLayout, isAnalysisSyncEnabled, isWidthLockEnabled]);

  // 3D Model Control State
  const [rotX, setRotX] = useState(-12);
  const [rotY, setRotY] = useState(-18);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Initial data load
  useEffect(() => {
    let mounted = true;
      const loadData = async () => {
        try {
          const nodesData = await getApiList().catch(() => []);
          if (!mounted) return;
          setApiNodes(nodesData);
          const mate = await getConfigMate().catch(() => null);
          if (mate?.meta?.company_name) {
            setCompanyName(mate.meta.company_name);
          }
          const resolvedKey =
            (env as any).getLineName?.() ?? currentLineKey ?? "";
          const findLabel = (key: string) => {
            if (!key) return "";
            const node = nodesData.find(
              (item) =>
                (item as any).key === key ||
                (item as any).line_key === key,
            );
            return (node as any)?.name || (node as any)?.line_name || key;
          };
          if (resolvedKey) {
            setCurrentLineKey(resolvedKey);
            setCurrentLine(findLabel(resolvedKey));
          } else if (nodesData.length > 0) {
            const firstKey =
              (nodesData[0] as any).key ||
              (nodesData[0] as any).line_key ||
              "";
            setCurrentLineKey(firstKey);
            setCurrentLine(findLabel(firstKey));
          }
          const meta = await getGlobalMeta().catch(() => null);
          if (meta && typeof meta.defect_cache_expand === "number") {
            setDefectCropExpand(meta.defect_cache_expand);
          }
          if (meta?.defect_classes?.items && Array.isArray(meta.defect_classes.items)) {
            const normalize = (value: unknown) => {
              const num = typeof value === "number" ? value : Number(value);
              if (!Number.isFinite(num)) return 0;
              return Math.max(0, Math.min(255, Math.round(num)));
            };
            const toHex = (value: number) => value.toString(16).padStart(2, "0");
            const severityByName: Record<string, number> = {};
            const severityByClassId: Record<number, number> = {};
            const options = meta.defect_classes.items.map((item: any) => {
              const label =
                item?.desc?.toString()?.trim() ||
                item?.name?.toString()?.trim() ||
                item?.tag?.toString()?.trim() ||
                "未知缺陷";
              const classId = Number(item?.class ?? item?.id ?? item?.num ?? item?.value ?? 0);
              const severity = Number.isFinite(item?.severity) ? Number(item.severity) : 1;
              const colorObj = item?.color || {};
              const red = normalize(colorObj.red);
              const green = normalize(colorObj.green);
              const blue = normalize(colorObj.blue);
              severityByName[label] = severity;
              if (Number.isFinite(classId)) {
                severityByClassId[classId] = severity;
              }
              return {
                label,
                color: `#${toHex(red)}${toHex(green)}${toHex(blue)}`,
              };
            });
            const deduped = options.filter((item, index) => {
              return options.findIndex((opt) => opt.label === item.label) === index;
            });
            if (deduped.length > 0) {
              setDefectTypeOptions(deduped);
              setSelectedDefectTypes(deduped.map((item) => item.label));
            }
            setDefectSeverityByName(severityByName);
            setDefectSeverityByClassId(severityByClassId);
            // 设置 LargeImageViewer 需要的缺陷类别格式（包含 id）
            const classOptions = meta.defect_classes.items.map((item: any) => {
              const label = item?.desc?.toString()?.trim() ||
                            item?.name?.toString()?.trim() ||
                            item?.tag?.toString()?.trim() ||
                            "未知缺陷";
              const classId = Number(item?.class ?? item?.id ?? item?.num ?? item?.value ?? 0);
              const red = normalize(item?.color?.red ?? 0);
              const green = normalize(item?.color?.green ?? 0);
              const blue = normalize(item?.color?.blue ?? 0);
              return {
                id: Number.isFinite(classId) ? classId : 0,
                name: label,
                color: `#${toHex(red)}${toHex(green)}${toHex(blue)}`,
              };
            });
            const dedupedClassOptions = classOptions.filter((item, index, self) => {
              return self.findIndex((opt) => opt.name === item.name) === index;
            });
            setDefectClassOptions(dedupedClassOptions);
          }
          await loadPlatesWithCriteria({}, 50, false);
        } catch (error) {
          if (mounted) toast.error("数据加载失败");
        } finally {
          if (mounted) setIsLoading(false);
        }
      };
      loadData();
      return () => { mounted = false; };
    }, [loadPlatesWithCriteria]);

  // Sync defects and images when selection changes
  useEffect(() => {
    if (!selectedPlate) {
      setPlateDefects([]);
      setSurfaceImages([]);
      return;
    }

    let mounted = true;
    const loadPlateDetails = async () => {
      try {
        const seqNo = parseInt(selectedPlate.serialNumber, 10);
        
        // Parallel fetch for defects and metadata
        const [defectsRes, metaRes] = await Promise.all([
          getDefectsRaw(seqNo).catch(() => ({ defects: [] })),
          getSteelMeta(seqNo).catch(() => ({ surface_images: [] }))
        ]);

        if (!mounted) return;

        const previewGroups = buildPlatePreviewGroups(defectsRes.defects);
        setPlateDefectPreviewMap((prev) => ({
          ...prev,
          [selectedPlate.serialNumber]: previewGroups,
        }));

        const normalizeSurface = (value: unknown) =>
          value === "top" ? "top" : "bottom";
        setPlateDefects(defectsRes.defects.map(d => ({
          id: d.defect_id,
          type: d.defect_type as any,
          severity: d.severity,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          confidence: d.confidence,
          surface: normalizeSurface(d.surface),
          imageIndex: d.image_index,
          xMm: d.x_mm,
          yMm: d.y_mm,
          widthMm: d.width_mm,
          heightMm: d.height_mm,
        })));
        
        setSurfaceImages(metaRes.surface_images || []);
      } catch (error) {
        console.error("Failed to load plate details", error);
      }
    };

    loadPlateDetails();
    return () => { mounted = false; };
  }, [selectedPlate]);

  useEffect(() => {
    if (!selectedPlate) return;
    const preview = plateDefectPreviewMap[selectedPlate.serialNumber];
    if (preview) {
      const summary = preview.map((group) => ({
        type: group.label,
        count: group.count,
      }));
      setPlateDefectSummaryMap((prev) => ({
        ...prev,
        [selectedPlate.serialNumber]: summary,
      }));
      return;
    }
    const summary = buildDefectSummary(
      plateDefects.map((defect) => defect.type),
    );
    setPlateDefectSummaryMap((prev) => ({
      ...prev,
      [selectedPlate.serialNumber]: summary,
    }));
  }, [buildDefectSummary, plateDefects, plateDefectPreviewMap, selectedPlate]);

  useEffect(() => {
    if (activeNav !== "图像分析" || !selectedDefectId) return;
    const defect = visibleDefects.find((d) => isDefectSelected(d));
    if (!defect) return;
    if (defect.surface === "top" && topLayout.surfaces.length > 0) {
      const rect = topDefectRects.find((item) => item.defect.id === defect.id)?.rect;
      if (rect) {
        setTopCenterTarget({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        });
      }
    }
    if (defect.surface === "bottom" && bottomLayout.surfaces.length > 0) {
      const rect = bottomDefectRects.find((item) => item.defect.id === defect.id)?.rect;
      if (rect) {
        setBottomCenterTarget({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        });
      }
    }
  }, [activeNav, selectedDefectId, visibleDefects, topLayout, bottomLayout, topDefectRects, bottomDefectRects, isDefectSelected]);

  useEffect(() => {
    if (!selectedDefectId) return;
    const exists = visibleDefects.some((d) => isDefectSelected(d));
    if (!exists) {
      const fallback = visibleDefects[0];
      setSelectedDefectId(fallback?.id ?? null);
      setSelectedDefectSurface(fallback?.surface ?? null);
    }
  }, [selectedDefectId, visibleDefects, isDefectSelected]);

  useEffect(() => {
    if (activeNav !== "图像分析" || surfaceFilter !== "all") {
      setTopForcedScale(null);
      setBottomForcedScale(null);
      return;
    }
    if (!isAnalysisSyncEnabled) {
      setTopForcedScale(null);
      setBottomForcedScale(null);
      return;
    }
    if (topViewportRef.current) {
      const info = topViewportRef.current;
      setBottomCenterTarget({
        x: info.x + info.width / 2,
        y: info.y + info.height / 2,
      });
      if (!isWidthLockEnabled) {
        setBottomForcedScale(topScaleRef.current);
      }
    }
  }, [activeNav, surfaceFilter, isAnalysisSyncEnabled, isWidthLockEnabled]);

  useEffect(() => {
    if (!isWidthLockEnabled) return;
    setTopForcedScale(null);
    setBottomForcedScale(null);
  }, [isWidthLockEnabled]);

  const handleDistributionInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.type !== 'mousedown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let ratio = y / rect.height;
    if (distributionDraw && distributionDraw.drawHeight > 0) {
      ratio = (y - distributionDraw.offsetY) / distributionDraw.drawHeight;
    }
    ratio = Math.max(0, Math.min(1, ratio));
    const targetLayout =
      surfaceFilter === "bottom" ? bottomLayout : topLayout;
    if (targetLayout.worldHeight <= 0) return;
    const targetY = ratio * targetLayout.worldHeight;
    const getCenterX = (
      viewport: { x: number; width: number } | null,
      fallback: number,
    ) => (viewport ? viewport.x + viewport.width / 2 : fallback / 2);
    if (surfaceFilter === "top" || surfaceFilter === "all") {
      setTopCenterTarget({
        x: getCenterX(topViewportRef.current, topLayout.worldWidth),
        y: targetY,
      });
    }
    if (
      surfaceFilter === "bottom" ||
      (surfaceFilter === "all" && isAnalysisSyncEnabled)
    ) {
      setBottomCenterTarget({
        x: getCenterX(bottomViewportRef.current, bottomLayout.worldWidth),
        y: targetY,
      });
    }
  }, [surfaceFilter, topLayout, bottomLayout, isAnalysisSyncEnabled, distributionDraw]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    }).replace(/\//g, '-');
  }, []);

  // Mouse Handlers for 3D Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPicker) {
      setPickerPos({
        x: e.clientX - pickerDragStart.x,
        y: e.clientY - pickerDragStart.y
      });
      return;
    }
    if (!isDragging) return;
    const deltaX = e.clientX - lastPos.x;
    const deltaY = e.clientY - lastPos.y;
    
    setRotY(prev => prev + deltaX * 0.5);
    setRotX(prev => Math.max(-90, Math.min(90, prev - deltaY * 0.5)));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setIsDraggingPicker(false);
  };

  const handleImageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sensitivity = e.ctrlKey ? 0.004 : 0.002;
    const factor = Math.exp(-e.deltaY * sensitivity);
    const newScale = Math.min(10, Math.max(0.1, imgScale * factor));
    if (newScale === imgScale) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const cursorX = e.clientX - rect.left - centerX;
    const cursorY = e.clientY - rect.top - centerY;
    const scaleFactor = newScale / imgScale;
    setImgOffset({
      x: imgOffset.x * scaleFactor + cursorX * (1 - scaleFactor),
      y: imgOffset.y * scaleFactor + cursorY * (1 - scaleFactor),
    });
    setImgScale(newScale);
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click for pan
    setIsPanning(true);
    setPanStart({ x: e.clientX - imgOffset.x, y: e.clientY - imgOffset.y });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setImgOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  // 当前选中的缺陷（优先使用选中 ID，其次回退到列表首个缺陷）
  const currentDefect = useMemo(() => {
    if (!visibleDefects || visibleDefects.length === 0) return null;
    if (selectedDefectId) {
      const found = visibleDefects.find((d) => isDefectSelected(d));
      if (found) return found;
    }
    return visibleDefects[0];
  }, [visibleDefects, selectedDefectId, isDefectSelected]);
  const currentDefectIndex = useMemo(() => {
    if (!visibleDefects || visibleDefects.length === 0) return -1;
    if (selectedDefectId) {
      const index = visibleDefects.findIndex((d) => isDefectSelected(d));
      if (index >= 0) return index;
    }
    return 0;
  }, [visibleDefects, selectedDefectId, isDefectSelected]);
  const selectDefectAt = useCallback(
    (index: number) => {
      const next = visibleDefects[index];
      if (!next) return;
      setSelectedDefectId(next.id);
      setSelectedDefectSurface(next.surface);
      setActiveNav("缺陷分析");
      setImgScale(1);
      setImgOffset({ x: 0, y: 0 });
    },
    [visibleDefects],
  );
  const selectDefectById = useCallback(
    (nextDefect?: DefectItem | null) => {
      if (!nextDefect) return;
      setSelectedDefectId(nextDefect.id);
      setSelectedDefectSurface(nextDefect.surface);
      setActiveNav("缺陷分析");
      setImgScale(1);
      setImgOffset({ x: 0, y: 0 });
    },
    [setActiveNav, setImgOffset, setImgScale, setSelectedDefectId, setSelectedDefectSurface],
  );
  // 防止滚轮事件在短时间内重复触发（解决双选中问题）
  const wheelHandlerTimeoutRef = useRef<number | null>(null);
  const lastWheelHandlerTimeRef = useRef<number>(0);
  const WHEEL_HANDLER_DEBOUNCE = 100; // 100ms 防抖

  const handleDistributionWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>, defects: DefectItem[]) => {
      if (!defects.length) return;

      // 防抖：防止在短时间内重复触发
      const now = Date.now();
      if (now - lastWheelHandlerTimeRef.current < WHEEL_HANDLER_DEBOUNCE) {
        return;
      }
      lastWheelHandlerTimeRef.current = now;

      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      const direction = delta > 0 ? 1 : -1;
      const currentIndex = selectedDefectId
        ? defects.findIndex((defect) => isDefectSelected(defect))
        : -1;
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : defects.length - 1
          : (currentIndex + direction + defects.length) % defects.length;
      selectDefectById(defects[nextIndex]);
    },
    [selectDefectById, selectedDefectId, isDefectSelected],
  );

  const updateDefectImageMetrics = useCallback(() => {
    const img = defectImageRef.current;
    if (!img) return;
    const naturalWidth = img.naturalWidth || 0;
    const naturalHeight = img.naturalHeight || 0;
    const width = img.clientWidth || 0;
    const height = img.clientHeight || 0;
    if (!naturalWidth || !naturalHeight || !width || !height) return;
    setDefectImageMetrics({ width, height, naturalWidth, naturalHeight });
  }, []);

  useEffect(() => {
    const img = defectImageRef.current;
    if (!img) return;
    updateDefectImageMetrics();
    const observer = new ResizeObserver(() => updateDefectImageMetrics());
    observer.observe(img);
    return () => observer.disconnect();
  }, [updateDefectImageMetrics, currentDefect?.id]);

  useEffect(() => {
    if (!isMapMode || !currentDefect) {
      setShowMapCrop(false);
      return;
    }
    setShowMapCrop(true);
    const timer = window.setTimeout(() => setShowMapCrop(false), 1200);
    return () => window.clearTimeout(timer);
  }, [isMapMode, currentDefect?.id]);

  const mapSurfaceInfo = useMemo(() => {
    const surface = currentDefect?.surface ?? surfaceImages[0]?.surface;
    if (!surface) return null;
    return surfaceImages.find(info => info.surface === surface) ?? null;
  }, [currentDefect, surfaceImages]);

  const mapSurface = mapSurfaceInfo?.surface ?? currentDefect?.surface ?? surfaceImages[0]?.surface ?? "top";
  const mapSeqNo = useMemo(() => {
    if (!selectedPlate) return null;
    const parsed = parseInt(selectedPlate.serialNumber, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [selectedPlate]);

  const mapFrameHeight = mapSurfaceInfo?.image_height ?? 0;
  const mapFrameWidth = mapSurfaceInfo?.image_width ?? 0;
  const mapFrameCount = mapSurfaceInfo?.frame_count ?? 0;
  const mapWorldWidth = mapFrameWidth;
  const mapWorldHeight = mapFrameHeight * mapFrameCount;
  const mapTileSize = mapFrameHeight > 0 ? mapFrameHeight : 1024;
  const mapMaxLevel = useMemo(() => {
    if (!mapFrameWidth || !mapTileSize) return 0;
    return Math.max(
      0,
      Math.ceil(Math.log2(Math.max(1, mapFrameWidth / mapTileSize))),
    );
  }, [mapFrameWidth, mapTileSize]);

  const hitTestMapDefect = useCallback(
    (worldX: number, worldY: number) => {
      if (!mapSurface || !mapFrameHeight) return null;
      for (const defect of visibleDefects) {
        if (defect.surface !== mapSurface) continue;
        const frameIndex = Math.max(0, defect.imageIndex - 1);
        const rectX = defect.x;
        const rectY = defect.y + frameIndex * mapFrameHeight;
        if (
          worldX >= rectX &&
          worldX <= rectX + defect.width &&
          worldY >= rectY &&
          worldY <= rectY + defect.height
        ) {
          return defect;
        }
      }
      return null;
    },
    [mapSurface, mapFrameHeight, visibleDefects],
  );

  const mapDefectWorld = useMemo(() => {
    if (!currentDefect || !mapFrameHeight) return null;
    const frameIndex = Math.max(0, currentDefect.imageIndex - 1);
    return {
      x: currentDefect.x + currentDefect.width / 2,
      y: currentDefect.y + currentDefect.height / 2 + frameIndex * mapFrameHeight,
    };
  }, [currentDefect, mapFrameHeight]);

  const mapFocusTarget = useMemo(() => {
    if (!isMapMode || !currentDefect || !mapDefectWorld) return null;
    const padding = Math.max(currentDefect.width, currentDefect.height, 120) * 2;
    const focusWidth = currentDefect.width + padding * 2;
    const focusHeight = currentDefect.height + padding * 2;
    return {
      x: Math.max(0, mapDefectWorld.x - focusWidth / 2),
      y: Math.max(0, mapDefectWorld.y - focusHeight / 2),
      width: focusWidth,
      height: focusHeight,
    };
  }, [isMapMode, currentDefect, mapDefectWorld]);

  const mapPrefetchHint = useMemo(() => {
    if (!isMapMode || !currentDefect) return null;
    const sameSurface = visibleDefects.filter(d => d.surface === currentDefect.surface);
    if (sameSurface.length === 0) return null;
    const idx = sameSurface.findIndex(d => d.id === currentDefect.id);
    const nextDefect = idx >= 0 && idx < sameSurface.length - 1 ? sameSurface[idx + 1] : sameSurface[0];
    if (!nextDefect) return null;
    return {
      x: nextDefect.x + nextDefect.width / 2,
      y: nextDefect.y + nextDefect.height / 2,
      imageIndex: Math.max(0, nextDefect.imageIndex - 1),
    };
  }, [isMapMode, currentDefect, visibleDefects]);

  const handleMapPointerMove = useCallback(
    (info: { worldX: number; worldY: number; screenX: number; screenY: number }) => {
      if (!isMapMode) return;
      const hit = hitTestMapDefect(info.worldX, info.worldY);
      setMapCursor(hit ? "pointer" : "grab");
      if (hit) {
        setHoveredDefect({ defect: hit, screenX: info.screenX, screenY: info.screenY });
      } else {
        setHoveredDefect(null);
      }
    },
    [isMapMode, hitTestMapDefect],
  );

  const handleMapPointerLeave = useCallback(() => {
    setMapCursor("grab");
    setHoveredDefect(null);
  }, []);

  const mapCropStyle = useMemo(() => {
    if (!showMapCrop || !mapViewport || !currentDefect || !mapDefectWorld) {
      return null;
    }
    const expand = defectCropExpand;
    const cropWorldWidth = currentDefect.width + expand * 2;
    const cropWorldHeight = currentDefect.height + expand * 2;
    const left = ((mapDefectWorld.x - mapViewport.x) / mapViewport.width) * 100;
    const top = ((mapDefectWorld.y - mapViewport.y) / mapViewport.height) * 100;
    const width = (cropWorldWidth / mapViewport.width) * 100;
    const height = (cropWorldHeight / mapViewport.height) * 100;
    if (!Number.isFinite(left) || !Number.isFinite(top) || width <= 0 || height <= 0) {
      return null;
    }
    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  }, [showMapCrop, mapViewport, currentDefect, mapDefectWorld]);

  const defectBoxStyle = useMemo(() => {
    if (!currentDefect || !defectImageMetrics) return null;
    const scaleX = defectImageMetrics.width / defectImageMetrics.naturalWidth;
    const scaleY = defectImageMetrics.height / defectImageMetrics.naturalHeight;
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null;
    return {
      left: `${defectCropExpand * scaleX}px`,
      top: `${defectCropExpand * scaleY}px`,
      width: `${currentDefect.width * scaleX}px`,
      height: `${currentDefect.height * scaleY}px`,
    };
  }, [currentDefect, defectImageMetrics, defectCropExpand]);

  const getViewportCenterX = useCallback(
    (viewport: { x: number; width: number } | null, worldWidth: number) => {
      return viewport ? viewport.x + viewport.width / 2 : worldWidth / 2;
    },
    [],
  );

  const handleTopViewportChange = useCallback(
    (info: { x: number; y: number; width: number; height: number }) => {
      topViewportRef.current = info;
      setAnalysisScrollState({
        top: info.y,
        height: topLayout.worldHeight || 1,
        clientHeight: info.height,
      });
      if (
        surfaceFilter === "all" &&
        isAnalysisSyncEnabled &&
        bottomLayout.worldHeight > 0 &&
        !syncLockRef.current
      ) {
        syncLockRef.current = true;
        setBottomCenterTarget({
          x: info.x + info.width / 2,
          y: info.y + info.height / 2,
        });
        if (!isWidthLockEnabled) {
          setBottomForcedScale(topScaleRef.current);
        }
        window.setTimeout(() => {
          syncLockRef.current = false;
        }, 60);
      }
    },
    [surfaceFilter, isAnalysisSyncEnabled, isWidthLockEnabled, topLayout, bottomLayout, getViewportCenterX],
  );

  const handleTopTransformChange = useCallback(
    (info: { x: number; y: number; scale: number }) => {
      topScaleRef.current = info.scale;
      
      // 记录用户行为用于预热预测
      globalPreheatManager.recordUserAction({
        type: 'zoom', // 缩放变化
        viewport: {
          x: info.x,
          y: info.y,
          width: 800, // 估算值
          height: 600,
          scale: info.scale,
        },
        timestamp: Date.now(),
      });
    },
    [],
  );

  const handleBottomViewportChange = useCallback(
    (info: { x: number; y: number; width: number; height: number }) => {
      bottomViewportRef.current = info;
      setAnalysisScrollState({
        top: info.y,
        height: bottomLayout.worldHeight || 1,
        clientHeight: info.height,
      });
      if (
        surfaceFilter === "all" &&
        isAnalysisSyncEnabled &&
        topLayout.worldHeight > 0 &&
        !syncLockRef.current
      ) {
        syncLockRef.current = true;
        setTopCenterTarget({
          x: info.x + info.width / 2,
          y: info.y + info.height / 2,
        });
        if (!isWidthLockEnabled) {
          setTopForcedScale(bottomScaleRef.current);
        }
        window.setTimeout(() => {
          syncLockRef.current = false;
        }, 60);
      }
    },
    [surfaceFilter, isAnalysisSyncEnabled, isWidthLockEnabled, topLayout, bottomLayout, getViewportCenterX],
  );

  const handleBottomTransformChange = useCallback(
    (info: { x: number; y: number; scale: number }) => {
      bottomScaleRef.current = info.scale;
      
      // 记录用户行为用于预热预测
      globalPreheatManager.recordUserAction({
        type: 'zoom',
        viewport: {
          x: info.x,
          y: info.y,
          width: 800,
          height: 600,
          scale: info.scale,
        },
        timestamp: Date.now(),
      });
    },
    [],
  );
  const currentImageUrl = useMemo(() => {
    // 若有选中缺陷，则优先展示该缺陷的小图（缺陷分析视图）
    if (currentDefect) {
      return getDefectImageUrl({
        defectId: currentDefect.id,
        surface: currentDefect.surface,
        // 不指定宽高，使用后端默认的 defect_cache_expand 和原始大小
      });
    }

    // 否则回退到钢板整体瓦片图（图像分析视图基底）
    if (!selectedPlate || surfaceImages.length === 0) {
      return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop";
    }
    
    const seqNo = parseInt(selectedPlate.serialNumber, 10);
    const surface = surfaceImages[0].surface; // Default to first surface
    
    return getTileImageUrl({
      surface,
      seqNo,
      level: 0,
      tileX: 0,
      tileY: 0,
      tileSize: surfaceImages[0].image_height || 512
    });
  }, [currentDefect, selectedPlate, surfaceImages]);


  const renderMapTile = useCallback(
    (ctx: CanvasRenderingContext2D, tile: Tile, tileSizeArg: number, scale: number) => {
      if (!mapSurface || mapSeqNo == null) {
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        return;
      }

      const imageScale = env.getImageScale();
      const cacheKey = `vertical-${mapSurface}-${mapSeqNo}-${tile.level}-${tile.col}-${tile.row}-${tileSizeArg}-s${imageScale}`;
      const cached = mapTileImageCache.get(cacheKey);
      const url = getTileImageUrl({
        surface: mapSurface,
        seqNo: mapSeqNo,
        level: tile.level,
        tileX: tile.col,
        tileY: tile.row,
        tileSize: tileSizeArg,
        fmt: "JPEG",
        prefetch: mapPrefetchHint
          ? {
              mode: "defect",
              x: mapPrefetchHint.x,
              y: mapPrefetchHint.y,
              imageIndex: mapPrefetchHint.imageIndex,
            }
          : undefined,
      });

      if (cached && cached.complete) {
        drawTileImage({
          ctx,
          img: cached,
          tile,
          orientation: "vertical",
        });
        return;
      }

      const drewFallback = tryDrawFallbackTile({
        ctx,
        tile,
        orientation: "vertical",
        cache: mapTileImageCache,
        cacheKeyPrefix: "vertical",
        surface: mapSurface,
        seqNo: mapSeqNo,
        tileX: tile.col,
        tileY: tile.row,
        tileSize: tileSizeArg,
        maxLevel: mapMaxLevel,
        imageScale,
        useTransparentBackground: true,
      });

      if (!mapTileImageLoading.has(cacheKey)) {
        mapTileImageLoading.add(cacheKey);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          mapTileImageCache.set(cacheKey, img);
          mapTileImageLoading.delete(cacheKey);
        };
        img.onerror = () => {
          mapTileImageLoading.delete(cacheKey);
        };
      }

      if (!drewFallback) {
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        ctx.strokeStyle = "#1f2937";
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
      }
    },
    [mapSurface, mapSeqNo, mapPrefetchHint, mapMaxLevel],
  );

  const renderMapOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      if (!mapSurface || !mapFrameHeight) return;
      const severityColor = (severity: DefectItem["severity"]) => {
        switch (severity) {
          case "high":
            return "#ef4444";
          case "medium":
            return "#f59e0b";
          default:
            return "#22c55e";
        }
      };

      visibleDefects.forEach((defect) => {
        if (defect.surface !== mapSurface) return;
        const rectX = defect.x;
        const frameIndex = Math.max(0, defect.imageIndex - 1);
        const rectY = defect.y + frameIndex * mapFrameHeight;
        const rectW = defect.width;
        const rectH = defect.height;

        ctx.save();
        ctx.strokeStyle = severityColor(defect.severity);
        ctx.lineWidth = isDefectSelected(defect) ? 3 / scale : 1.5 / scale;
        ctx.strokeRect(rectX, rectY, rectW, rectH);
        ctx.restore();
      });
    },
    [mapSurface, mapFrameHeight, visibleDefects, selectedDefectId, isDefectSelected],
  );

  // Dynamic Scale Calculation based on Actual Dimensions
  const box = useMemo(() => {
    if (!selectedPlate || !selectedPlate.dimensions) return { w: 160, h: 10, d: 80, actualT: 10 };
    
    // Handle missing dimensions with defaults (Height/Thickness defaults to 10 if missing)
    const width = selectedPlate.dimensions.width || 1500;
    const thickness = selectedPlate.dimensions.thickness ?? 10;
    const length = selectedPlate.dimensions.length || 8000;
    
    // Normalize logic for visual representation
    const w = Math.min(200, Math.max(80, (width / 2500) * 160));
    const h = Math.min(24, Math.max(4, (thickness / 50) * 20)); 
    const d = Math.min(120, Math.max(40, (length / 20000) * 80));
    
    return { w, h, d, actualT: thickness };
  }, [selectedPlate]);

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col font-sans overflow-hidden select-none relative">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--muted)); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary)); }

        .preserve-3d { transform-style: preserve-3d; }

        @keyframes steel-idle-float {
          0% { transform: translateY(0px) rotateX(var(--rx)) rotateY(var(--ry)); }
          50% { transform: translateY(-12px) rotateX(calc(var(--rx) - 3deg)) rotateY(calc(var(--ry) + 5deg)); }
          100% { transform: translateY(0px) rotateX(var(--rx)) rotateY(var(--ry)); }
        }
        .animate-idle {
          animation: steel-idle-float 4s ease-in-out infinite;
        }
      `}</style>
      {hoveredDefect && (
        <DefectHoverTooltip
          defect={hoveredDefect.defect}
          screenX={hoveredDefect.screenX}
          screenY={hoveredDefect.screenY}
          cardWidth={defectHoverCardWidth}
          imageStretch={defectHoverImageStretch}
          plateSize={
            selectedPlate
              ? {
                  width: selectedPlate.dimensions.width,
                  length: selectedPlate.dimensions.length,
                }
              : undefined
          }
        />
      )}
      {hoveredPlateRecord && plateHoverEnabled && (
        <PlateHoverTooltip
          plate={hoveredPlateRecord.plate}
          screenX={hoveredPlateRecord.screenX}
          screenY={hoveredPlateRecord.screenY}
          defectSummary={hoveredPlateSummary}
          showPreview={showPlatePreview}
          previewGroups={hoveredPlatePreview}
          maxSummaryItems={defectListHoverMaxCategories}
          previewMaxCategories={defectListHoverMaxCategories}
          previewMaxItems={defectListHoverMaxItems}
          previewItemSize={defectListHoverItemSize}
        />
      )}
      {/* Header */}
      <AnimatePresence>
        {!isImmersiveMode && (
          <motion.header 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`bg-muted border-b border-border flex items-center px-3 shrink-0 overflow-hidden relative ${useElectronDragRegion ? "electron-drag" : ""}`}
            onMouseDown={handleTauriDragStart}
            onDoubleClick={handleDragDoubleClick}
          >
            <div
              className={`flex items-center gap-4 ${canDrag ? "electron-no-drag" : ""}`}
            >
              <div className="flex items-center gap-2 pr-4 border-r border-border relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center gap-1 group transition-colors px-1 py-0.5 rounded hover:bg-muted-foreground/20 data-[state=open]:bg-muted-foreground/20 outline-none"
                    >
                      <span className="text-sm font-bold tracking-widest text-primary group-hover:text-foreground">北科工研</span>
                      <ChevronDown className="w-3 h-3 text-primary transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-muted border-border text-foreground p-0 z-50">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] text-muted-foreground border-b border-border mb-1 font-bold">系统主菜单</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate("/")} className="px-3 py-2 text-[11px] focus:bg-primary focus:text-primary-foreground cursor-pointer">
                      <Home className="w-3.5 h-3.5 mr-2" /> 现代仪表盘
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/BackendManagement")} className="px-3 py-2 text-[11px] focus:bg-primary focus:text-primary-foreground cursor-pointer">
                      <Shield className="w-3.5 h-3.5 mr-2" /> 后台管理系统
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-3 py-2 text-[11px] focus:bg-primary focus:text-primary-foreground cursor-pointer">
                      <Box className="w-3.5 h-3.5 mr-2" /> 数据导出工具
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-3 py-2 text-[11px] focus:bg-primary focus:text-primary-foreground cursor-pointer">
                      <Terminal className="w-3.5 h-3.5 mr-2" /> 系统日志查看
                    </DropdownMenuItem>
                    <div className="border-t border-border mt-1 pt-1 pb-1">
                      <DropdownMenuItem onClick={() => navigate("/")} className="px-3 py-2 text-[11px] text-destructive focus:bg-destructive focus:text-primary-foreground cursor-pointer">
                        <LogOut className="w-3.5 h-3.5 mr-2" /> 退出传统仪表盘
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Main Dropdown Menu */}
                {showMainMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMainMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-muted border border-border shadow-2xl z-50 py-1 flex flex-col animate-in fade-in zoom-in duration-100 origin-top-left">
                      <div className="px-3 py-2 text-[10px] text-muted-foreground border-b border-border mb-1 font-bold">系统主菜单</div>
                      <button 
                        onClick={() => navigate("/")}
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-primary hover:text-foreground transition-colors text-left"
                      >
                        <Home className="w-3.5 h-3.5" /> 现代仪表盘
                      </button>
                      <button 
                        onClick={() => { navigate("/BackendManagement"); setShowMainMenu(false); }}
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-primary hover:text-foreground transition-colors text-left"
                      >
                        <Shield className="w-3.5 h-3.5" /> 后台管理系统
                      </button>
                      <button 
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-primary hover:text-foreground transition-colors text-left"
                        onClick={() => setShowMainMenu(false)}
                      >
                        <Box className="w-3.5 h-3.5" /> 数��导出工具
                      </button>
                      <button 
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-primary hover:text-foreground transition-colors text-left"
                        onClick={() => setShowMainMenu(false)}
                      >
                        <Terminal className="w-3.5 h-3.5" /> 系统日志查看
                      </button>
                      <div className="border-t border-border mt-1 pt-1">
                        <button 
                          onClick={() => navigate("/")}
                          className="px-3 py-2 text-[11px] flex items-center gap-2 text-destructive hover:bg-[#f85149] hover:text-foreground transition-colors text-left w-full"
                        >
                          <LogOut className="w-3.5 h-3.5" /> 退出传统仪表盘
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <nav className="flex items-center h-full">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item}
                    onClick={() => setActiveNav(item)}
                    className={`px-3 h-10 text-[11px] font-bold transition-all border-b-2 ${
                      activeNav === item 
                        ? "text-primary border-primary bg-[#58a6ff]/10" 
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>

            <div className={`flex items-center gap-6 flex-1 justify-center ${canDrag ? "electron-no-drag" : ""}`}>
              <button
                onClick={() => setIsDataSourceOpen(true)}
                className="flex items-center gap-2 group cursor-pointer hover:bg-muted-foreground/20/30 px-4 py-1 rounded transition-colors"
              >
                <span className="text-[14px] font-bold text-foreground tracking-[0.2em]">
                  {currentLine || companyName}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDataSourceOpen ? 'rotate-180' : ''} group-hover:text-primary`} />
              </button>
            </div>

            <div className={`shrink-0 flex items-center gap-2 text-[11px] ${canDrag ? "electron-no-drag" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#30363d]/30 text-muted-foreground border border-border">
                  <div className="text-[9px] uppercase font-bold opacity-60">CAM TEMP</div>
                  <span className="font-mono text-[11px] text-card-foreground">42.8°C</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#30363d]/30 text-muted-foreground border border-border">
                  <div className="text-[9px] uppercase font-bold opacity-60">LINK SPD</div>
                  <span className="font-mono text-[11px] text-card-foreground">10Gbps</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                    <span className="font-mono">{systemStatusLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <LiveClock formatTime={formatTime} />
                {isWebOnly && (
                  <button
                    onClick={() => navigate("/download")}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="下载中心"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => navigate("/reports")}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="报表"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  ref={diagnosticButtonRef}
                  onClick={() => setIsDiagnosticOpen(true)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="系统诊断"
                >
                  <Activity className="w-4 h-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="工具"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-muted border-border text-card-foreground"
                  >
                    <DropdownMenuLabel className="text-muted-foreground font-normal">
                      工具
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                      <DropdownMenuItem
                        onClick={() => navigate("/cache")}
                        className="cursor-pointer focus:bg-secondary focus:text-foreground text-xs flex items-center gap-2"
                      >
                        <Database className="w-3.5 h-3.5" />
                        缓存调试
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/status")}
                        className="cursor-pointer focus:bg-secondary focus:text-foreground text-xs flex items-center gap-2"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        状态
                      </DropdownMenuItem>
                      {testModelEnabled && (
                        <DropdownMenuItem
                          onClick={() => navigate("/test_model")}
                          className="cursor-pointer focus:bg-secondary focus:text-foreground text-xs flex items-center gap-2"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        模拟运行测试
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="系统设置"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 shadow-sm shadow-black/30 focus:outline-none hover:text-foreground transition-colors">
                      <Avatar className="h-6 w-6 shrink-0 rounded-full cursor-pointer border border-border">
                        <AvatarImage src="" alt="@user" />
                        <AvatarFallback className="bg-[#30363d] text-card-foreground leading-none text-center rounded-full text-[10px]">
                          {currentUser ? (
                            currentUser.username[0].toUpperCase()
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0d1117] ${currentUser ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
                      ></span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-muted border-border text-card-foreground"
                  >
                    <DropdownMenuLabel className="text-muted-foreground font-normal">
                      {currentUser ? (
                        <div className="flex flex-col space-y-1 py-1">
                          <p className="text-sm font-medium leading-none text-foreground">
                            {currentUser.username}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {currentUser.role}
                          </p>
                        </div>
                      ) : (
                        "用户未登录"
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-[#30363d] focus:text-foreground text-xs"
                    >
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      <span>用户设置</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsDataSourceOpen(true)}
                      className="cursor-pointer focus:bg-[#30363d] focus:text-foreground text-xs"
                    >
                      <Database className="mr-2 h-3.5 w-3.5" />
                      <span>切换数据源</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    {currentUser ? (
                      <DropdownMenuItem
                        onClick={() => {
                          setCurrentUser(null);
                          saveUser(null);
                          toast.success("已退出登录");
                        }}
                        className="cursor-pointer focus:bg-[#30363d] focus:text-destructive text-destructive text-xs"
                      >
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        <span>退出登录</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setIsLoginOpen(true)}
                        className="cursor-pointer focus:bg-[#30363d] focus:text-foreground text-xs"
                      >
                        <LogIn className="mr-2 h-3.5 w-3.5" />
                        <span>登录</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {hasWindowControls && (
                <div className="flex items-center gap-1 text-card-foreground">
                  <button
                    className="p-1.5 hover:bg-white/10 rounded"
                    onClick={() => {
                      if (isElectron) {
                        window.electronWindow?.minimize?.();
                      } else {
                        void withTauriWindow((appWindow) =>
                          appWindow.minimize(),
                        );
                      }
                    }}
                    title="最小化"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-white/10 rounded"
                    onClick={async () => {
                      if (isImmersiveMode) {
                        setIsImmersiveMode(false);
                        return;
                      }
                      if (document.fullscreenElement && document.exitFullscreen) {
                        await document.exitFullscreen();
                        return;
                      }
                      if (isElectron) {
                        const next = await window.electronWindow?.toggleMaximize?.();
                        if (typeof next === "boolean") setIsMaximized(next);
                      } else {
                        await withTauriWindow(async (appWindow) => {
                          await appWindow.toggleMaximize();
                          const next = await appWindow.isMaximized();
                          if (typeof next === "boolean") setIsMaximized(next);
                        });
                      }
                    }}
                    title={isImmersiveMode || document.fullscreenElement ? "还原" : isMaximized ? "还原" : "最大化"}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-red-500/80 rounded"
                    onClick={() => {
                      if (isElectron) {
                        window.electronWindow?.close?.();
                      } else {
                        void withTauriWindow((appWindow) => appWindow.close());
                      }
                    }}
                    title="关闭"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        gridCols={gridCols}
        setGridCols={setGridCols}
        isImageFit={isImageFit}
        setIsImageFit={setIsImageFit}
        refreshLimit={refreshLimit}
        setRefreshLimit={setRefreshLimit}
        distributionScaleMode={distributionScaleMode}
        setDistributionScaleMode={(mode) =>
          updateSetting("distributionScaleMode", mode)
        }
        lineKey={currentLineKey}
        apiNodes={apiNodes}
        companyName={companyName}
      />

      <SystemDiagnosticDialog
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        triggerRef={diagnosticButtonRef}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 p-0.5 gap-0.5">
        {/* Left Sidebar - Widened and Compact Layout */}
        <AnimatePresence>
          {!isImmersiveMode && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col gap-0.5 bg-card overflow-hidden"
            >
              {/* List Tabs */}
              <div className="h-8 flex gap-0.5 bg-muted p-0.5">
                <button 
                  onClick={() => setSidebarTab('records')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors ${
                    sidebarTab === 'records' 
                      ? 'bg-card text-primary border border-primary/30 shadow-[0_0_10px_rgba(88,166,255,0.1)]' 
                      : 'text-muted-foreground hover:bg-[#1f242b] hover:text-card-foreground'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  钢板记录
                </button>
                <button 
                  onClick={() => setSidebarTab('defects')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors ${
                    sidebarTab === 'defects' 
                      ? 'bg-card text-destructive border border-[#f85149]/30 shadow-[0_0_10px_rgba(248,81,73,0.1)]' 
                      : 'text-muted-foreground hover:bg-[#1f242b] hover:text-card-foreground'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  缺陷统计
                </button>
              </div>

          <div className="h-32 bg-card relative flex items-center justify-center overflow-hidden border-b border-border">
            <AnimatePresence mode="wait">
              {sidebarTab === 'records' ? (
                <motion.div
                  key="3d-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing group/view"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ perspective: '1000px' }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1f242d_0%,transparent_70%)] opacity-50 pointer-events-none" />
                  
                  {/* CSS 3D Steel Plate */}
                  <div 
                    className={`relative transition-transform duration-75 ease-out preserve-3d ${!isDragging ? 'group-hover/view:[animation-play-state:paused] animate-idle' : ''}`} 
                    style={{ 
                      width: `${box.w}px`, 
                      height: `${box.h}px`,
                      transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                      '--rx': `${rotX}deg`,
                      '--ry': `${rotY}deg`
                    } as any}
                  >
                    {/* FRONT FACE */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#c9d1d9] to-[#8b949e] border border-white/20 shadow-lg pointer-events-none flex items-center justify-center"
                         style={{ transform: `translateZ(${box.d / 2}px)` }}>
                      <div className="absolute -top-6 left-0 right-0 flex flex-col items-center">
                         <div className="w-full h-px bg-[#58a6ff]/50 relative">
                           <div className="absolute left-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                           <div className="absolute right-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                         </div>
                         <span className="text-[9px] text-primary font-bold mt-0.5 whitespace-nowrap">W {selectedPlate?.dimensions.width || 0}mm</span>
                      </div>
                      <div className="absolute -left-12 top-0 bottom-0 flex items-center gap-1">
                         <span className="text-[9px] text-primary font-bold whitespace-nowrap">T {(box.actualT ?? 10).toFixed(1)}</span>
                         <div className="h-full w-px bg-[#58a6ff]" />
                      </div>
                    </div>

                    {/* BACK FACE */}
                    <div className="absolute inset-0 bg-[#30363d] border border-white/10"
                         style={{ transform: `rotateY(180deg) translateZ(${box.d / 2}px)` }} />

                    {/* TOP FACE */}
                    <div className="absolute bg-gradient-to-t from-[#8b949e] to-[#484f58] border border-white/10"
                         style={{ 
                           width: `${box.w}px`, 
                           height: `${box.d}px`, 
                           left: '0',
                           top: '50%',
                           marginTop: `-${box.d / 2}px`,
                           transform: `rotateX(90deg) translateZ(${box.h / 2}px)` 
                         }}>
                      <div className="absolute inset-0 opacity-20 bg-[grid-white/10] [background-size:15px_15px]" />
                      <div className="absolute top-1/2 -right-14 -translate-y-1/2 flex items-center gap-1 origin-left rotate-90">
                         <div className="w-16 h-px bg-[#58a6ff]/50 relative">
                           <div className="absolute left-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                           <div className="absolute right-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                         </div>
                         <span className="text-[9px] text-primary font-bold whitespace-nowrap">L {selectedPlate?.dimensions.length || 0}</span>
                      </div>
                    </div>

                    {/* BOTTOM FACE */}
                    <div className="absolute bg-muted"
                         style={{ 
                           width: `${box.w}px`, 
                           height: `${box.d}px`, 
                           left: '0',
                           top: '50%',
                           marginTop: `-${box.d / 2}px`,
                           transform: `rotateX(-90deg) translateZ(${box.h / 2}px)` 
                         }} />

                    {/* RIGHT SIDE FACE */}
                    <div className="absolute bg-secondary border-l border-white/5"
                         style={{ 
                           width: `${box.d}px`, 
                           height: `${box.h}px`, 
                           top: '0',
                           left: '50%',
                           marginLeft: `-${box.d / 2}px`,
                           transform: `rotateY(90deg) translateZ(${box.w / 2}px)` 
                         }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                    </div>

                    {/* LEFT SIDE FACE */}
                    <div className="absolute bg-secondary border-r border-white/5"
                         style={{ 
                           width: `${box.d}px`, 
                           height: `${box.h}px`, 
                           top: '0',
                           left: '50%',
                           marginLeft: `-${box.d / 2}px`,
                           transform: `rotateY(-90deg) translateZ(${box.w / 2}px)` 
                         }} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chart-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div className="flex-1 min-h-0 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={defectChartData}
                        margin={{ top: 15, right: 30, left: 85, bottom: 5 }}
                        barSize={16}
                      >
                        <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#30363d" opacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8b949e', fontSize: 10 }}
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: '#ffffff', opacity: 0.05 }}
                          contentStyle={{ 
                            backgroundColor: '#0d1117', 
                            border: '1px solid #30363d',
                            borderRadius: '0',
                            fontSize: '10px',
                            padding: '2px 6px'
                          }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[0, 1, 1, 0]}
                          label={{ position: 'right', fill: '#8b949e', fontSize: 8, offset: 4 }}
                        >
                          {defectChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Area - Upgraded with Independent Query Tabs */}
          <div className="bg-muted flex flex-col border-b border-border">
            {/* Query Tabs */}
            <div className="h-7 flex gap-[1px] bg-card p-[1px]">
              {[
                { id: "SN", label: "流水号" },
                { id: "ID", label: "板号" },
                { id: "TIME", label: "时间" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setQueryTab(tab.id)}
                  className={`flex-1 text-[10px] font-bold transition-all ${
                    queryTab === tab.id 
                      ? "bg-muted text-primary border-t border-x border-border" 
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-2.5 space-y-2.5">
              {queryTab === "SN" && (
                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-left-1 duration-200">
                  <label className="text-[9px] text-muted-foreground pl-1 font-bold flex items-center gap-1">
                    <Terminal className="w-2.5 h-2.5" /> 精确流水号查���
                  </label>
                    <input 
                      type="text" 
                      value={searchCriteria.serialNumber ?? ""}
                      onChange={(e) =>
                        setSearchCriteria(prev => ({
                          ...prev,
                          serialNumber: e.target.value || undefined,
                        }))
                      }
                      placeholder="输入完整流水号 (如: SN20260104...)"
                    className="h-8 bg-card border border-border text-[11px] px-2 text-card-foreground focus:border-primary outline-none transition-colors w-full" 
                  />
                </div>
              )}

              {queryTab === "ID" && (
                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-1 duration-200">
                  <label className="text-[9px] text-muted-foreground pl-1 font-bold flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" /> 钢板唯一标识查询
                  </label>
                    <input 
                      type="text" 
                      value={searchCriteria.plateId ?? ""}
                      onChange={(e) =>
                        setSearchCriteria(prev => ({
                          ...prev,
                          plateId: e.target.value || undefined,
                        }))
                      }
                      placeholder="输入钢板 ID (如: H2255043...)"
                    className="h-8 bg-card border border-border text-[11px] px-2 text-card-foreground focus:border-primary outline-none transition-colors w-full" 
                  />
                </div>
              )}

              {queryTab === "TIME" && (
                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200 relative">
                  <label className="text-[9px] text-muted-foreground pl-1 font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> 生产时间区间回溯
                  </label>
                  <div className="flex flex-col gap-[2px]">
                    <button 
                      onClick={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                      className="flex items-center gap-2 h-7 bg-card border border-border px-2 hover:border-primary transition-colors group"
                    >
                      <span className="text-[9px] text-muted-foreground w-8 text-left">开始</span>
                      <span className="flex-1 text-[10px] text-card-foreground text-left">
                        {startDate || "请选择起始时间"}
                      </span>
                      <Calendar className="w-3 h-3 text-[#30363d] group-hover:text-primary" />
                    </button>
                    
                    <button 
                      onClick={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                      className="flex items-center gap-2 h-7 bg-card border border-border px-2 hover:border-primary transition-colors group"
                    >
                      <span className="text-[9px] text-muted-foreground w-8 text-left">结束</span>
                      <span className="flex-1 text-[10px] text-card-foreground text-left">
                        {endDate || "请选择结束时间"}
                      </span>
                      <Calendar className="w-3 h-3 text-[#30363d] group-hover:text-primary" />
                    </button>
                  </div>

                  {/* Industrial Date Picker Popup */}
                  {activePicker && (
                    <>
                      <div className="fixed inset-0 z-[60] backdrop-blur-[2px] bg-black/20" onClick={() => { setActivePicker(null); setPickerPos({x: 0, y: 0}); }} />
                      <div 
                        style={{ transform: `translate(${pickerPos.x}px, ${pickerPos.y}px)` }}
                        className="absolute top-full left-4 -right-4 mt-1 bg-muted/95 backdrop-blur-md border border-border shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[70] p-4 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-left rounded-sm"
                      >
                        <div className="flex flex-col gap-4">
                          <div 
                            className="flex items-center justify-between border-b border-border pb-2 cursor-move active:cursor-grabbing select-none"
                            onMouseDown={(e) => {
                              setIsDraggingPicker(true);
                              setPickerDragStart({ x: e.clientX - pickerPos.x, y: e.clientY - pickerPos.y });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 bg-[#58a6ff] rounded-full" />
                              <span className="text-[11px] font-bold text-foreground tracking-wider">
                                设定{activePicker === 'start' ? '起始' : '截止'}时刻
                              </span>
                            </div>
                            <button 
                              onMouseDown={(e) => e.stopPropagation()} 
                              onClick={() => { setActivePicker(null); setPickerPos({x: 0, y: 0}); }} 
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                             <div className="relative group">
                               <input 
                                 type="datetime-local" 
                                 value={activePicker === 'start' ? startDate : endDate}
                                 onChange={(e) => {
                                   if (activePicker === 'start') setStartDate(e.target.value);
                                   else setEndDate(e.target.value);
                                 }}
                                 className="w-full h-9 bg-card border border-border text-[12px] text-card-foreground px-3 outline-none focus:border-primary focus:ring-1 focus:ring-[#58a6ff]/30 transition-all rounded-sm appearance-none custom-datetime-input"
                               />
                               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/50">
                                 <Clock className="w-3.5 h-3.5" />
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-2">
                               <button 
                                 onClick={() => {
                                   const now = new Date();
                                   const str = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                   if (activePicker === 'start') setStartDate(str);
                                   else setEndDate(str);
                                 }}
                                 className="h-7 bg-secondary text-[10px] font-bold text-card-foreground hover:bg-muted-foreground/20 hover:text-foreground border border-border transition-colors flex items-center justify-center gap-1.5"
                               >
                                 <RefreshCcw className="w-3 h-3" />
                                 设为当前
                               </button>
                               <button 
                                 onClick={() => {
                                   if (activePicker === 'start') setStartDate("");
                                   else setEndDate("");
                                 }}
                                 className="h-7 bg-secondary text-[10px] font-bold text-destructive hover:bg-[#f85149]/10 border border-border hover:border-[#f85149]/50 transition-colors flex items-center justify-center gap-1.5"
                               >
                                 <AlertCircle className="w-3 h-3" />
                                 重置清除
                               </button>
                             </div>
                          </div>

                          <div className="pt-2 border-t border-border">
                            <button 
                              onClick={() => setActivePicker(null)}
                              className="w-full h-8 bg-success hover:bg-[#2ea043] text-primary-foreground text-[11px] font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                              应用��更
                            </button>
                          </div>
                        </div>
                        
                        {/* Decorative Corner */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary/20 pointer-events-none" />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-[2px] pt-1">
                <button 
                  onClick={async () => {
                    setIsQueryActive(true);
                    await loadPlatesWithCriteria(searchCriteria, refreshLimit, true);
                  }}
                  className="flex-1 h-8 bg-success/20 border border-success/40 text-success text-[11px] font-bold hover:bg-success/40 transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" /> 检索数据库
                </button>
                <button
                  onClick={() => setIsFilterDialogOpen(true)}
                  className="w-10 h-8 bg-secondary border border-border text-muted-foreground flex items-center justify-center hover:bg-muted-foreground/20 transition-colors">
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Selection Card - Redesigned for Industrial Sophistication */}
          <div className="bg-muted p-2 border-y border-border relative overflow-hidden group">
            {/* Top glass reflection effect */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#58a6ff]/50 to-transparent" />
            
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] shadow-[0_0_8px_#58a6ff]" />
                  <span className="text-[9px] font-bold text-card-foreground uppercase tracking-wider">检测目标</span>
                </div>
                <div className="text-[16px] font-black text-foreground font-mono tracking-tighter">
                  {selectedPlate?.plateId || "WAITING..."}
                </div>
              </div>
              <div className="px-2 py-0.5 rounded bg-[#58a6ff]/20 border border-primary/40">
                <span className="text-[11px] font-bold text-primary font-mono">
                  {selectedPlate?.level ? (
                    {
                      '1': '一等', '2': '二等', '3': '三等', '4': '四等',
                      'A': '一等', 'B': '二等', 'C': '三等'
                    }[selectedPlate.level] || `${selectedPlate.level}等`
                  ) : "-"}
                </span>
              </div>
            </div>

            {/* Compact Row-based Info - 2 Columns Layout with Larger Text */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-2 py-2.5 bg-card/50 rounded-sm border border-border/30">
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-card-foreground shrink-0">序号:</span>
                <span className="text-foreground font-mono font-bold truncate">
                  {selectedPlate?.serialNumber || "---"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-card-foreground shrink-0">钢种:</span>
                <span className="text-foreground font-bold truncate">
                  {selectedPlate?.steelGrade || "---"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-card-foreground shrink-0">规格:</span>
                <span className="text-primary font-mono font-bold truncate">
                  {selectedPlate?.dimensions?.width || 0}×{(selectedPlate?.dimensions?.thickness ?? 10).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-card-foreground shrink-0">缺陷:</span>
                <span className="text-destructive font-mono font-bold">
                  {selectedPlate?.defectCount || 0} pts
                </span>
              </div>
            </div>

            {/* Bottom timestamp bar - Highly Visible */}
            <div className="mt-2 pt-1.5 border-t border-border flex justify-between items-center px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-foreground font-mono font-bold bg-[#30363d]/50 px-1.5 py-0.5 rounded-sm">
                  {selectedPlate ? new Date(selectedPlate.timestamp).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-') : "----/--/-- --:--:--"}
                </span>
              </div>
              <div className="text-[9px] text-success font-bold font-mono">
                <TimeSince timestamp={selectedPlate?.timestamp} />
              </div>
            </div>
          </div>

          {/* List Statistics */}
          <div className="h-6 bg-muted flex items-center justify-between px-2 text-[9px] border-b border-border">
            <div className="flex gap-3">
              <span>合计 {plates.length}</span>
              <span className="text-success">正常 {plates.filter(p => p.level === 'A' || p.level === 'B').length}</span>
              <span className="text-destructive">报警 {plates.filter(p => p.level === 'D').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <AnimatePresence>
                {isQueryActive && (
                  <motion.button
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    onClick={() => setIsQueryActive(false)}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-[#f85149]/10 text-destructive border border-[#f85149]/30 rounded-[1px] hover:bg-[#f85149]/20 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>退出查询</span>
                  </motion.button>
                )}
              </AnimatePresence>
              
              <button 
                onClick={() => {
                  setSelectedPlate(plates[0]);
                  const scrollContainer = document.querySelector('.custom-scrollbar');
                  if (scrollContainer) scrollContainer.scrollTop = 0;
                }}
                className="p-1 hover:bg-muted-foreground/20 text-muted-foreground transition-colors rounded-sm"
                title="回到顶部"
              >
                <ArrowUpToLine className="w-3 h-3" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-muted-foreground/20 text-muted-foreground transition-colors rounded-sm">
                    <Filter className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-muted border-border text-[10px] min-w-[100px] p-1 shadow-2xl">
                  <DropdownMenuLabel className="text-muted-foreground py-1 px-2 text-[9px] font-bold">列表过滤</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#30363d]" />
                  <DropdownMenuItem onClick={() => setListFilter("all")} className={`focus:bg-[#30363d] focus:text-foreground cursor-pointer py-1 px-2 rounded-sm ${listFilter === 'all' ? 'text-primary' : 'text-card-foreground'}`}>
                    全部结果
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setListFilter("normal")} className={`focus:bg-[#30363d] focus:text-foreground cursor-pointer py-1 px-2 rounded-sm ${listFilter === 'normal' ? 'text-primary' : 'text-card-foreground'}`}>
                    仅看一等/二等
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setListFilter("alert")} className={`focus:bg-[#30363d] focus:text-foreground cursor-pointer py-1 px-2 rounded-sm ${listFilter === 'alert' ? 'text-primary' : 'text-card-foreground'}`}>
                    ��看报警/等外
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <RotateCw 
                onClick={handleRefresh}
                className="w-3 h-3 text-primary cursor-pointer hover:scale-110 transition-transform ml-1 hover:rotate-180 duration-500" 
                title={`刷新列表 (加载 ${refreshLimit} 条)`}
              />
            </div>
          </div>

          {/* Plate List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden border border-border custom-scrollbar">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <thead className="sticky top-0 bg-muted shadow-sm z-10">
                <tr className="text-muted-foreground text-left">
                  <th className="w-[85px] px-1.5 py-2 font-bold border-r border-border">钢板号</th>
                  <th className="w-[65px] px-1.5 py-2 font-bold border-r border-border">钢种</th>
                  <th className="w-[45px] px-1.5 py-2 font-bold border-r border-border text-center">长</th>
                  <th className="w-[45px] px-1.5 py-2 font-bold border-r border-border text-center">宽</th>
                  <th className="w-[45px] px-1.5 py-2 font-bold border-r border-border text-center">时间</th>
                  <th className="w-[50px] px-1.5 py-2 font-bold text-center">等级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50">
                  {filteredPlates
                    .map((plate, index) => (
                  <tr 
                    key={`${plate.plateId}-${plate.serialNumber}`} 
                    onClick={() => setSelectedPlate(plate)}
                    onMouseEnter={(event) =>
                      handlePlateHover(plate, {
                        screenX: event.clientX,
                        screenY: event.clientY,
                      })
                    }
                    onMouseMove={(event) =>
                      handlePlateHover(plate, {
                        screenX: event.clientX,
                        screenY: event.clientY,
                      })
                    }
                    onMouseLeave={handlePlateHoverEnd}
                    className={`cursor-pointer group transition-colors ${
                      selectedPlate?.serialNumber === plate.serialNumber 
                        ? 'bg-[#58a6ff]/15' 
                        : index % 2 === 0 ? 'bg-card' : 'bg-muted'
                    } hover:bg-[#1f242b]`}
                  >
                    <td className="px-1.5 py-1.5 border-r border-border/50 font-mono font-medium text-foreground truncate">{plate.plateId}</td>
                    <td className="px-1.5 py-1.5 border-r border-border/50 text-card-foreground truncate">{plate.steelGrade}</td>
                    <td className="px-1.5 py-1.5 border-r border-border/50 text-center text-muted-foreground font-mono">{plate.dimensions.length}</td>
                    <td className="px-1.5 py-1.5 border-r border-border/50 text-center text-muted-foreground font-mono">{plate.dimensions.width}</td>
                    <td className="px-1.5 py-1.5 border-r border-border/50 text-muted-foreground font-mono text-center">
                      {new Date(plate.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[11px] ${
                        plate.level === 'A' ? 'bg-[#3fb950]/20 text-success border border-[#3fb950]/30' :
                        plate.level === 'B' ? 'bg-[#58a6ff]/20 text-primary border border-primary/30' :
                        plate.level === 'C' ? 'bg-warning/20 text-warning border border-[#d29922]/30' :
                        'bg-[#f85149]/20 text-destructive border border-[#f85149]/30'
                      }`}>
                        {plate.level === 'A' ? '一等' : plate.level === 'B' ? '二等' : plate.level === 'C' ? '三等' : '等外'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>

    {/* Central Map Strip (Horizontal) */}
        <AnimatePresence>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-card flex flex-col border border-border overflow-hidden whitespace-nowrap"
          >
             <div className="h-6 bg-muted border-b border-border flex items-center justify-between px-1 text-[9px]">
               <span>
                 {surfaceFilter === 'bottom'
                   ? '下表分布'
                   : surfaceFilter === 'top'
                     ? '上表分布'
                     : '横向分布'}
               </span>
               <div className="flex gap-1">
                 <ZoomIn className="w-3 h-3" />
                 <ZoomOut className="w-3 h-3" />
               </div>
             </div>
             <div className="flex-1 relative flex items-center justify-center bg-muted/30 overflow-x-auto overflow-y-hidden">
               {/* Viewport Indicator */}
               {activeNav === "图像分析" && (surfaceFilter === 'all' || surfaceFilter === 'top') && (
                 <div
                   className="absolute top-0 bottom-0 border-2 border-primary bg-[#58a6ff]/20 pointer-events-none z-10"
                   style={distributionViewportStyle}
                 />
               )}
               {/* Ruler - Horizontal */}
               <div className="absolute left-0 right-0 h-4 border-b border-border/50 flex justify-between px-2 text-[8px] text-muted-foreground">
                 <span>0mm</span>
                 <span>长度</span>
                 <span>尾</span>
               </div>
               {/* Map Grid */}
             <div
               className="h-full w-full relative cursor-pointer group flex items-center"
               onMouseDown={handleDistributionInteraction}
               onMouseMove={handleDistributionInteraction}
               onWheel={(e) => handleDistributionWheel(e, topDistributionDefects)}
             >
               {/* Plate Visual Representation (Horizontal Strip) */}
               <div ref={distributionPlateRef} className="h-[70%] w-full bg-muted relative border-y border-border">
                 {distributionTilePlan && distributionSurface && analysisSeqNo != null && (
                   <div className="absolute inset-0 pointer-events-none">
                     {distributionTilePlan.tiles.map((tile) => {
                       const url = getTileImageUrl({
                         surface: distributionSurface,
                         seqNo: analysisSeqNo,
                         level: distributionTilePlan.level,
                         tileX: tile.tileX,
                         tileY: tile.tileY,
                         tileSize: distributionTilePlan.tileSize,
                         fmt: "JPEG",
                         orientation: "horizontal",
                       });
                       return (
                         <img
                           key={`dist-tile-${distributionSurface}-${analysisSeqNo}-${distributionTilePlan.level}-${tile.tileX}-${tile.tileY}`}
                           src={url}
                           alt="distribution-tile"
                           className="absolute select-none"
                           draggable={false}
                           loading="lazy"
                           decoding="async"
                           onDragStart={(e) => e.preventDefault()}
                           style={{
                             left: `${tile.left}%`,
                             top: `${tile.top}%`,
                             width: `${tile.width}%`,
                             height: `${tile.height}%`,
                             objectFit: "fill",
                             opacity: 0.4,
                           }}
                         />
                       );
                     })}
                   </div>
                 )}
                 {/* Grid lines inside plate - Vertical for horizontal layout */}
                 <div className="h-px w-full bg-[#30363d]/50 absolute top-1/2 -translate-y-1/2" />
                 <div className="h-full w-px bg-[#30363d]/20 absolute left-[25%]" />
                 <div className="h-full w-px bg-[#30363d]/20 absolute left-[50%]" />
                 <div className="h-full w-px bg-[#30363d]/20 absolute left-[75%]" />
                 {selectedTopDistributionDefect && (() => {
                   const surfaceMeta = surfaceImages.find(
                     (info) => info.surface === selectedTopDistributionDefect.surface,
                   );
                   const pos = getDistributionMarkerPosition(
                     selectedTopDistributionDefect,
                     distributionDraw,
                     surfaceMeta,
                   );
                   if (!pos) return null;
                   const crossSize = Math.max(
                     12,
                     Math.min(20, Math.round(distributionPlateSize.width * 0.08)),
                   );
                   return (
                     <div
                       className="absolute pointer-events-none z-20"
                       style={{
                         top: `${pos.top}%`,
                         left: `${pos.left}%`,
                         width: crossSize,
                         height: crossSize,
                         transform: "translate(-50%, -50%)",
                       }}
                     >
                       <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#58a6ff]" />
                       <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#58a6ff]" />
                     </div>
                   );
                 })()}
                 
                 {/* Real Defect points mapping */}
                 {topDistributionDefects.map((defect, index) => {
                   const surfaceMeta = surfaceImages.find((info) => info.surface === defect.surface);
                   const frameHeight = surfaceMeta?.image_height ?? 0;
                   const frameWidth = surfaceMeta?.image_width ?? 0;
                   const frameCount = surfaceMeta?.frame_count ?? 0;
                   const mosaicHeight = frameHeight * frameCount;
                   const mosaicWidth = frameWidth;
                   const frameIndex = Math.max(0, defect.imageIndex - 1);
                   const worldX = defect.x;
                   const worldY = defect.y + frameIndex * frameHeight;

                   let topPos = mosaicHeight ? (worldY / mosaicHeight) * 100 : 0;
                   let leftPos = mosaicWidth ? (worldX / mosaicWidth) * 100 : 0;
                   if (distributionDraw) {
                     const leftPx =
                       distributionDraw.offsetX +
                       (worldX / distributionDraw.mosaicWidth) * distributionDraw.drawWidth;
                     const topPx =
                       distributionDraw.offsetY +
                       (worldY / distributionDraw.mosaicHeight) * distributionDraw.drawHeight;
                     leftPos = (leftPx / distributionDraw.containerWidth) * 100;
                     topPos = (topPx / distributionDraw.containerHeight) * 100;
                   }
                   
                    const keySuffix = `${defect.id ?? index}-${defect.surface ?? "unknown"}`;
                    const defectColor = resolveDefectColor(defect);

                    return (
                      <div 
                       key={`dist-dot-${keySuffix}`}
                        onMouseEnter={(e) =>
                          setHoveredDefect({
                            defect,
                            screenX: e.clientX,
                            screenY: e.clientY,
                          })
                        }
                        onMouseMove={(e) =>
                          setHoveredDefect({
                            defect,
                            screenX: e.clientX,
                            screenY: e.clientY,
                          })
                        }
                        onClick={() => {
                          setSelectedDefectId(defect.id);
                          setSelectedDefectSurface(defect.surface);
                          setActiveNav("缺陷分析");
                          setImgScale(1);
                          setImgOffset({ x: 0, y: 0 });
                        }}
                        onMouseLeave={() => setHoveredDefect(null)}
                        className="absolute w-2 h-2 rounded-full border border-white/30 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                        style={{
                          top: `${Math.max(0, Math.min(100, topPos))}%`,
                          left: `${Math.max(0, Math.min(100, leftPos))}%`,
                          backgroundColor: defectColor,
                          boxShadow: `0 0 6px ${defectColor}`,
                        }}
                      />
                    );
                  })}

                 {/* Viewport Indicator inside plate */}
                 {analysisScrollState.height > 1 && (
                   <motion.div 
                     className="absolute left-0 w-full border-y-2 border-primary bg-[#58a6ff]/10 backdrop-blur-[1px] pointer-events-none z-20"
                     initial={false}
                     animate={distributionViewportStyle}
                     transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                   />
                 )}
               </div>
             </div>
               {/* Side label */}
               <div className="absolute right-0 top-1/2 -rotate-90 origin-right text-[10px] text-muted-foreground tracking-widest whitespace-nowrap translate-x-12">
                 横向分布
               </div>
             </div>
             <div className="h-4 bg-muted text-[8px] flex items-center px-1 text-muted-foreground">444.0</div>
          </motion.div>
      </AnimatePresence>

        {/* Center Panel: Image Viewer */}
        <div className="flex-1 flex flex-col gap-0.5">
          {/* Viewer Controls with Integrated Distribution Map */}
          <div className="h-8 bg-muted border border-border flex items-center justify-between px-2 shrink-0 gap-4 relative">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-0.5 items-center">
                {activeNav === "缺陷分析" && (
                  <>
                    <button 
                      className={`p-1 transition-colors ${isGridView ? 'bg-[#30363d] text-primary' : 'hover:bg-muted-foreground/20 text-muted-foreground'}`}
                      onClick={() => setIsGridView(!isGridView)}
                      title="列表模式"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-1 transition-colors ${
                        isMapMode
                          ? 'bg-[#30363d] text-primary'
                          : 'hover:bg-muted-foreground/20 text-muted-foreground'
                      }`}
                      onClick={() => setIsMapMode(!isMapMode)}
                      title="地图模式 (Shift)"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  </>
                )}
                {activeNav === "图像分析" && (
                  <>
                    <button
                      className={`p-1 transition-colors ${
                        isWidthLockEnabled
                          ? 'bg-[#30363d] text-primary'
                          : 'hover:bg-muted-foreground/20 text-muted-foreground'
                      }`}
                      onClick={() => setIsWidthLockEnabled((prev) => !prev)}
                      title={isWidthLockEnabled ? "关闭宽度锁定" : "开启宽度锁定"}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                    {surfaceFilter === "all" && (
                    <button
                        onClick={() => setIsAnalysisSyncEnabled((prev) => !prev)}
                        className={`p-1 transition-colors ${
                          isAnalysisSyncEnabled
                            ? 'bg-[#30363d] text-primary'
                            : 'hover:bg-muted-foreground/20 text-muted-foreground'
                        }`}
                        title={isAnalysisSyncEnabled ? "关闭同步锁定" : "开启同步锁定"}
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <div className="w-px h-3 bg-[#30363d] mx-1 self-center" />
                
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                  <button 
                    className="p-1 hover:bg-muted-foreground/20 text-card-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent rounded-sm"
                    onClick={() => {
                      const idx = plates.findIndex(p => p.plateId === selectedPlate?.plateId);
                      if (idx > 0) setSelectedPlate(plates[idx - 1]);
                    }}
                    disabled={!selectedPlate || plates.findIndex(p => p.plateId === selectedPlate?.plateId) <= 0}
                    title="上一块 (Q)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-2 min-w-[100px] text-center">
                    <span className="text-[14px] font-mono font-bold text-primary tracking-tight leading-none">
                      {selectedPlate?.plateId || "H2255043006"}
                    </span>
                  </div>
                  <button 
                    className="p-1 hover:bg-muted-foreground/20 text-card-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent rounded-sm"
                    onClick={() => {
                      const idx = plates.findIndex(p => p.plateId === selectedPlate?.plateId);
                      if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
                    }}
                    disabled={!selectedPlate || plates.findIndex(p => p.plateId === selectedPlate?.plateId) >= plates.length - 1}
                    title="下一块 (E)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <span className="text-[12px] font-bold text-foreground tracking-tight ml-2 leading-none flex items-center">
                BN1D2 3.780 1530 I) {
                  surfaceFilter === 'all' ? '全表面' : surfaceFilter === 'top' ? '上表面' : '下表面'
                } 28/66
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center gap-1.5 p-1 hover:bg-muted-foreground/20 text-muted-foreground disabled:opacity-50 mr-1 rounded-sm transition-colors"
                      title="人工判级"
                      disabled={!selectedPlate}
                    >
                      {selectedPlate?.level && (
                        <span className={`text-[12px] font-bold ${
                          selectedPlate.level === 'D' ? 'text-destructive' : 
                          selectedPlate.level === 'C' ? 'text-[#e3b341]' : 
                          'text-success'
                        }`}>
                          {{ 'A': '一等品', 'B': '二等品', 'C': '三等品', 'D': '等外品' }[selectedPlate.level] || selectedPlate.level}
                        </span>
                      )}
                      <Gavel className={`w-3.5 h-3.5 ${(selectedPlate as any)?.isManual ? 'text-[#409eff]' : ''}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-muted border-border text-[12px] min-w-[120px] p-1 shadow-2xl z-[150]">
                    <DropdownMenuLabel className="text-muted-foreground py-1 px-2 text-[12px]">
                      自动判级: <span className="text-foreground font-bold">{selectedPlate?.level || '-'}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    <DropdownMenuItem 
                      onClick={() => {
                         if (!selectedPlate) return;
                         toast.success("已清除判级结果");
                      }}
                      className="focus:bg-[#30363d] focus:text-foreground cursor-pointer py-1 px-2 rounded-sm text-muted-foreground"
                    >
                      清除级别
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => toast.success("已标记为重点关注")}
                      className="focus:bg-[#30363d] focus:text-foreground cursor-pointer py-1 px-2 rounded-sm text-warning"
                    >
                      <Target className="w-3 h-3 mr-2 inline" />
                      重点标记
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    {[
                      { l: 'A', t: '一等品', c: 'text-success' },
                      { l: 'B', t: '二等品', c: 'text-success' },
                      { l: 'C', t: '三等品', c: 'text-[#e3b341]' },
                      { l: 'D', t: '等外品', c: 'text-destructive' },
                    ].map(item => (
                      <DropdownMenuItem 
                        key={item.l}
                        onClick={() => {
                          if (!selectedPlate) return;
                          const newPlate = { ...selectedPlate, level: item.l as any, isManual: true };
                          setSelectedPlate(newPlate);
                          setPlates(prev => prev.map(p => p.serialNumber === newPlate.serialNumber ? newPlate : p));
                          toast.success(`已判级为 ${item.t}`);
                        }}
                        className={`focus:bg-[#30363d] focus:text-foreground cursor-pointer py-1 px-2 rounded-sm ${item.c}`}
                      >
                        {item.t} ({item.l})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button 
                  className="p-1 hover:bg-muted-foreground/20 text-muted-foreground"
                  onClick={() => { setImgScale(1); setImgOffset({ x: 0, y: 0 }); }}
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <button 
                  className="p-1 hover:bg-muted-foreground/20 text-muted-foreground"
                  onClick={() => setImgScale(prev => Math.min(10, prev * 1.2))}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[12px] px-2 flex items-center bg-card border border-border min-w-[45px] justify-center">
                  {Math.round(imgScale * 100)}%
                </span>
                <button 
                  className="p-1 hover:bg-muted-foreground/20 text-muted-foreground"
                  onClick={() => setImgScale(prev => Math.max(0.1, prev * 0.8))}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1">
                <button 
                  className="p-1 hover:bg-muted-foreground/20 text-muted-foreground"
                  onClick={() => setIsImmersiveMode(!isImmersiveMode)}
                  title={isImmersiveMode ? "退出沉浸模式 (F)" : "全屏沉浸模式 (F)"}
                >
                  {isImmersiveMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <div className="flex items-center bg-card border border-border rounded p-0.5 gap-0.5 ml-2">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'top', label: '上表' },
                    { id: 'bottom', label: '下表' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSurfaceFilter(item.id as any)}
                      className={`px-2 py-0.5 text-[12px] font-bold rounded transition-all ${
                        surfaceFilter === item.id 
                          ? "bg-[#58a6ff] text-primary-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Detail Bar */}
          <div className="h-8 bg-muted border border-border flex items-center justify-between px-1 shrink-0 overflow-hidden">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
              {currentDefect ? (
                <>
                  <div className="flex items-center gap-1 bg-success/10 border border-success/30 px-2 py-0.5 rounded text-[10px] text-success">
                    <span>当前缺陷</span><span className="font-bold">{currentDefect.type}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-warning/10 border border-[#d29922]/30 px-2 py-0.5 rounded text-[10px] text-warning">
                    <span>置信度</span><span className="font-bold">{(currentDefect.confidence * 100).toFixed(1)}%</span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-muted-foreground px-2 italic">无缺陷数据</div>
              )}
              <div className="flex items-center gap-1 bg-[#58a6ff]/10 border border-primary/30 px-2 py-0.5 rounded text-[10px] text-primary">
                <span>表面</span><span className="font-bold">{surfaceImages[0]?.surface === 'top' ? '上表面' : '下表面'}</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 ml-2 shrink-0 border-l border-border pl-1.5">
              <button 
                onClick={() => selectDefectAt(0)}
                className="h-6 px-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary hover:bg-muted-foreground/20 rounded transition-colors" title="跳至开头"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>开头</span>
              </button>
              <button 
                onClick={() => {
                  if (currentDefectIndex <= 0) return;
                  selectDefectAt(currentDefectIndex - 1);
                }}
                className="h-6 px-2 flex items-center gap-1 text-[10px] text-card-foreground hover:bg-muted-foreground/20 rounded transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>上一个</span>
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`h-6 px-2 flex items-center gap-1 text-[10px] rounded border transition-colors ${
                  isPlaying 
                    ? 'bg-[#f85149]/10 text-destructive border-[#f85149]/30 hover:bg-[#f85149]/20' 
                    : 'bg-[#58a6ff]/10 text-primary border-primary/30 hover:bg-primary/20'
                }`}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? '停止播放' : '自动播放'}</span>
              </button>
              <button 
                onClick={() => {
                  if (currentDefectIndex < 0) return;
                  const nextIndex = Math.min(visibleDefects.length - 1, currentDefectIndex + 1);
                  selectDefectAt(nextIndex);
                }}
                className="h-6 px-2 flex items-center gap-1 text-[10px] text-card-foreground hover:bg-muted-foreground/20 rounded transition-colors"
              >
                <span>下一个</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <div className="w-px h-3 bg-[#30363d] mx-0.5" />
              <button className="h-6 px-3 text-[10px] text-success font-bold bg-success/10 border border-success/40 rounded hover:bg-success/20 transition-colors">
                确认
              </button>
              <button className="h-6 px-2 text-[10px] text-muted-foreground border border-border rounded hover:bg-muted-foreground/20 transition-colors">
                自动确认
              </button>
              <button
                onClick={() => setIsDefectListOpen(!isDefectListOpen)}
                className={`h-6 w-7 flex items-center justify-center rounded border transition-colors ${
                  isDefectListOpen 
                    ? 'bg-[#58a6ff]/10 text-primary border-primary/30' 
                    : 'text-muted-foreground border-border hover:bg-muted-foreground/20'
                }`}
                title={isDefectListOpen ? "收起缺陷列表 (L)" : "展开缺陷列表 (L)"}
              >
                {isDefectListOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Image Display & Defect List Container */}
          <div className="flex-1 flex overflow-hidden">
            <div 
              className="flex-1 bg-black relative flex items-center justify-center overflow-hidden border border-border cursor-crosshair"
              onWheel={activeNav !== "图像分析" && !isGridView && !isMapMode ? handleImageWheel : undefined}
              onMouseDown={activeNav !== "图像分析" && !isGridView && !isMapMode ? handleImageMouseDown : undefined}
              onMouseMove={activeNav !== "图像分析" && !isGridView && !isMapMode ? (e => { handleMouseMove(e); handleImageMouseMove(e); }) : handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <AnimatePresence mode="wait">
                {activeNav === "图像分析" ? (
                  <motion.div
                    key="analysis-split-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-card flex flex-col"
                  >
                    {(surfaceFilter === "all" || surfaceFilter === "top") && (
                      <div
                        className={`relative w-full overflow-hidden ${
                          surfaceFilter === "all"
                            ? "flex-1 border-b-2 border-border/50"
                            : "h-full"
                        }`}
                      >
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-[10px] text-primary font-bold z-10 border border-primary/30 rounded-sm">
                          上表
                        </div>
                        {analysisSeqNo && topLayout.worldWidth > 0 ? (
                          <LargeImageViewer
                            imageWidth={topLayout.worldWidth}
                            imageHeight={topLayout.worldHeight}
                            tileSize={analysisTileSize}
                            className="bg-card"
                            maxLevel={topMaxTileLevel}
                            prefetchMargin={400}
                            renderTile={renderTopTile}
                            renderOverlay={renderTopOverlay}
                            centerTarget={topCenterTarget}
                            onViewportChange={handleTopViewportChange}
                            onTransformChange={handleTopTransformChange}
                            onPointerMove={handleTopPointerMove}
                            onPointerLeave={handleTopPointerLeave}
                            cursor={topCursor}
                            panMargin={
                              activeNav === "图像分析" && isWidthLockEnabled ? 0 : 200
                            }
                            fitToHeight={analysisOrientation === "vertical"}
                            fitToWidth={activeNav === "图像分析" && isWidthLockEnabled}
                            lockScale={activeNav === "图像分析" && isWidthLockEnabled}
                            forcedScale={
                              activeNav === "图像分析" && !isWidthLockEnabled
                                ? topForcedScale
                                : null
                            }
                            wheelMode={
                              activeNav === "图像分析" && isWidthLockEnabled
                                ? "scroll"
                                : "zoom"
                            }
                            defectClasses={defectClassOptions}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                            缺少上表图像元信息
                          </div>
                        )}
                      </div>
                    )}

                    {(surfaceFilter === "all" || surfaceFilter === "bottom") && (
                      <div
                        className={`relative w-full overflow-hidden ${
                          surfaceFilter === "all" ? "flex-1" : "h-full"
                        }`}
                      >
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-[10px] text-destructive font-bold z-10 border border-[#f85149]/30 rounded-sm">
                          下表
                        </div>
                        {analysisSeqNo && bottomLayout.worldWidth > 0 ? (
                          <LargeImageViewer
                            imageWidth={bottomLayout.worldWidth}
                            imageHeight={bottomLayout.worldHeight}
                            tileSize={analysisTileSize}
                            className="bg-card"
                            maxLevel={bottomMaxTileLevel}
                            prefetchMargin={400}
                            renderTile={renderBottomTile}
                            renderOverlay={renderBottomOverlay}
                            centerTarget={bottomCenterTarget}
                            onViewportChange={handleBottomViewportChange}
                            onTransformChange={handleBottomTransformChange}
                            onPointerMove={handleBottomPointerMove}
                            onPointerLeave={handleBottomPointerLeave}
                            cursor={bottomCursor}
                            panMargin={
                              activeNav === "图像分析" && isWidthLockEnabled ? 0 : 200
                            }
                            fitToHeight={analysisOrientation === "vertical"}
                            fitToWidth={activeNav === "图像分析" && isWidthLockEnabled}
                            lockScale={activeNav === "图像分析" && isWidthLockEnabled}
                            forcedScale={
                              activeNav === "图像分析" && !isWidthLockEnabled
                                ? bottomForcedScale
                                : null
                            }
                            wheelMode={
                              activeNav === "图像分析" && isWidthLockEnabled
                                ? "scroll"
                                : "zoom"
                            }
                            defectClasses={defectClassOptions}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                            缺少下表图像元信息
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : isGridView ? (
                  <motion.div 
                    key="grid"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="absolute inset-0 p-4 overflow-y-auto grid gap-2 bg-card z-20 custom-scrollbar"
                    style={{ 
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` 
                    }}
                    >
                      {visibleDefects.map((defect, index) => {
                        const defectImageUrl = getDefectImageUrl({
                          defectId: defect.id,
                          surface: defect.surface,
                        });
                        return (
                          <motion.div
                            key={`${defect.surface}-${defect.id}`}
                            whileHover={{ scale: 1.05, zIndex: 30 }}
                            onClick={() => {
                              setSelectedDefectId(defect.id);
                              setSelectedDefectSurface(defect.surface);
                              setIsGridView(false);
                            }}
                            onMouseEnter={(e) =>
                              setHoveredDefect({
                                defect,
                                screenX: e.clientX,
                                screenY: e.clientY,
                              })
                            }
                            onMouseMove={(e) =>
                              setHoveredDefect({
                                defect,
                                screenX: e.clientX,
                                screenY: e.clientY,
                              })
                            }
                            onMouseLeave={() => setHoveredDefect(null)}
                              className={`aspect-square bg-muted border border-border relative group cursor-pointer overflow-hidden ${
                                newDefectKeys.has(
                                  getDefectSelectionKey({ id: defect.id, surface: defect.surface }),
                                ) ? "list-enter" : ""
                              }`}
                          >
                            <img 
                              src={defectImageUrl}
                              className={`w-full h-full group-hover:opacity-100 transition-opacity ${isImageFit ? 'object-cover' : 'object-contain'}`}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[8px] text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="truncate font-bold">{defect.type}</div>
                              <div>{(defect.confidence * 100).toFixed(0)}%</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    {visibleDefects.length === 0 && (
                      <div className="col-span-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-xs">
                          {plateDefects.length === 0 ? "暂无缺陷数据" : "无匹配缺陷"}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ) : isMapMode ? (
                  <motion.div
                    key="map"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full relative bg-card"
                  >
                    {mapSeqNo != null && mapWorldWidth > 0 && mapWorldHeight > 0 ? (
                      <>
                        <LargeImageViewer
                          imageWidth={mapWorldWidth}
                          imageHeight={mapWorldHeight}
                          tileSize={mapTileSize}
                          className="bg-card"
                          initialScale={1}
                          maxLevel={mapMaxLevel}
                          prefetchMargin={400}
                          renderTile={renderMapTile}
                          renderOverlay={renderMapOverlay}
                          focusTarget={mapFocusTarget}
                          onViewportChange={setMapViewport}
                          onPointerMove={handleMapPointerMove}
                          onPointerLeave={handleMapPointerLeave}
                          cursor={mapCursor}
                          panMargin={200}
                          defectClasses={defectClassOptions}
                        />
                        {showMapCrop && currentDefect && (
                          <img
                            src={currentImageUrl}
                            alt="缺陷裁剪图"
                            className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none transition-opacity duration-700 ${
                              showMapCrop ? "opacity-100" : "opacity-0"
                            }`}
                            style={
                              mapCropStyle ?? {
                                left: "50%",
                                top: "50%",
                                width: "60%",
                                maxWidth: "520px",
                                maxHeight: "70%",
                              }
                            }
                          />
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-xs">缺少瓦片元信息</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 border border-white/10 text-[9px] text-muted-foreground font-mono pointer-events-none">
                      MAP MODE
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="single"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full relative flex items-center justify-center"
                    onDoubleClick={() => setIsGridView(true)}
                  >
                    {/* Blurred Grid Background */}
                    <div className="absolute inset-0 opacity-10 blur-2xl pointer-events-none overflow-hidden scale-110">
                      <div className="grid grid-cols-8 gap-2 w-full h-full">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="aspect-square bg-white/5 border border-white/5" />
                        ))}
                      </div>
                    </div>

                    <div className="w-full h-full opacity-50 absolute inset-0 bg-[radial-gradient(#30363d_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
                    
                    <div 
                      className="relative transition-transform duration-75 ease-out origin-center"
                      style={{
                        transform: `translate(${imgOffset.x}px, ${imgOffset.y}px) scale(${imgScale})`,
                        cursor: isPanning ? 'grabbing' : 'grab'
                      }}
                    >
                      <img 
                        src={currentImageUrl} 
                        alt="Surface Defect Detail"
                        ref={defectImageRef}
                        className="max-h-[600px] contrast-110 pointer-events-none select-none block"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop";
                        }}
                        onLoad={updateDefectImageMetrics}
                      />
                    </div>

                    {/* Scale Indicator Overlay */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 border border-white/10 text-[9px] text-muted-foreground font-mono pointer-events-none">
                      SCALE: {imgScale.toFixed(2)}x
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Defect List Panel */}
            <AnimatePresence>
              {isDefectListOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-muted border-l border-border flex flex-col"
                >
                  <div className="h-8 border-b border-border flex items-center px-3 justify-between shrink-0">
                    <span className="text-[11px] font-bold text-foreground">
                      缺陷列表 ({visibleDefects.length}
                      {visibleDefects.length !== plateDefects.length
                        ? `/${plateDefects.length}`
                        : ""}
                      )
                    </span>
                    <Activity className="w-3 h-3 text-primary" />
                  </div>
                  
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                      {visibleDefects.map((defect, idx) => {
                        const xMm = defect.xMm ?? defect.x;
                        const yMm = defect.yMm ?? defect.y;
                        const wMm = defect.widthMm ?? 0;
                        const hMm = defect.heightMm ?? 0;
                        const plateWidth = selectedPlate?.dimensions.width ?? 0;
                        const plateLength = selectedPlate?.dimensions.length ?? 0;
                        const distLeft = xMm;
                        const distRight =
                          plateWidth > 0 ? Math.max(0, plateWidth - (xMm + wMm)) : undefined;
                        const distHead = yMm;
                        const distTail =
                          plateLength > 0 ? Math.max(0, plateLength - (yMm + hMm)) : undefined;

                        return (
                          <div
                            key={`${defect.surface}-${defect.id}`}
                            onClick={() => {
                              setSelectedDefectId(defect.id);
                              setSelectedDefectSurface(defect.surface);
                              setActiveNav("缺陷分析");
                              // 点击缺陷时，重置视图以便聚焦当前缺陷
                              setImgScale(1);
                              setImgOffset({ x: 0, y: 0 });
                            }}
                            onMouseEnter={(e) =>
                              setHoveredDefect({
                                defect,
                                screenX: e.clientX,
                                screenY: e.clientY,
                              })
                            }
                            onMouseMove={(e) =>
                              setHoveredDefect({
                                defect,
                                screenX: e.clientX,
                                screenY: e.clientY,
                              })
                            }
                            onMouseLeave={() => setHoveredDefect(null)}
                              className={`p-2 bg-card border rounded-sm transition-colors cursor-pointer group ${
                                isDefectSelected(defect) ? 'border-primary bg-[#58a6ff]/5' : 'border-border hover:border-primary/50'
                              } ${newDefectKeys.has(
                                getDefectSelectionKey({ id: defect.id, surface: defect.surface }),
                              ) ? "list-enter" : ""}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-primary">
                                  #{idx + 1}
                                </span>
                                <span className="text-[9px] px-1 rounded-sm bg-[#30363d] text-card-foreground">
                                  {defect.surface === 'top' ? '上' : '下'}
                                </span>
                                <span className="text-[9px] font-mono text-muted-foreground">
                                  ID:{defect.id}
                                </span>
                                <span className="text-[10px] font-bold text-primary truncate max-w-[90px]">
                                  {defect.type}
                                </span>
                              </div>
                              <span className={`text-[9px] px-1 rounded-sm ${
                                defect.confidence > 0.9 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                              }`}>
                                {(defect.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground font-mono">
                              <div className="flex items-center gap-2">
                                <Locate className="w-2.5 h-2.5" />
                                <span>
                                  距左: {distLeft.toFixed(0)} mm
                                </span>
                                {distRight !== undefined && (
                                  <span>
                                    距右: {distRight.toFixed(0)} mm
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span>
                                  距头: {distHead.toFixed(0)} mm
                                </span>
                                {distTail !== undefined && (
                                  <span>
                                    距尾: {distTail.toFixed(0)} mm
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {visibleDefects.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 mt-10">
                        <Search className="w-8 h-8 mb-2" />
                        <span className="text-[10px]">
                          {plateDefects.length === 0 ? "无缺陷数据" : "无匹配缺陷"}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Defect Legend (Legend area at bottom) */}
          <div className="h-[120px] bg-card border border-border flex overflow-hidden">
             {/* Left: Defect Grid */}
             <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-5 gap-x-1 gap-y-1.5">
                 {defectTypeOptions.map((item, i) => {
                   const isSelected = selectedDefectTypes.includes(item.label);
                   const count = plateDefects.filter(d => d.type === item.label).length;
                   const confirmedCount = plateDefects.filter(d => d.type === item.label && (d as any).isConfirmed).length;
                   const unconfirmedCount = count - confirmedCount;
                   const isDisabled = count === 0;

                   return (
                     <button 
                       key={item.label} 
                       disabled={isDisabled}
                       onClick={() => {
                         setSelectedDefectTypes(prev => 
                           prev.includes(item.label) 
                             ? prev.filter(l => l !== item.label)
                             : [...prev, item.label]
                         );
                       }}
                       className={`flex items-center gap-1.5 px-2 py-1.5 transition-all rounded-[1px] border ${
                         isDisabled
                           ? "bg-transparent border-transparent opacity-20 grayscale cursor-default"
                           : isSelected 
                             ? "bg-[#30363d]/70 border-primary/70 shadow-[inset_0_0_10px_rgba(88,166,255,0.1)]" 
                             : "bg-muted/40 border-transparent hover:border-border hover:bg-muted cursor-pointer"
                       }`}
                     >
                       <div className="relative shrink-0">
                         <div 
                           className="w-2.5 h-2.5 rounded-full" 
                           style={{ backgroundColor: item.color }} 
                         />
                         {isSelected && count > 0 && (
                           <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: item.color }} />
                         )}
                       </div>
                       <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-[11px] font-bold truncate ${isDisabled ? 'text-muted-foreground' : isSelected ? 'text-foreground' : 'text-card-foreground'}`}>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {isDisabled ? (
                              <span className="text-[10px] text-muted-foreground/50 font-bold">无</span>
                            ) : (
                              <>
                                <span className="text-[10px] text-foreground font-mono font-bold bg-[#30363d] px-1.5 rounded-sm">{count}</span>
                                <span className="text-[10px] text-success font-mono font-bold">{confirmedCount}</span>
                                <span className="text-[10px] text-destructive font-mono font-bold">{unconfirmedCount}</span>
                              </>
                            )}
                          </div>
                       </div>
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* Right: Action Buttons (Vertical) */}
             <div className="w-[80px] bg-muted border-l border-border flex flex-col p-1 gap-1">
               <button 
                 onClick={() => setSelectedDefectTypes(defectTypeOptions.map(t => t.label))}
                 className="flex-1 flex flex-col items-center justify-center gap-1 bg-secondary hover:bg-muted-foreground/20 text-primary transition-all border border-border"
               >
                 <Layout className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-bold">全选</span>
               </button>
               <button 
                 onClick={() => setSelectedDefectTypes([])}
                 className="flex-1 flex flex-col items-center justify-center gap-1 bg-secondary hover:bg-muted-foreground/20 text-destructive transition-all border border-border"
               >
                 <Square className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-bold">清空</span>
               </button>
               <button 
                 className="h-6 flex items-center justify-center bg-success/20 text-success border border-success/30 hover:bg-success/40 transition-colors"
               >
                 <RefreshCcw className="w-3 h-3" />
               </button>
             </div>
          </div>
        </div>

        {/* Right Map Strip (Horizontal) */}
        <AnimatePresence>
          {surfaceFilter !== 'top' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 160, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-card flex flex-col border border-border overflow-hidden whitespace-nowrap"
            >
             <div className="h-6 bg-muted border-b border-border flex items-center justify-between px-1 text-[9px]">
               <span>{surfaceFilter === 'all' ? '下表分布' : '传动侧分布'}</span>
               <div className="flex gap-1">
               <ZoomIn className="w-3 h-3" />
               <ZoomOut className="w-3 h-3" />
             </div>
           </div>
           <div className="flex-1 relative flex items-center justify-center bg-muted/30 overflow-x-auto overflow-y-hidden">
              {/* Viewport Indicator */}
              {activeNav === "图像分析" && (surfaceFilter === 'all' || surfaceFilter === 'bottom') && (
                 <div
                   className="absolute top-0 bottom-0 border-2 border-primary bg-[#58a6ff]/20 pointer-events-none z-10"
                   style={bottomDistributionViewportStyle}
                 />
               )}
              <div
                className="h-full w-full relative flex items-center"
                onWheel={(e) =>
                  handleDistributionWheel(e, bottomDistributionDefects)
                }
              >
                <div ref={bottomDistributionPlateRef} className="h-[70%] w-full bg-muted relative border-y border-border">
                  {bottomDistributionTilePlan && analysisSeqNo != null && (
                    <div className="absolute inset-0 pointer-events-none">
                      {bottomDistributionTilePlan.tiles.map((tile) => {
                        const url = getTileImageUrl({
                          surface: "bottom",
                          seqNo: analysisSeqNo,
                          level: bottomDistributionTilePlan.level,
                          tileX: tile.tileX,
                          tileY: tile.tileY,
                          tileSize: bottomDistributionTilePlan.tileSize,
                          fmt: "JPEG",
                          orientation: "horizontal",
                        });
                        return (
                          <img
                            key={`dist-tile-bottom-${analysisSeqNo}-${bottomDistributionTilePlan.level}-${tile.tileX}-${tile.tileY}`}
                            src={url}
                            alt="distribution-tile"
                            className="absolute select-none"
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                            onDragStart={(e) => e.preventDefault()}
                            style={{
                              left: `${tile.left}%`,
                              top: `${tile.top}%`,
                              width: `${tile.width}%`,
                              height: `${tile.height}%`,
                              objectFit: "fill",
                              opacity: 0.4,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {/* Grid lines inside plate - Vertical for horizontal layout */}
                  <div className="h-px w-full bg-[#30363d]/50 absolute top-1/2 -translate-y-1/2" />
                  <div className="h-full w-px bg-[#30363d]/20 absolute left-[25%]" />
                  <div className="h-full w-px bg-[#30363d]/20 absolute left-[50%]" />
                  <div className="h-full w-px bg-[#30363d]/20 absolute left-[75%]" />
                  {selectedBottomDistributionDefect && (() => {
                    const surfaceMeta = surfaceImages.find(
                      (info) => info.surface === selectedBottomDistributionDefect.surface,
                    );
                    const pos = getDistributionMarkerPosition(
                      selectedBottomDistributionDefect,
                      bottomDistributionDraw,
                      surfaceMeta,
                    );
                    if (!pos) return null;
                    const crossSize = Math.max(
                      12,
                      Math.min(
                        20,
                        Math.round(bottomDistributionPlateSize.width * 0.08),
                      ),
                    );
                    return (
                      <div
                        className="absolute pointer-events-none z-20"
                        style={{
                          top: `${pos.top}%`,
                          left: `${pos.left}%`,
                          width: crossSize,
                          height: crossSize,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#58a6ff]" />
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#58a6ff]" />
                      </div>
                    );
                  })()}

                  {bottomDistributionDefects.map((defect, index) => {
                    const surfaceMeta = surfaceImages.find((info) => info.surface === defect.surface);
                    const frameHeight = surfaceMeta?.image_height ?? 0;
                    const frameWidth = surfaceMeta?.image_width ?? 0;
                    const frameCount = surfaceMeta?.frame_count ?? 0;
                    const mosaicHeight = frameHeight * frameCount;
                    const mosaicWidth = frameWidth;
                    const frameIndex = Math.max(0, defect.imageIndex - 1);
                    const worldX = defect.x;
                    const worldY = defect.y + frameIndex * frameHeight;

                    let topPos = mosaicHeight ? (worldY / mosaicHeight) * 100 : 0;
                    let leftPos = mosaicWidth ? (worldX / mosaicWidth) * 100 : 0;
                    if (bottomDistributionDraw) {
                      const leftPx =
                        bottomDistributionDraw.offsetX +
                        (worldX / bottomDistributionDraw.mosaicWidth) * bottomDistributionDraw.drawWidth;
                      const topPx =
                        bottomDistributionDraw.offsetY +
                        (worldY / bottomDistributionDraw.mosaicHeight) * bottomDistributionDraw.drawHeight;
                      leftPos = (leftPx / bottomDistributionDraw.containerWidth) * 100;
                      topPos = (topPx / bottomDistributionDraw.containerHeight) * 100;
                    }
                    const keySuffix = `${defect.id ?? index}-${defect.surface ?? "unknown"}`;
                    const defectColor = resolveDefectColor(defect);

                    return (
                      <div
                        key={`dist-dot-bottom-${keySuffix}`}
                        onMouseEnter={(e) =>
                          setHoveredDefect({
                            defect,
                            screenX: e.clientX,
                            screenY: e.clientY,
                          })
                        }
                        onMouseMove={(e) =>
                          setHoveredDefect({
                            defect,
                            screenX: e.clientX,
                            screenY: e.clientY,
                          })
                        }
                        onClick={() => {
                          setSelectedDefectId(defect.id);
                          setSelectedDefectSurface(defect.surface);
                          setActiveNav("缺陷分析");
                          setImgScale(1);
                          setImgOffset({ x: 0, y: 0 });
                        }}
                        onMouseLeave={() => setHoveredDefect(null)}
                        className="absolute w-2 h-2 rounded-full border border-white/30 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                        style={{
                          top: `${Math.max(0, Math.min(100, topPos))}%`,
                          left: `${Math.max(0, Math.min(100, leftPos))}%`,
                          backgroundColor: defectColor,
                          boxShadow: `0 0 6px ${defectColor}`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="w-px h-full bg-[#30363d] absolute" />
              <div className="absolute right-0 top-1/2 -rotate-90 origin-right text-[10px] text-muted-foreground tracking-widest whitespace-nowrap translate-x-12">
                传动侧分布
              </div>
           </div>
           <div className="h-4 bg-muted text-[8px] flex items-center px-1 text-muted-foreground">446.0</div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>

      {/* Footer / Status Bar */}
      <StatusBar />
      <DataSourceModal
        isOpen={isDataSourceOpen}
        onClose={() => setIsDataSourceOpen(false)}
        nodes={apiNodes}
        onRefresh={refreshDataSources}
        currentLineKey={currentLineKey}
        onConfirm={(lineKey) => {
          const node = apiNodes.find(
            (n) => (n as any).key === lineKey || (n as any).line_key === lineKey,
          );
          if (node) {
            const label =
              (node as any).name || (node as any).line_name || lineKey;
            setCurrentLine(label);
            setCurrentLineKey(lineKey);
            env.setLineName(lineKey);
            toast.success(`已切换至: ${label}`);
          }
          setIsDataSourceOpen(false);
        }}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={(user) => {
          setCurrentUser(user);
          saveUser(user);
          toast.success(`欢迎回来, ${user.username}`);
        }}
      />
      <FilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onFilter={setFilterCriteria}
        triggerRef={filterButtonRef}
      />
    </div>
  );
}
