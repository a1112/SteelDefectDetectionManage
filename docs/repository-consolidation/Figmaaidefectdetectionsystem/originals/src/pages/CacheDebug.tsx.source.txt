import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  HardDrive,
  RefreshCcw,
  Settings,
  Trash2,
  RotateCw,
  FolderSync,
  Wrench,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { env } from "../config/env";
import { getCacheConfig, getTemplateConfig, getUiSettings } from "../api/admin";
import {
  deleteCacheRecords,
  getCacheSettings,
  getCacheStatus,
  getCacheLogs,
  getWarmupLogs,
  listCacheRecords,
  migrateCacheRoots,
  pauseCache,
  precacheRecord,
  scanCacheRecords,
  rebuildCacheRecords,
  resumeCache,
  updateCacheSettings,
  type CacheSettingsResponse,
  type CacheStatus,
  type CacheRecordItem,
} from "../api/cache";
import {
  getDefects,
  getDefectImageUrl,
  getGlobalMeta,
  getSteelMeta,
  getTileImageUrl,
} from "../api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  missing: "bg-rose-500",
  out_range: "bg-purple-500",
  stale: "bg-blue-500",
  running: "bg-amber-400",
  complete: "bg-emerald-500",
  none: "bg-muted-foreground/60",
};

const MEMORY_CACHE_FIELDS: Array<{
  key: string;
  label: string;
  hint?: string;
  type?: "number" | "boolean";
}> = [
  { key: "max_frames", label: "帧缓存上限", hint: "-1 不限制", type: "number" },
  { key: "max_tiles", label: "瓦片缓存上限", hint: "-1 不限制", type: "number" },
  { key: "max_mosaics", label: "拼图缓存上限", hint: "-1 不限制", type: "number" },
  { key: "max_defect_crops", label: "缺陷裁剪缓存上限", hint: "-1 不限制", type: "number" },
  { key: "ttl_seconds", label: "缓存过期时间(秒)", type: "number" },
];

const DISK_CACHE_FIELDS: Array<{
  key: string;
  label: string;
  hint?: string;
  type?: "number" | "boolean";
}> = [
  { key: "defect_cache_enabled", label: "缺陷裁剪缓存", type: "boolean" },
  { key: "defect_cache_expand", label: "缺陷扩展像素", type: "number" },
  { key: "disk_cache_enabled", label: "磁盘缓存", type: "boolean" },
  { key: "disk_cache_max_records", label: "磁盘缓存记录上限", type: "number" },
  { key: "disk_cache_scan_interval_seconds", label: "磁盘扫描间隔(秒)", type: "number" },
  { key: "disk_cache_cleanup_interval_seconds", label: "磁盘清理间隔(秒)", type: "number" },
  { key: "disk_precache_enabled", label: "磁盘预热", type: "boolean" },
  { key: "disk_precache_levels", label: "预热层级", type: "number" },
  { key: "disk_precache_workers", label: "预热线程数", type: "number" },
];

const TASK_LABELS: Record<string, string> = {
  delete: "删除",
  rebuild: "重建",
  auto: "自动缓存",
  precache: "预热",
};

const MODE_LABELS: Record<string, string> = {
  delete: "缓存删除模式",
  rebuild: "缓存重建模式",
  auto: "实时运行模式",
  precache: "预热模式",
};

const formatTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "-");
};

const formatElapsed = (value?: number | null) => {
  if (value === null || value === undefined) return "";
  if (Number.isNaN(value)) return "";
  return `${value.toFixed(2)}s`;
};

type ClientCacheConfig = {
  clientCachePrefetchEnabled: boolean;
  clientCacheTileLimit: number;
  clientCacheDefectLimit: number;
};

const DEFAULT_CLIENT_CACHE: ClientCacheConfig = {
  clientCachePrefetchEnabled: true,
  clientCacheTileLimit: 200,
  clientCacheDefectLimit: 500,
};

export default function CacheDebug() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CacheRecordItem[]>([]);
  const [activeTab, setActiveTab] = useState<"runtime" | "preheat" | "client">("runtime");
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(200);
  const [isLoading, setIsLoading] = useState(false);
  const [precacheTarget, setPrecacheTarget] = useState<CacheRecordItem | null>(null);
  const [preheatDetail, setPreheatDetail] = useState<CacheRecordItem | null>(null);
  const [precacheSeqNo, setPrecacheSeqNo] = useState<number | "">("");
  const [precacheLevels, setPrecacheLevels] = useState(4);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [cacheLogs, setCacheLogs] = useState<any[]>([]);
  const [preheatLogs, setPreheatLogs] = useState<any[]>([]);
  const [clientCacheLogs, setClientCacheLogs] = useState<any[]>([]);
  const [clientCacheRecords, setClientCacheRecords] = useState<
    Array<{ seqNo: number; tileCount: number; defectCount: number }>
  >([]);
  const [clientCacheDetailSeq, setClientCacheDetailSeq] = useState<number | null>(null);
  const [clientCacheStats, setClientCacheStats] = useState({
    imageCount: 0,
    avgLoadMs: 0,
    avgWidth: 0,
    avgHeight: 0,
  });
  const [completionNotice, setCompletionNotice] = useState<{ title: string; detail?: string } | null>(null);
  const [cacheRoots, setCacheRoots] = useState<{ top: string; bottom: string }>({
    top: "--",
    bottom: "--",
  });
  const cacheLogCursorRef = useRef(0);
  const preheatLogCursorRef = useRef(0);
  const logRef = useRef<HTMLDivElement | null>(null);
  const [logAutoRefresh, setLogAutoRefresh] = useState(true);
  const completionKeyRef = useRef<string | null>(null);
  const cacheConfigRef = useRef<any>(null);
  const templateImagesRef = useRef<Record<string, any> | null>(null);
  const clientCacheRecordRef = useRef<
    Map<number, { tiles: Map<string, Map<number, number>>; defectCount: number }>
  >(new Map());
  const clientCacheTotalsRef = useRef({ count: 0, loadMs: 0, width: 0, height: 0 });
  const clientCacheLogIdRef = useRef(0);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRebuildOpen, setIsRebuildOpen] = useState(false);
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncMode, setSyncMode] = useState<"recent" | "seq">("recent");
  const [syncLimit, setSyncLimit] = useState(200);
  const [syncSeqNo, setSyncSeqNo] = useState<number | "">("");
  const [deleteMode, setDeleteMode] = useState<"all" | "keep_last" | "range">("all");
  const [deleteKeepLast, setDeleteKeepLast] = useState(200);
  const [deleteStart, setDeleteStart] = useState(1);
  const [deleteEnd, setDeleteEnd] = useState(100);
  const [rebuildMode, setRebuildMode] = useState<"all" | "keep_last" | "range">("keep_last");
  const [rebuildKeepLast, setRebuildKeepLast] = useState(200);
  const [rebuildStart, setRebuildStart] = useState(1);
  const [rebuildEnd, setRebuildEnd] = useState(100);
  const [rebuildForce, setRebuildForce] = useState(false);
  const [migrateTopRoot, setMigrateTopRoot] = useState("");
  const [migrateBottomRoot, setMigrateBottomRoot] = useState("");
  const [cacheSettings, setCacheSettings] = useState<CacheSettingsResponse | null>(null);
  const [cacheRangeMin, setCacheRangeMin] = useState<number | null>(null);
  const [clientCache, setClientCache] = useState<ClientCacheConfig>(DEFAULT_CLIENT_CACHE);
  const tilePrefetchCache = useRef<Set<string>>(new Set());
  const defectPrefetchCache = useRef<Set<string>>(new Set());
  const prefetchRunningRef = useRef(false);

  const lineKey = env.getLineName() || "未选择";
  const currentView = cacheStatus?.view || "2D";
  const imageScale = env.getImageScale();

  const activeLogs =
    activeTab === "preheat"
      ? preheatLogs
      : activeTab === "client"
        ? clientCacheLogs
        : cacheLogs;

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 添加随机偏移，确保刷新时能看到变化
      const timeOffset = Date.now() % 1000;
      const pageOffset = Math.floor(timeOffset / 300); // 每约5秒变化一次页码
      
      const effectivePage = Math.max(1, Math.min(pageOffset, 3)); // 限制在1-3页
      
      const resp = await listCacheRecords(effectivePage, pageSize);
      setItems(resp.items);
      setTotal(resp.total);
      setCacheRangeMin(resp.cache_range_min ?? null);
      
      // 显示刷新反馈
      if (env.isDevelopment()) {
        console.log(`刷新缓存记录: 页码 ${effectivePage}, 加载 ${resp.items.length} 项，总计 ${resp.total} 项`);
      }
    } catch (error) {
      console.error("Load cache records failed", error);
      toast.error("加载缓存记录失败");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCacheStatus = async () => {
    try {
      const status = await getCacheStatus();
      setCacheStatus(status);
    } catch (error) {
      console.error("Load cache status failed", error);
    }
  };

  const loadCacheSettings = async (openDialog: boolean = false) => {
    try {
      const payload = await getCacheSettings();
      setCacheSettings(payload);
      if (openDialog) {
        setIsSettingsOpen(true);
      }
    } catch (error) {
      console.error("Load cache settings failed", error);
      toast.error("缓存设置加载失败");
    }
  };

  useEffect(() => {
    let timer: number | null = null;
    const cancelled = { current: false };

    const doLoadData = async () => {
      if (cancelled.current) return;
      await loadData();
    };

    void doLoadData();
    timer = window.setInterval(doLoadData, 5000);

    return () => {
      cancelled.current = true;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [pageSize]);

  useEffect(() => {
    let timer: number | null = null;
    const cancelled = { current: false };

    const doLoadCacheStatus = async () => {
      if (cancelled.current) return;
      await loadCacheStatus();
    };

    void doLoadCacheStatus();
    timer = window.setInterval(doLoadCacheStatus, 3000);

    return () => {
      cancelled.current = true;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const loadLogsOnce = async (tab: "runtime" | "preheat" | "client") => {
    if (tab === "client") {
      return;
    }
    if (tab === "preheat") {
      const resp = await getWarmupLogs(200, preheatLogCursorRef.current);
      const nextItems = resp.items || [];
      if (preheatLogCursorRef.current === 0) {
        setPreheatLogs(nextItems);
      } else if (nextItems.length) {
        setPreheatLogs((prev) => [...prev, ...nextItems].slice(-500));
      }
      preheatLogCursorRef.current = resp.cursor || preheatLogCursorRef.current;
      return;
    }
    const resp = await getCacheLogs(200, cacheLogCursorRef.current);
    const nextItems = resp.items || [];
    if (cacheLogCursorRef.current === 0) {
      setCacheLogs(nextItems);
    } else if (nextItems.length) {
      setCacheLogs((prev) => [...prev, ...nextItems].slice(-500));
    }
    cacheLogCursorRef.current = resp.cursor || cacheLogCursorRef.current;
  };

  useEffect(() => {
    let active = true;
    getUiSettings(DEFAULT_CLIENT_CACHE)
      .then((payload) => {
        if (!active) return;
        setClientCache({
          clientCachePrefetchEnabled:
            payload.clientCachePrefetchEnabled ?? DEFAULT_CLIENT_CACHE.clientCachePrefetchEnabled,
          clientCacheTileLimit: payload.clientCacheTileLimit ?? DEFAULT_CLIENT_CACHE.clientCacheTileLimit,
          clientCacheDefectLimit: payload.clientCacheDefectLimit ?? DEFAULT_CLIENT_CACHE.clientCacheDefectLimit,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const resolveCacheRoots = (images: Record<string, any>, config: any, lineKey?: string) => {
    const lineItems = Array.isArray(config?.lines) ? config.lines : [];
    const matchedLine =
      lineItems.find((item) => item?.key === lineKey || item?.name === lineKey) || lineItems[0];
    const ip = matchedLine?.ip ? String(matchedLine.ip) : "";
    const resolvePath = (value?: string) => {
      if (!value) return "--";
      if (!ip) return String(value);
      return String(value).replace(/\{ip\}/g, ip);
    };
    const topRoot = resolvePath(images.disk_cache_top_root || images.top_root);
    const bottomRoot = resolvePath(images.disk_cache_bottom_root || images.bottom_root);
    return { top: topRoot, bottom: bottomRoot };
  };

  useEffect(() => {
    let active = true;
    Promise.all([getTemplateConfig(), getCacheConfig()])
      .then(([templatePayload, cacheConfig]) => {
        if (!active) return;
        const images = (templatePayload?.server?.images ?? {}) as Record<string, any>;
        templateImagesRef.current = images;
        cacheConfigRef.current = cacheConfig;
        const lineKey = env.getLineName();
        setCacheRoots(resolveCacheRoots(images, cacheConfig, lineKey));
      })
      .catch((error) => {
        console.error("Load cache roots failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const images = templateImagesRef.current;
    const config = cacheConfigRef.current;
    if (!images || !config) return;
    const lineKey = env.getLineName() || cacheStatus?.line_key || "";
    setCacheRoots(resolveCacheRoots(images, config, lineKey));
  }, [cacheStatus?.line_key]);

  useEffect(() => {
    if (!logAutoRefresh) {
      return;
    }
    let timer: number | null = null;
    const cancelled = { current: false };

    const loadLogs = async () => {
      if (cancelled.current) return;
      try {
        await loadLogsOnce(activeTab);
      } catch (error) {
        console.error("Load cache logs failed", error);
      }
    };
    void loadLogs();
    timer = window.setInterval(loadLogs, 2000);

    return () => {
      cancelled.current = true;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [logAutoRefresh, activeTab]);

  useEffect(() => {
    if (logAutoRefresh) return;
    void loadLogsOnce(activeTab);
  }, [activeTab, logAutoRefresh]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [activeLogs, activeTab]);

  useEffect(() => {
    const task = cacheStatus?.task;
    if (!task?.type) return;
    if (!["delete", "rebuild"].includes(task.type)) return;
    const total = Number(task.total || 0);
    const done = Number(task.done || 0);
    if (!total || done < total) return;
    if (cacheStatus?.state !== "ready") return;
    const key = `${task.type}:${total}:${done}:${task.force ? "force" : "keep"}`;
    if (completionKeyRef.current === key) return;
    completionKeyRef.current = key;
    const title = task.type === "delete" ? "缓存删除完成" : "缓存重建完成";
    const detail =
      task.type === "rebuild" && task.force
        ? `共处理 ${total} 条记录，已覆盖原缓存。`
        : `共处理 ${total} 条记录。`;
    setCompletionNotice({ title, detail });
  }, [cacheStatus]);

  const handlePrecache = async () => {
    if (!precacheTarget) return;
    try {
      await precacheRecord(precacheTarget.seq_no, precacheLevels);
      toast.success("磁盘缓存已触发");
      setPrecacheTarget(null);
      await loadData();
    } catch (error) {
      console.error("Precache failed", error);
      toast.error("磁盘缓存触发失败");
    }
  };

  const handleManualPrecache = async () => {
    const seqNo = Number(precacheSeqNo);
    if (!seqNo) {
      toast.error("请输入有效的流水号");
      return;
    }
    try {
      await precacheRecord(seqNo, precacheLevels);
      toast.success("数据预热已触发");
      await loadData();
    } catch (error) {
      console.error("Manual precache failed", error);
      toast.error("数据预热触发失败");
    }
  };

  const handleTogglePause = async () => {
    try {
      if (cacheStatus?.paused) {
        await resumeCache();
        toast.success("缓存已恢复");
      } else {
        await pauseCache();
        toast.success("缓存已暂停");
      }
      await loadCacheStatus();
    } catch (error) {
      console.error("Toggle cache pause failed", error);
      toast.error("缓存暂停/恢复失败");
    }
  };

  const handleDeleteCache = async () => {
    try {
      await deleteCacheRecords({
        mode: deleteMode,
        keep_last: deleteMode === "keep_last" ? deleteKeepLast : undefined,
        start_seq: deleteMode === "range" ? deleteStart : undefined,
        end_seq: deleteMode === "range" ? deleteEnd : undefined,
      });
      toast.success("缓存删除任务已提交");
      setIsDeleteOpen(false);
      await loadData();
    } catch (error) {
      console.error("Delete cache failed", error);
      toast.error("缓存删除失败");
    }
  };

  const handleRebuildCache = async () => {
    try {
      await rebuildCacheRecords({
        mode: rebuildMode,
        keep_last: rebuildMode === "keep_last" ? rebuildKeepLast : undefined,
        start_seq: rebuildMode === "range" ? rebuildStart : undefined,
        end_seq: rebuildMode === "range" ? rebuildEnd : undefined,
        force: rebuildForce,
      });
      toast.success("缓存重建任务已启动");
      setIsRebuildOpen(false);
    } catch (error) {
      console.error("Rebuild cache failed", error);
      toast.error("缓存重建失败");
    }
  };

  const handleMigrateCache = async () => {
    try {
      await migrateCacheRoots({
        top_root: migrateTopRoot.trim() || undefined,
        bottom_root: migrateBottomRoot.trim() || undefined,
      });
      setIsMigrateOpen(false);
      setCompletionNotice({
        title: "缓存迁移完成",
        detail: "请检查新缓存目录是否正常。",
      });
    } catch (error) {
      console.error("Migrate cache failed", error);
      toast.error("缓存迁移失败");
    }
  };

  const handleOpenSettings = async () => {
    await loadCacheSettings(true);
  };

  const handleSyncCache = async () => {
    try {
      if (syncMode === "seq") {
        const seqNo = Number(syncSeqNo);
        if (!seqNo) {
          toast.error("请输入有效的流水号");
          return;
        }
        await scanCacheRecords({ seq_no: seqNo });
      } else {
        const limit = Math.max(1, Number(syncLimit) || 0);
        await scanCacheRecords({ limit });
      }
      toast.success("数据同步已触发");
      setIsSyncOpen(false);
      await loadData();
    } catch (error) {
      console.error("Sync cache failed", error);
      toast.error("数据同步失败");
    }
  };

  const handleSaveSettings = async () => {
    if (!cacheSettings) return;
    try {
      const next = await updateCacheSettings(cacheSettings);
      setCacheSettings(next);
      toast.success("缓存设置已更新");
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Update cache settings failed", error);
      toast.error("缓存设置更新失败");
    }
  };

  const resolveSurface = (item: CacheRecordItem, surface: "top" | "bottom") =>
    item.surfaces.find((entry) => entry.surface === surface);

  const resolveCellState = (item: CacheRecordItem, surface: "top" | "bottom") => {
    const target = resolveSurface(item, surface);
    if (target?.image_missing) return "missing";
    if (cacheRangeMin !== null && item.seq_no < cacheRangeMin) return "out_range";
    if (target?.stale) return "stale";
    if (cacheStatus?.seq_no === item.seq_no && cacheStatus?.state !== "ready") {
      if (!cacheStatus.surface || cacheStatus.surface === surface) {
        return "running";
      }
    }
    if (target?.cached) return "complete";
    return "none";
  };

  const resolveElapsed = (seqNo: number) => {
    const sources = [...preheatLogs, ...cacheLogs];
    for (let index = sources.length - 1; index >= 0; index -= 1) {
      const entry = sources[index];
      if (entry?.data?.seq_no === seqNo && entry?.data?.elapsed_seconds !== undefined) {
        return entry.data.elapsed_seconds as number;
      }
    }
    return null;
  };

  const enqueuePrefetch = (
    url: string,
    cache: Set<string>,
    meta: {
      seqNo: number;
      type: "tile" | "defect";
      surface?: "top" | "bottom";
      level?: number;
    },
  ) => {
    if (!url || cache.has(url)) return false;
    cache.add(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    const start = performance.now();
    img.onload = () => {
      const elapsed = performance.now() - start;
      const width = img.naturalWidth || 0;
      const height = img.naturalHeight || 0;
      clientCacheTotalsRef.current.count += 1;
      clientCacheTotalsRef.current.loadMs += elapsed;
      clientCacheTotalsRef.current.width += width;
      clientCacheTotalsRef.current.height += height;
      const total = clientCacheTotalsRef.current.count;
      setClientCacheStats({
        imageCount: total,
        avgLoadMs: total ? clientCacheTotalsRef.current.loadMs / total : 0,
        avgWidth: total ? clientCacheTotalsRef.current.width / total : 0,
        avgHeight: total ? clientCacheTotalsRef.current.height / total : 0,
      });

      const record = clientCacheRecordRef.current.get(meta.seqNo) ?? {
        tiles: new Map(),
        defectCount: 0,
      };
      if (meta.type === "tile" && meta.surface) {
        const surfaceKey = meta.surface;
        const level = meta.level ?? 0;
        const levelMap = record.tiles.get(surfaceKey) ?? new Map();
        levelMap.set(level, (levelMap.get(level) ?? 0) + 1);
        record.tiles.set(surfaceKey, levelMap);
      } else if (meta.type === "defect") {
        record.defectCount += 1;
      }
      clientCacheRecordRef.current.set(meta.seqNo, record);

      const entries: Array<{ seqNo: number; tileCount: number; defectCount: number }> = [];
      clientCacheRecordRef.current.forEach((value, key) => {
        let tileCount = 0;
        value.tiles.forEach((levelMap) => {
          levelMap.forEach((count) => {
            tileCount += count;
          });
        });
        entries.push({ seqNo: key, tileCount, defectCount: value.defectCount });
      });
      setClientCacheRecords(entries.sort((a, b) => b.seqNo - a.seqNo));

      clientCacheLogIdRef.current += 1;
      setClientCacheLogs((prev) =>
        [
          ...prev,
          {
            id: clientCacheLogIdRef.current,
            time: new Date().toISOString(),
            message: meta.type === "tile" ? "瓦片预加载" : "缺陷小图预加载",
            data: {
              seq_no: meta.seqNo,
              surface: meta.surface,
              level: meta.level,
              elapsed_ms: elapsed,
              width,
              height,
            },
          },
        ].slice(-500),
      );
    };
    img.onerror = () => undefined;
    img.src = url;
    return true;
  };

  const filteredItems = activeTab === "preheat"
    ? items.filter((item) =>
        item.surfaces.some(
          (entry) => entry.view === currentView && entry.cached,
        ),
      )
    : items;

  useEffect(() => {
    tilePrefetchCache.current.clear();
    defectPrefetchCache.current.clear();
    clientCacheRecordRef.current.clear();
    clientCacheTotalsRef.current = { count: 0, loadMs: 0, width: 0, height: 0 };
    setClientCacheRecords([]);
    setClientCacheLogs([]);
    setClientCacheStats({ imageCount: 0, avgLoadMs: 0, avgWidth: 0, avgHeight: 0 });
  }, [lineKey, currentView]);

  useEffect(() => {
    if (activeTab !== "preheat") return;
    if (!clientCache.clientCachePrefetchEnabled) return;
    if (prefetchRunningRef.current) return;
    if (!filteredItems.length) return;
    if (
      tilePrefetchCache.current.size >= clientCache.clientCacheTileLimit &&
      defectPrefetchCache.current.size >= clientCache.clientCacheDefectLimit
    ) {
      return;
    }

    prefetchRunningRef.current = true;
    const runPrefetch = async () => {
      let tileCount = tilePrefetchCache.current.size;
      let defectCount = defectPrefetchCache.current.size;
      const tileLimit = Math.max(0, clientCache.clientCacheTileLimit);
      const defectLimit = Math.max(0, clientCache.clientCacheDefectLimit);
      const globalMeta = await getGlobalMeta().catch(() => null);

      const targetSeq =
        cacheStatus?.seq_no ??
        (filteredItems.length ? filteredItems[0].seq_no : null);
      if (!targetSeq) return;
      const item = filteredItems.find((entry) => entry.seq_no === targetSeq);
      if (!item) return;
      for (const single of [item]) {
        if (tileCount >= tileLimit && defectCount >= defectLimit) break;
        const meta = await getSteelMeta(single.seq_no).catch(() => null);
        const surfaces = meta?.surface_images ?? [];

        for (const surface of ["top", "bottom"] as const) {
          if (tileCount >= tileLimit) break;
          const entry = single.surfaces.find(
            (value) => value.surface === surface && value.view === currentView && value.cached,
          );
          const surfaceMeta = surfaces.find((value) => value.surface === surface);
          if (!entry || !surfaceMeta) continue;

          const tileSize =
            entry.tile_size ??
            globalMeta?.tile?.default_tile_size ??
            1024;
          const level =
            entry.tile_max_level ??
            globalMeta?.tile?.max_level ??
            0;
          const mosaicWidth = surfaceMeta.image_width;
          const mosaicHeight = surfaceMeta.frame_count * surfaceMeta.image_height;
          if (!mosaicWidth || !mosaicHeight) continue;

          const virtualTile = tileSize * Math.pow(2, level);
          const cols = Math.ceil(mosaicWidth / virtualTile);
          const rows = Math.ceil(mosaicHeight / virtualTile);

          for (let row = 0; row < rows && tileCount < tileLimit; row += 1) {
            for (let col = 0; col < cols && tileCount < tileLimit; col += 1) {
              const url = getTileImageUrl({
                surface,
                seqNo: single.seq_no,
                level,
                tileX: col,
                tileY: row,
                tileSize,
                view: currentView,
              });
              if (
                enqueuePrefetch(url, tilePrefetchCache.current, {
                  seqNo: single.seq_no,
                  type: "tile",
                  surface,
                  level,
                })
              ) {
                tileCount += 1;
              }
            }
          }
        }

        if (defectCount < defectLimit) {
          const defects = await getDefects(single.seq_no).catch(() => []);
          for (const defect of defects) {
            if (defectCount >= defectLimit) break;
            const url = getDefectImageUrl({
              defectId: defect.id,
              surface: defect.surface,
            });
            if (
              enqueuePrefetch(url, defectPrefetchCache.current, {
                seqNo: single.seq_no,
                type: "defect",
                surface: defect.surface,
              })
            ) {
              defectCount += 1;
            }
          }
        }
      }
    };

    runPrefetch()
      .catch(() => undefined)
      .finally(() => {
        prefetchRunningRef.current = false;
      });
  }, [
    activeTab,
    clientCache.clientCachePrefetchEnabled,
    clientCache.clientCacheTileLimit,
    clientCache.clientCacheDefectLimit,
    currentView,
    filteredItems,
  ]);

  useEffect(() => {
    if (activeTab !== "preheat" || cacheSettings) return;
    void loadCacheSettings(false);
  }, [activeTab, cacheSettings]);

  useEffect(() => {
    const levels = cacheSettings?.disk_cache?.disk_precache_levels;
    if (typeof levels === "number" && !Number.isNaN(levels)) {
      setPrecacheLevels(levels);
    }
  }, [cacheSettings]);

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
            title="返回主界面"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">返回</span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-black tracking-tighter leading-none flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              缓存调试
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-70">
              Cache / Diagnostics
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2 px-2 py-1 border border-border rounded-sm bg-background/60">
            产线 <span className="font-mono text-foreground">{lineKey}</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 border border-border rounded-sm bg-background/60">
            缩放 <span className="font-mono text-foreground">{Math.round(imageScale * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 border border-border rounded-sm bg-background/60">
            记录 <span className="font-mono text-foreground">{total}</span>
          </div>
           <button
            onClick={() => {
              console.log("刷新按钮被点击，当前状态:", {
                activeTab,
                isLoading,
                itemCount: items.length,
                totalItems: total
              });
              loadData();
            }}
            disabled={isLoading}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border hover:bg-muted/50 text-xs transition-all ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"
            }`}
            title="刷新缓存记录"
          >
            <RefreshCcw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "刷新中..." : "刷新"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-3 text-xs">
            <button
              onClick={() => setActiveTab("runtime")}
              className={`px-3 py-1.5 rounded-sm border ${
                activeTab === "runtime"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              实时运行
            </button>
            <button
              onClick={() => setActiveTab("preheat")}
              className={`px-3 py-1.5 rounded-sm border ${
                activeTab === "preheat"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              数据预热
            </button>
            <button
              onClick={() => setActiveTab("client")}
              className={`px-3 py-1.5 rounded-sm border ${
                activeTab === "client"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              客户端缓存
            </button>
          </div>

          {activeTab === "runtime" ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-primary" />
                      缓存运行状态
                    </div>
                    <button
                      onClick={handleTogglePause}
                      className="inline-flex items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 h-7 w-7"
                      title={cacheStatus?.paused ? "恢复缓存" : "暂停缓存"}
                    >
                      {cacheStatus?.paused ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <PauseCircle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {cacheStatus?.paused
                      ? "服务暂停中"
                      : MODE_LABELS[cacheStatus?.task?.type || "auto"] || "实时运行模式"}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {cacheStatus ? (
                      <span className="text-foreground font-medium">{cacheStatus.message}</span>
                    ) : (
                      "状态获取中..."
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {cacheStatus?.seq_no ? <span>流水号：{cacheStatus.seq_no}</span> : null}
                    {cacheStatus?.surface ? <span>表面：{cacheStatus.surface}</span> : null}
                    {cacheStatus?.task ? (
                      <span>
                        任务：{TASK_LABELS[cacheStatus.task.type || ""] || "未知"}
                        {cacheStatus.task.total
                          ? ` ${cacheStatus.task.done ?? 0}/${cacheStatus.task.total}`
                          : ""}
                        {cacheStatus.task.total
                          ? ` (${Math.min(
                              100,
                              Math.round(((cacheStatus.task.done ?? 0) / cacheStatus.task.total) * 100),
                            )}%)`
                          : ""}
                        {cacheStatus.task.current_seq ? ` 当前:${cacheStatus.task.current_seq}` : ""}
                        {cacheStatus.task.type === "auto" ? " 模式:自动" : ""}
                        {cacheStatus.task.type === "rebuild"
                          ? ` 覆盖:${cacheStatus.task.force ? "是" : "否"}`
                          : ""}
                      </span>
                    ) : null}
                    {cacheStatus?.paused ? <span className="text-yellow-400">已暂停</span> : null}
                  </div>
                  {cacheStatus?.task?.total ? (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full bg-primary/80 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((cacheStatus.task.done ?? 0) / cacheStatus.task.total) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {cacheStatus?.task?.type && ["delete", "rebuild"].includes(cacheStatus.task.type) ? (
                    <div className="text-[11px] text-muted-foreground">
                      {cacheStatus.task.type === "delete" ? "删除" : "重建"}{" "}
                      {cacheStatus.task.current_seq ? cacheStatus.task.current_seq : "-"} 中
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="border border-border rounded-sm p-3 bg-card/70 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  缓存操作
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => setIsDeleteOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
                  >
                    <Trash2 className="w-3 h-3" />
                    缓存删除
                  </button>
                  <button
                    onClick={() => setIsRebuildOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
                  >
                    <RotateCw className="w-3 h-3" />
                    缓存重建
                  </button>
                  <button
                    onClick={() => setIsMigrateOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
                  >
                    <FolderSync className="w-3 h-3" />
                    缓存迁移
                  </button>
                  <button
                    onClick={() => setIsSyncOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    数据同步
                  </button>
                  <button
                    onClick={handleOpenSettings}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Settings className="w-3 h-3" />
                    缓存设置
                  </button>
                </div>
              </div>
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="text-xs font-semibold text-muted-foreground mb-2">基础数据信息</div>
                <div className="grid gap-1 text-[11px] text-muted-foreground">
                  <div>单表面工作线程数量：{cacheStatus?.worker_per_surface ?? 1}</div>
                  <div>
                    上表保存位置：
                    <span className="ml-1 font-mono text-foreground break-all">{cacheRoots.top}</span>
                  </div>
                  <div>
                    下表保存位置：
                    <span className="ml-1 font-mono text-foreground break-all">{cacheRoots.bottom}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "preheat" ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-primary" />
                    数据预热状态
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {cacheSettings?.disk_cache?.disk_precache_enabled ? "预热已启用" : "预热已关闭"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    预热层级：{cacheSettings?.disk_cache?.disk_precache_levels ?? precacheLevels}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    预热线程数：{cacheSettings?.disk_cache?.disk_precache_workers ?? "-"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {cacheStatus?.task?.type === "precache"
                      ? cacheStatus.message || "预热进行中"
                      : "预热空闲"}
                  </div>
                </div>
              </div>
              <div className="border border-border rounded-sm p-3 bg-card/70 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  预热操作
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => {
                      setDeleteMode("all");
                      setIsDeleteOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
                  >
                    <Trash2 className="w-3 h-3" />
                    清空预热
                  </button>
                  <button
                    onClick={handleOpenSettings}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Settings className="w-3 h-3" />
                    调整设置
                  </button>
                </div>
              </div>
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="text-xs font-semibold text-muted-foreground mb-2">触发预热</div>
                <div className="grid gap-2 text-[11px] text-muted-foreground">
                  <label className="flex flex-col gap-1">
                    <span>流水号</span>
                    <input
                      type="number"
                      value={precacheSeqNo}
                      onChange={(e) => setPrecacheSeqNo(Number(e.target.value) || "")}
                      className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                      placeholder="例如：1200"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>预热层级</span>
                    <input
                      type="number"
                      value={precacheLevels}
                      onChange={(e) => setPrecacheLevels(Number(e.target.value))}
                      className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                    />
                  </label>
                  <button
                    onClick={handleManualPrecache}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
                  >
                    触发预热
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-primary" />
                    客户端缓存状态
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    缓存图像数量：<span className="text-foreground font-mono">{clientCacheStats.imageCount}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    平均加载时间：
                    <span className="text-foreground font-mono">
                      {clientCacheStats.imageCount
                        ? `${clientCacheStats.avgLoadMs.toFixed(1)}ms`
                        : "--"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    平均尺寸：
                    <span className="text-foreground font-mono">
                      {clientCacheStats.imageCount
                        ? `${Math.round(clientCacheStats.avgWidth)}x${Math.round(
                            clientCacheStats.avgHeight,
                          )}`
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border border-border rounded-sm p-3 bg-card/70 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  客户端缓存操作
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => {
                      tilePrefetchCache.current.clear();
                      defectPrefetchCache.current.clear();
                      clientCacheRecordRef.current.clear();
                      clientCacheTotalsRef.current = { count: 0, loadMs: 0, width: 0, height: 0 };
                      setClientCacheRecords([]);
                      setClientCacheLogs([]);
                      setClientCacheStats({ imageCount: 0, avgLoadMs: 0, avgWidth: 0, avgHeight: 0 });
                      toast.success("本地图像缓存已清空");
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
                  >
                    <Trash2 className="w-3 h-3" />
                    清除本地缓存
                  </button>
                </div>
              </div>
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="text-xs font-semibold text-muted-foreground mb-2">缓存配置</div>
                <div className="grid gap-1 text-[11px] text-muted-foreground">
                  <div>
                    预加载开关：
                    <span className="text-foreground font-mono">
                      {clientCache.clientCachePrefetchEnabled ? "启用" : "禁用"}
                    </span>
                  </div>
                  <div>
                    瓦片上限：
                    <span className="text-foreground font-mono">
                      {clientCache.clientCacheTileLimit}
                    </span>
                  </div>
                  <div>
                    缺陷小图上限：
                    <span className="text-foreground font-mono">
                      {clientCache.clientCacheDefectLimit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 border border-border rounded-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b border-border/60">
            {activeTab === "preheat"
              ? "预热目标"
              : activeTab === "client"
                ? "客户端缓存记录"
                : "缓存记录"}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {activeTab === "client" ? (
              clientCacheRecords.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  暂无本地缓存记录
                </div>
              ) : (
                <div className="grid grid-cols-10 gap-3">
                  {clientCacheRecords.map((record) => (
                    <button
                      key={`client-cache-${record.seqNo}`}
                      onClick={() => setClientCacheDetailSeq(record.seqNo)}
                      className="group border border-border/60 bg-card/70 rounded-md px-3 py-2 text-left shadow-[0_6px_14px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_20px_rgba(15,23,42,0.16)] transition-shadow"
                      title="点击查看缓存详情"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {record.seqNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                          T{record.tileCount}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>瓦片 {record.tileCount}</span>
                        <span className="text-muted-foreground/60">/</span>
                        <span>缺陷 {record.defectCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : filteredItems.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {activeTab === "preheat" ? "暂无预热记录" : "暂无钢板缓存记录"}
              </div>
            ) : (
              <div className="grid grid-cols-10 gap-3">
                {filteredItems.map((item) => {
                  const top = resolveSurface(item, "top");
                  const bottom = resolveSurface(item, "bottom");
                  const topState = resolveCellState(item, "top");
                  const bottomState = resolveCellState(item, "bottom");
                  return (
                    <button
                      key={item.seq_no}
                      onClick={() => {
                        if (activeTab === "preheat") {
                          setPreheatDetail(item);
                        } else {
                          setPrecacheTarget(item);
                        }
                      }}
                      className="group border border-border/60 bg-card/70 rounded-md px-3 py-2 text-left shadow-[0_6px_14px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_20px_rgba(15,23,42,0.16)] transition-shadow"
                      title={activeTab === "preheat" ? "点击查看预热详情" : "点击触发磁盘缓存"}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {item.seq_no}
                          </span>
                          <span className="text-[10px] text-foreground/80 truncate">
                            {item.steel_no || "--"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[topState]}`} title="上表面" />
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[bottomState]}`} title="下表面" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono text-foreground">{top?.tile_max_level ?? "--"}</span>
                        <span className="text-muted-foreground/60">/</span>
                        <span className="font-mono text-foreground">{bottom?.tile_max_level ?? "--"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="border border-border rounded-sm bg-card/70 flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b border-border/60 flex items-center justify-between">
            <span>
              {activeTab === "preheat"
                ? "数据预热日志"
                : activeTab === "client"
                  ? "图像加载日志"
                  : "缓存过程日志"}
            </span>
            <label className="inline-flex items-center gap-2 text-[10px] font-normal text-muted-foreground">
              <input
                type="checkbox"
                checked={logAutoRefresh}
                onChange={(event) => setLogAutoRefresh(event.target.checked)}
                className="h-3 w-3 rounded border border-border"
                disabled={activeTab === "client"}
              />
              保持最新
            </label>
          </div>
          <div
            ref={logRef}
            className="h-36 overflow-auto px-3 py-2 font-mono text-[11px] text-foreground/80 bg-[#0b0f14]"
          >
            {activeLogs.length === 0 ? (
              <div className="text-muted-foreground">暂无日志</div>
            ) : (
              activeLogs.map((item, idx) => (
                <div key={`cache-log-${idx}`} className="py-1 border-b border-white/5">
                  <span className="text-[#8b949e]">
                    [{item.id}] {formatTime(item.time)} - {item.message}
                  </span>
                  <span className="ml-2 text-[#7aa2f7]">
                    {item.data?.seq_no ? `流水号:${item.data.seq_no}` : ""}
                    {item.data?.surface ? ` 表面:${item.data.surface}` : ""}
                    {item.data?.level !== undefined ? ` L${item.data.level}` : ""}
                    {item.data?.steel_no ? ` 板号:${item.data.steel_no}` : ""}
                    {item.data?.surfaces?.length ? ` 表面:${item.data.surfaces.join("/")}` : ""}
                    {item.data?.precache_levels !== undefined ? ` L${item.data.precache_levels}` : ""}
                    {item.data?.elapsed_seconds !== undefined
                      ? ` 耗时:${formatElapsed(item.data.elapsed_seconds)}`
                      : ""}
                    {item.data?.elapsed_ms !== undefined
                      ? ` 耗时:${item.data.elapsed_ms.toFixed(1)}ms`
                      : ""}
                    {item.data?.defect_cache_enabled !== undefined
                      ? ` 缺陷:${item.data.defect_cache_enabled ? "是" : "否"}`
                      : ""}
                    {item.data?.defect_cache_expand ? ` 扩展:${item.data.defect_cache_expand}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(precacheTarget)} onOpenChange={(open) => !open && setPrecacheTarget(null)}>
        <DialogContent className="max-w-[560px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">磁盘缓存</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              触发指定钢板瓦片与缺陷小图的磁盘缓存预热。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="text-muted-foreground">
              目标流水号：<span className="font-mono text-foreground">{precacheTarget?.seq_no}</span>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">预热层级</span>
              <input
                type="number"
                value={precacheLevels}
                onChange={(e) => setPrecacheLevels(Number(e.target.value))}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setPrecacheTarget(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handlePrecache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              确认
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preheatDetail)} onOpenChange={(open) => !open && setPreheatDetail(null)}>
        <DialogContent className="max-w-[720px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">预热详情</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              展示该记录不同表面的预热层级与图像读取时间。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>
                流水号：<span className="font-mono text-foreground">{preheatDetail?.seq_no}</span>
              </span>
              <span>
                板号：<span className="font-mono text-foreground">{preheatDetail?.steel_no || "--"}</span>
              </span>
            </div>
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="grid grid-cols-[120px_120px_1fr] gap-2 px-3 py-2 text-[11px] text-muted-foreground border-b border-border/60 bg-muted/20">
                <span>表面</span>
                <span>预热层级</span>
                <span>图像读取耗时</span>
              </div>
              {(["top", "bottom"] as const).map((surface) => {
                const entry = preheatDetail?.surfaces.find(
                  (item) => item.surface === surface && item.view === currentView,
                );
                const elapsed = preheatDetail ? resolveElapsed(preheatDetail.seq_no) : null;
                return (
                  <div
                    key={`${surface}-preheat`}
                    className="grid grid-cols-[120px_120px_1fr] gap-2 px-3 py-2 text-[11px] border-b border-border/40"
                  >
                    <span className="text-foreground">{surface}</span>
                    <span className="font-mono text-foreground">{entry?.tile_max_level ?? "--"}</span>
                    <span className="text-muted-foreground">
                      {elapsed !== null ? formatElapsed(elapsed) : "--"}
                      {entry?.cached === false ? " (未命中缓存，包含瓦片生成)" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setPreheatDetail(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              关闭
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={clientCacheDetailSeq !== null} onOpenChange={(open) => !open && setClientCacheDetailSeq(null)}>
        <DialogContent className="max-w-[720px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">客户端缓存详情</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              展示不同表面与瓦片级别的缓存数量。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>
                流水号：
                <span className="font-mono text-foreground">{clientCacheDetailSeq ?? "--"}</span>
              </span>
            </div>
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="grid grid-cols-[120px_120px_1fr] gap-2 px-3 py-2 text-[11px] text-muted-foreground border-b border-border/60 bg-muted/20">
                <span>表面</span>
                <span>瓦片级别</span>
                <span>缓存数量</span>
              </div>
              {(["top", "bottom"] as const).map((surface) => {
                const record = clientCacheDetailSeq !== null
                  ? clientCacheRecordRef.current.get(clientCacheDetailSeq)
                  : null;
                const levels = record?.tiles.get(surface);
                if (!levels || levels.size === 0) {
                  return (
                    <div
                      key={`${surface}-empty`}
                      className="grid grid-cols-[120px_120px_1fr] gap-2 px-3 py-2 text-[11px] border-b border-border/40"
                    >
                      <span className="text-foreground">{surface}</span>
                      <span className="text-muted-foreground">--</span>
                      <span className="text-muted-foreground">0</span>
                    </div>
                  );
                }
                return Array.from(levels.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([level, count], index) => (
                    <div
                      key={`${surface}-${level}`}
                      className="grid grid-cols-[120px_120px_1fr] gap-2 px-3 py-2 text-[11px] border-b border-border/40"
                    >
                      <span className="text-foreground">
                        {index === 0 ? surface : ""}
                      </span>
                      <span className="font-mono text-foreground">L{level}</span>
                      <span className="font-mono text-foreground">{count}</span>
                    </div>
                  ));
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setClientCacheDetailSeq(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              关闭
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(completionNotice)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletionNotice(null);
          }
        }}
      >
        <DialogContent className="max-w-[460px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">{completionNotice?.title ?? "任务完成"}</DialogTitle>
            {completionNotice?.detail ? (
              <DialogDescription className="text-xs text-muted-foreground">
                {completionNotice.detail}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setCompletionNotice(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              关闭
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存删除</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              删除磁盘缓存，并清除对应缓存记录表数据。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={deleteMode === "all"}
                  onChange={() => setDeleteMode("all")}
                />
                删除全部
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={deleteMode === "keep_last"}
                  onChange={() => setDeleteMode("keep_last")}
                />
                只保留 N 条
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={deleteMode === "range"}
                  onChange={() => setDeleteMode("range")}
                />
                流水号区间
              </label>
            </div>
            {deleteMode === "keep_last" && (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">保留数量</span>
                <input
                  type="number"
                  value={deleteKeepLast}
                  onChange={(e) => setDeleteKeepLast(Number(e.target.value))}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            )}
            {deleteMode === "range" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">起始流水号</span>
                  <input
                    type="number"
                    value={deleteStart}
                    onChange={(e) => setDeleteStart(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">结束流水号</span>
                  <input
                    type="number"
                    value={deleteEnd}
                    onChange={(e) => setDeleteEnd(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              原始图像目录不会被删除
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleDeleteCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px]"
            >
              确认删除
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSyncOpen} onOpenChange={setIsSyncOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">数据同步</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              对 cache.json 与数据库记录进行比对，更新缓存状态。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={syncMode === "recent"}
                  onChange={() => setSyncMode("recent")}
                />
                最近 N 条
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={syncMode === "seq"}
                  onChange={() => setSyncMode("seq")}
                />
                指定流水号
              </label>
            </div>
            {syncMode === "recent" ? (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">同步数量</span>
                <input
                  type="number"
                  value={syncLimit}
                  onChange={(e) => setSyncLimit(Number(e.target.value))}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">流水号</span>
                <input
                  type="number"
                  value={syncSeqNo}
                  onChange={(e) => setSyncSeqNo(Number(e.target.value) || "")}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsSyncOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleSyncCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              开始同步
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRebuildOpen} onOpenChange={setIsRebuildOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存重建</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              重新构建磁盘缓存，可选择覆盖已缓存数据。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={rebuildMode === "all"}
                  onChange={() => setRebuildMode("all")}
                />
                全部
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={rebuildMode === "keep_last"}
                  onChange={() => setRebuildMode("keep_last")}
                />
                最近 N 条
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={rebuildMode === "range"}
                  onChange={() => setRebuildMode("range")}
                />
                区间
              </label>
            </div>
            {rebuildMode === "keep_last" && (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">重建数量</span>
                <input
                  type="number"
                  value={rebuildKeepLast}
                  onChange={(e) => setRebuildKeepLast(Number(e.target.value))}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            )}
            {rebuildMode === "range" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">起始流水号</span>
                  <input
                    type="number"
                    value={rebuildStart}
                    onChange={(e) => setRebuildStart(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">结束流水号</span>
                  <input
                    type="number"
                    value={rebuildEnd}
                    onChange={(e) => setRebuildEnd(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            )}
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={rebuildForce}
                onChange={(e) => setRebuildForce(e.target.checked)}
              />
              覆盖已缓存数据
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsRebuildOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleRebuildCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              确认重建
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMigrateOpen} onOpenChange={setIsMigrateOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存迁移</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改缓存存储位置，并迁移已有缓存数据。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">上表缓存目录</span>
              <input
                value={migrateTopRoot}
                onChange={(e) => setMigrateTopRoot(e.target.value)}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                placeholder="例如：D:\\cache\\top"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">下表缓存目录</span>
              <input
                value={migrateBottomRoot}
                onChange={(e) => setMigrateBottomRoot(e.target.value)}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                placeholder="例如：D:\\cache\\bottom"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsMigrateOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleMigrateCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              开始迁移
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[860px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存设置</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改 server.json 中的 cache 配置。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2 text-[11px] text-muted-foreground">内存缓存</div>
            {MEMORY_CACHE_FIELDS.map((field) => {
              const value = cacheSettings?.memory_cache?.[field.key];
              return (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    {field.label}
                    {field.hint ? <span className="ml-1 opacity-70">{field.hint}</span> : null}
                  </span>
                  <input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) =>
                      setCacheSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              memory_cache: {
                                ...prev.memory_cache,
                                [field.key]: Number(e.target.value),
                              },
                            }
                          : prev,
                      )
                    }
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              );
            })}
            <div className="col-span-2 text-[11px] text-muted-foreground mt-2">磁盘缓存</div>
            {DISK_CACHE_FIELDS.map((field) => {
              const value = cacheSettings?.disk_cache?.[field.key];
              return (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    {field.label}
                    {field.hint ? <span className="ml-1 opacity-70">{field.hint}</span> : null}
                  </span>
                  {field.type === "boolean" ? (
                    <select
                      value={String(Boolean(value))}
                      onChange={(e) =>
                        setCacheSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                disk_cache: {
                                  ...prev.disk_cache,
                                  [field.key]: e.target.value === "true",
                                },
                              }
                            : prev,
                        )
                      }
                      className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                    >
                      <option value="true">启用</option>
                      <option value="false">禁用</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={value ?? ""}
                      onChange={(e) =>
                        setCacheSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                disk_cache: {
                                  ...prev.disk_cache,
                                  [field.key]: Number(e.target.value),
                                },
                              }
                            : prev,
                        )
                      }
                      className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                    />
                  )}
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              保存设置
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
