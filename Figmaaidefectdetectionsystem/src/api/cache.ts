import { env } from "../config/env";

export type CacheSurfaceInfo = {
  surface: "top" | "bottom";
  view: string;
  cached?: boolean;
  image_missing?: boolean | null;
  stale?: boolean | null;
  tile_max_level?: number | null;
  tile_size?: number | null;
  defect_expand?: number | null;
  defect_cache_enabled?: boolean | null;
  disk_cache_enabled?: boolean | null;
  updated_at?: string | null;
};

export type CacheRecordItem = {
  seq_no: number;
  steel_no?: string | null;
  detect_time?: string | null;
  status: "none" | "partial" | "complete";
  surfaces: CacheSurfaceInfo[];
};

export type CacheRecordsResponse = {
  items: CacheRecordItem[];
  total: number;
  max_seq?: number | null;
  cache_range_min?: number | null;
  expected_tile_max_level?: number | null;
  expected_defect_expand?: number | null;
};

export type CacheStatus = {
  state: string;
  message: string;
  seq_no?: number | null;
  surface?: string | null;
  view?: string | null;
  line_key?: string | null;
  line_name?: string | null;
  line_kind?: string | null;
  pid?: number | null;
  worker_per_surface?: number | null;
  paused?: boolean;
  task?: {
    type?: string;
    total?: number;
    done?: number;
    current_seq?: number;
    force?: boolean;
  } | null;
};

export type CacheSettingsResponse = {
  memory_cache: Record<string, any>;
  disk_cache: Record<string, any>;
};

  // 使用缓存的mock数据以保持开发模式下的数据一致性
  const mockCache = new Map<string, CacheRecordItem[]>();
  
  const getMockItems = (page: number, pageSize: number): CacheRecordItem[] => {
    const cacheKey = `page_${page}_size_${pageSize}`;
    
    // 如果缓存中没有，生成新数据
    if (!mockCache.has(cacheKey)) {
      const newItems = Array.from({ length: Math.min(12, page * pageSize) }).map((_, idx) => {
        const globalIdx = (page - 1) * pageSize + idx;
        const seq = 1200 - globalIdx;
        const status = idx % 4 === 0 ? "complete" : idx % 4 === 1 ? "partial" : "none";
        
        return {
          seq_no: seq,
          steel_no: `S-${seq}`,
          detect_time: new Date(Date.now() - globalIdx * 3600_000).toISOString(),
          status,
          surfaces: [
            {
              surface: "top",
              view: "2D",
              cached: status !== "none",
              tile_max_level: status !== "none" ? 4 : null,
              tile_size: 1024,
              defect_expand: 100,
              defect_cache_enabled: true,
              disk_cache_enabled: true,
              updated_at: status !== "none" ? new Date().toISOString() : null,
            },
            {
              surface: "bottom",
              view: "2D",
              cached: status === "complete",
              tile_max_level: status === "complete" ? 4 : null,
              tile_size: 1024,
              defect_expand: 100,
              defect_cache_enabled: true,
              disk_cache_enabled: true,
              updated_at: status === "complete" ? new Date().toISOString() : null,
            },
          ],
        };
      });
      
      mockCache.set(cacheKey, newItems);
      console.log(`生成新的mock数据: 页码${page}, 每页${pageSize}项, 共${newItems.length}项`);
    }
    
    return mockCache.get(cacheKey)!;
  };

const buildApiUrl = (path: string): string => {
  const base = env.getApiBaseUrl();
  return `${base}${path}`;
};

export async function listCacheRecords(
  page: number,
  pageSize: number,
): Promise<CacheRecordsResponse> {
  if (env.isDevelopment()) {
     const items = getMockItems(page, pageSize);
     return {
       items,
       total: items.length,
       max_seq: items[0]?.seq_no ?? null,
       cache_range_min: items[0]?.seq_no ? items[0].seq_no - 200 + 1 : null,
       expected_tile_max_level: 4,
       expected_defect_expand: 100,
     };
   }
  const url = `${buildApiUrl("/cache/records")}?page=${page}&page_size=${pageSize}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache records: ${response.status}`);
  }
  return (await response.json()) as CacheRecordsResponse;
}

export async function scanCacheRecords(payload: {
  seq_no?: number;
  limit?: number;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/scan");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to scan cache: ${response.status}`);
  }
}

export async function scanCacheRecord(seqNo: number): Promise<void> {
  return scanCacheRecords({ seq_no: seqNo });
}

export async function precacheRecord(seqNo: number, levels?: number): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/precache");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq_no: seqNo, levels }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to precache: ${response.status}`);
  }
}

export async function getCacheStatus(): Promise<CacheStatus> {
  if (env.isDevelopment()) {
    return {
      state: "ready",
      message: "就绪",
      seq_no: null,
      surface: null,
      view: "2D",
      line_key: "line-a",
      line_name: "Line-A",
      line_kind: "default",
      pid: 12345,
      worker_per_surface: 1,
      paused: false,
      task: null,
    };
  }
  const url = buildApiUrl("/cache/status");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache status: ${response.status}`);
  }
  return (await response.json()) as CacheStatus;
}

export async function pauseCache(): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/pause");
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to pause cache: ${response.status}`);
  }
}

export async function resumeCache(): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/resume");
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to resume cache: ${response.status}`);
  }
}

export async function getCacheLogs(
  limit: number = 200,
  cursor: number = 0,
): Promise<{ items: any[]; cursor: number }> {
  if (env.isDevelopment()) {
    const items = Array.from({ length: 5 }).map((_, idx) => ({
      id: cursor + idx + 1,
      time: new Date(Date.now() - idx * 1000).toISOString(),
      level: "info",
      message: "缓存任务",
      data: { seq_no: 1200 - idx, surface: idx % 2 === 0 ? "top" : "bottom" },
    }));
    return { items, cursor: items[0]?.id ?? cursor };
  }
  const url = buildApiUrl(`/status/cache_generate/log?limit=${limit}&cursor=${cursor}`);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache logs: ${response.status}`);
  }
  return (await response.json()) as { items: any[]; cursor: number };
}

export async function getWarmupLogs(
  limit: number = 200,
  cursor: number = 0,
): Promise<{ items: any[]; cursor: number }> {
  if (env.isDevelopment()) {
    const items = Array.from({ length: 5 }).map((_, idx) => ({
      id: cursor + idx + 1,
      time: new Date(Date.now() - idx * 1000).toISOString(),
      level: "info",
      message: "数据预热",
      data: { seq_no: 1200 - idx, elapsed_seconds: 0.32 + idx * 0.03 },
    }));
    return { items, cursor: items[0]?.id ?? cursor };
  }
  const url = buildApiUrl(`/status/data_warmup/log?limit=${limit}&cursor=${cursor}`);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load warmup logs: ${response.status}`);
  }
  return (await response.json()) as { items: any[]; cursor: number };
}

export async function getCacheSettings(): Promise<CacheSettingsResponse> {
  if (env.isDevelopment()) {
    return {
      memory_cache: {
        max_frames: 64,
        max_tiles: 256,
        max_mosaics: 8,
        max_defect_crops: 256,
        ttl_seconds: 120,
      },
      disk_cache: {
        defect_cache_enabled: true,
        defect_cache_expand: 100,
        disk_cache_enabled: true,
        disk_cache_max_records: 20000,
        disk_cache_scan_interval_seconds: 5,
        disk_cache_cleanup_interval_seconds: 60,
        disk_precache_enabled: true,
        disk_precache_levels: 4,
        disk_precache_workers: 4,
      },
    };
  }
  const url = buildApiUrl("/cache/settings");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache settings: ${response.status}`);
  }
  return (await response.json()) as CacheSettingsResponse;
}

export async function updateCacheSettings(payload: CacheSettingsResponse): Promise<CacheSettingsResponse> {
  if (env.isDevelopment()) {
    return getCacheSettings();
  }
  const url = buildApiUrl("/cache/settings");
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to update cache settings: ${response.status}`);
  }
  return (await response.json()) as CacheSettingsResponse;
}

export async function deleteCacheRecords(payload: {
  mode: "all" | "keep_last" | "range";
  keep_last?: number;
  start_seq?: number;
  end_seq?: number;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/delete");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to delete cache: ${response.status}`);
  }
}

export async function rebuildCacheRecords(payload: {
  mode: "all" | "keep_last" | "range";
  keep_last?: number;
  start_seq?: number;
  end_seq?: number;
  force?: boolean;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/rebuild");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to rebuild cache: ${response.status}`);
  }
}

export async function migrateCacheRoots(payload: {
  top_root?: string;
  bottom_root?: string;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/migrate");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to migrate cache: ${response.status}`);
  }
}
