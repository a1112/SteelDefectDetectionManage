import { env } from "../config/env";

export interface AuthUser {
  username: string;
  role: string;
  is_superuser: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  roles: string[];
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
}

export interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface AdminPolicy {
  id: number;
  ptype: string;
  v0: string | null;
  v1: string | null;
  v2: string | null;
  v3: string | null;
  v4: string | null;
  v5: string | null;
}

export interface AdminUserPayload {
  username: string;
  password?: string;
  roles: string[];
  is_active: boolean;
  is_superuser: boolean;
}

export interface AdminRolePayload {
  name: string;
  description?: string | null;
}

export interface AdminPolicyPayload {
  ptype: string;
  v0?: string | null;
  v1?: string | null;
  v2?: string | null;
  v3?: string | null;
  v4?: string | null;
  v5?: string | null;
}

export interface LineConfigPayload {
  lines: Record<string, any>[];
  views?: Record<string, any>;
}

export interface ConfigApiNode {
  key: string;
  name?: string;
  host?: string;
  port?: number;
  small_port?: number;
  profile?: string;
  pid?: number | null;
  running?: boolean;
  online?: boolean;
  latest_timestamp?: string | null;
  latest_age_seconds?: number | null;
  latency_ms?: number | null;
  path?: string;
  small_path?: string;
}

export interface NginxConfigPayload {
  path: string;
  content: string;
}

export interface SystemInfoPayload {
  line_names: string[];
  database: {
    drive: string;
    host: string;
    port: number | null;
    database_type: string;
    management_database: string;
    test_mode: boolean;
    main_status: string;
    main_error?: string | null;
    management_status: string;
    management_error?: string | null;
  };
  server: {
    hostname: string;
    os_name: string;
    platform: string;
    platform_release: string;
    platform_version: string;
    cpu_count: number;
    cpu_model: string;
  };
  runtime: {
    python_version: string;
    python_executable: string;
  };
  resources: {
    cpu_percent: number | null;
    memory_percent: number | null;
    memory_total_bytes: number | null;
    memory_used_bytes: number | null;
    network_rx_bytes_per_sec: number | null;
    network_tx_bytes_per_sec: number | null;
    notes?: string[];
  };
  service_resources: {
    cpu_percent: number | null;
    memory_percent: number | null;
    memory_rss_bytes: number | null;
    memory_vms_bytes: number | null;
    notes?: string[];
  };
  disks?: SystemDiskUsage[];
  network_interfaces?: NetworkInterfaceMetrics[];
}

export interface SystemDiskUsage {
  device: string;
  mountpoint: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
}

export interface NetworkInterfaceMetrics {
  name: string;
  is_up: boolean;
  speed_mbps: number | null;
  rx_bytes_per_sec: number | null;
  tx_bytes_per_sec: number | null;
}

export interface SystemMetricsPayload {
  timestamp: string;
  resources: SystemInfoPayload["resources"];
  service_resources: SystemInfoPayload["service_resources"];
  disks: SystemDiskUsage[];
  network_interfaces: NetworkInterfaceMetrics[];
}

export interface ConfigMateMeta {
  connection_mode?: "development" | "production" | "cors" | string;
  api_base_url?: string;
  service_name?: string;
  company_name?: string;
  service_version?: string;
  ui_version?: string;
}

export interface ConfigMatePayload {
  meta?: ConfigMateMeta;
  defaults?: Record<string, any>;
  lines?: Record<string, any>[];
}

export interface ConfigMateResponse {
  path: string;
  payload: ConfigMatePayload | ConfigMatePayload[] | Record<string, any>;
}

export interface DownloadBuild {
  version: string;
  label: string;
  file_name: string;
  size_bytes: number;
  size_display: string;
  download_url: string;
  released_at?: string | null;
}

export interface DownloadPlatform {
  key: string;
  label: string;
  supported: boolean;
  requirements: string[];
  builds: DownloadBuild[];
  latest_version?: string;
}

export interface DownloadInfo {
  latest_version: string;
  history_versions: string[];
  platforms: DownloadPlatform[];
  updated_at?: string;
  notes?: string[];
}

export interface CacheLineConfig {
  name?: string;
  key: string;
  profile?: string;
  mode?: string;
  ip?: string;
  port?: number | null;
  overrides?: { images?: Record<string, any> };
  views?: {
    view: string;
    memory_cache?: Record<string, any>;
    disk_cache?: Record<string, any>;
    images?: Record<string, any>;
  }[];
}

export interface CacheConfig {
  hostname?: string;
  config_root?: string;
  config_root_name?: string;
  map_path?: string;
  server_path?: string;
  templates: {
    memory_cache?: Record<string, any>;
    disk_cache?: Record<string, any>;
  };
  defaults: {
    images?: Record<string, any>;
    [key: string]: any;
  };
  views?: Record<string, any>;
  lines?: CacheLineConfig[];
}

export interface CacheTemplateUpdatePayload {
  memory_cache?: Record<string, any>;
  disk_cache?: Record<string, any>;
}

export interface CacheLineUpdatePayload {
  key: string;
  memory_cache?: Record<string, any>;
  disk_cache?: Record<string, any>;
}

export interface CacheConfigUpdatePayload {
  templates?: CacheTemplateUpdatePayload;
  lines?: CacheLineUpdatePayload[];
}

export interface TemplateConfigPayload {
  server: {
    database?: Record<string, any>;
    images?: Record<string, any>;
    memory_cache?: Record<string, any>;
    disk_cache?: Record<string, any>;
  };
  defect_class: Record<string, any>;
}

export interface TemplateConfigUpdatePayload {
  server?: {
    database?: Record<string, any>;
    images?: Record<string, any>;
    memory_cache?: Record<string, any>;
    disk_cache?: Record<string, any>;
  };
  defect_class?: Record<string, any>;
}

export interface LineViewOverridePayload {
  view: string;
  database?: Record<string, any>;
  images?: Record<string, any>;
  memory_cache?: Record<string, any>;
  disk_cache?: Record<string, any>;
}

export interface LineSettingsPayload {
  key: string;
  views: LineViewOverridePayload[];
  defect_class_mode: "template" | "custom";
  defect_class?: Record<string, any>;
}

const UI_SETTINGS_KEY = "admin_ui_settings";
const MOCK_DATA_KEY = "admin_mock_data";

const getAdminBaseUrl = (): string => {
  if (env.getMode() === "cors") {
    const base = env.getCorsBaseUrl().replace(/\/+$/, "");
    return `${base}/config`;
  }
  if (env.getMode() === "production") {
    const base = env.getConfigBaseUrl();
    return base ? `${base}/config` : "/config";
  }
  return "";
};

const toWebSocketUrl = (base: string): string => {
  if (base.startsWith("wss://") || base.startsWith("ws://")) {
    return base;
  }
  if (base.startsWith("https://")) {
    return `wss://${base.slice(8)}`;
  }
  if (base.startsWith("http://")) {
    return `ws://${base.slice(7)}`;
  }
  return `ws://${base.replace(/^\/\//, "")}`;
};

const getAdminWsBaseUrl = (): string => {
  if (env.getMode() === "cors") {
    return `${toWebSocketUrl(env.getCorsBaseUrl().replace(/\/+$/, ""))}/config`;
  }
  if (env.getMode() === "production") {
    const base = env.getConfigBaseUrl();
    if (base) {
      return `${toWebSocketUrl(base)}/config`;
    }
  }
  return `${toWebSocketUrl(window.location.origin)}/config`;
};

const loadLocalJson = (key: string) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveLocalJson = (key: string, payload: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(payload));
};

export async function login(username: string, password: string): Promise<AuthUser> {
  if (env.isDevelopment()) {
    if (username !== "admin" || password !== "Nercar701") {
      throw new Error("用户名或密码错误");
    }
    return { username, role: "admin", is_superuser: true };
  }

  const url = `${getAdminBaseUrl()}/auth/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("用户名或密码错误");
  }
  const data = await response.json();
  return data.user as AuthUser;
}

export async function getUiSettings<T>(fallback: T): Promise<T> {
  if (env.isDevelopment()) {
    return loadLocalJson(UI_SETTINGS_KEY) ?? fallback;
  }
  const url = `${getAdminBaseUrl()}/config/ui-settings`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return fallback;
  }
  return (await response.json()) as T;
}

export async function saveUiSettings(payload: unknown): Promise<void> {
  if (env.isDevelopment()) {
    saveLocalJson(UI_SETTINGS_KEY, payload);
    return;
  }
  const url = `${getAdminBaseUrl()}/config/ui-settings`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("保存 UI 设置失败");
  }
}

export async function getMockDataConfig<T>(fallback: T): Promise<T> {
  if (env.isDevelopment()) {
    return loadLocalJson(MOCK_DATA_KEY) ?? fallback;
  }
  const url = `${getAdminBaseUrl()}/config/mock-data`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return fallback;
  }
  return (await response.json()) as T;
}

export async function saveMockDataConfig(payload: unknown): Promise<void> {
  if (env.isDevelopment()) {
    saveLocalJson(MOCK_DATA_KEY, payload);
    return;
  }
  const url = `${getAdminBaseUrl()}/config/mock-data`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("保存测试数据配置失败");
  }
}

export async function getUsers(): Promise<AdminUser[]> {
  if (env.isDevelopment()) {
    return [
      {
        id: 1,
        username: "admin",
        roles: ["admin"],
        is_active: true,
        is_superuser: true,
        created_at: new Date().toISOString(),
      },
    ];
  }
  const url = `${getAdminBaseUrl()}/admin/users`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载用户列表失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return (data.items ?? []) as AdminUser[];
  } catch (error) {
    console.error("❌ getUsers failed:", error);
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(`无法连接到远程服务器管理接口。\n请检查地址是否正确：${url}\n并确保已信任自签名证书。`);
    }
    throw error;
  }
}

export async function getRoles(): Promise<AdminRole[]> {
  if (env.isDevelopment()) {
    return [
      {
        id: 1,
        name: "admin",
        description: "System administrators",
        created_at: new Date().toISOString(),
      },
    ];
  }
  const url = `${getAdminBaseUrl()}/admin/roles`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载角色列表失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return (data.items ?? []) as AdminRole[];
  } catch (error) {
    console.error("❌ getRoles failed:", error);
    throw error;
  }
}

export async function getPolicies(): Promise<AdminPolicy[]> {
  if (env.isDevelopment()) {
    return [
      {
        id: 1,
        ptype: "p",
        v0: "role_admin",
        v1: "*",
        v2: "*",
        v3: null,
        v4: null,
        v5: null,
      },
      {
        id: 2,
        ptype: "g",
        v0: "admin",
        v1: "role_admin",
        v2: null,
        v3: null,
        v4: null,
        v5: null,
      },
    ];
  }
  const url = `${getAdminBaseUrl()}/admin/policies`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载权限策略失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return (data.items ?? []) as AdminPolicy[];
  } catch (error) {
    console.error("❌ getPolicies failed:", error);
    throw error;
  }
}

export async function createUser(payload: AdminUserPayload): Promise<AdminUser> {
  if (env.isDevelopment()) {
    return {
      id: Date.now(),
      username: payload.username,
      roles: payload.roles,
      is_active: payload.is_active,
      is_superuser: payload.is_superuser,
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/users`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "创建用户失败");
  }
  const data = await response.json();
  return data.item as AdminUser;
}

export async function updateUser(id: number, payload: Partial<AdminUserPayload>): Promise<AdminUser> {
  if (env.isDevelopment()) {
    return {
      id,
      username: payload.username || "admin",
      roles: payload.roles || [],
      is_active: payload.is_active ?? true,
      is_superuser: payload.is_superuser ?? false,
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/users/${id}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "更新用户失败");
  }
  const data = await response.json();
  return data.item as AdminUser;
}

export async function deleteUser(id: number): Promise<void> {
  if (env.isDevelopment()) return;
  const url = `${getAdminBaseUrl()}/admin/users/${id}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "删除用户失败");
  }
}

export async function createRole(payload: AdminRolePayload): Promise<AdminRole> {
  if (env.isDevelopment()) {
    return {
      id: Date.now(),
      name: payload.name,
      description: payload.description || "",
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/roles`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "创建角色失败");
  }
  const data = await response.json();
  return data.item as AdminRole;
}

export async function updateRole(id: number, payload: Partial<AdminRolePayload>): Promise<AdminRole> {
  if (env.isDevelopment()) {
    return {
      id,
      name: payload.name || "role",
      description: payload.description || "",
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/roles/${id}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "更新角色失败");
  }
  const data = await response.json();
  return data.item as AdminRole;
}

export async function deleteRole(id: number): Promise<void> {
  if (env.isDevelopment()) return;
  const url = `${getAdminBaseUrl()}/admin/roles/${id}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "删除角色失败");
  }
}

export async function createPolicy(payload: AdminPolicyPayload): Promise<AdminPolicy> {
  if (env.isDevelopment()) {
    return {
      id: Date.now(),
      ptype: payload.ptype,
      v0: payload.v0 ?? null,
      v1: payload.v1 ?? null,
      v2: payload.v2 ?? null,
      v3: payload.v3 ?? null,
      v4: payload.v4 ?? null,
      v5: payload.v5 ?? null,
    };
  }
  const url = `${getAdminBaseUrl()}/admin/policies`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "创建策略失败");
  }
  const data = await response.json();
  return data.item as AdminPolicy;
}

export async function updatePolicy(
  id: number,
  payload: AdminPolicyPayload,
): Promise<AdminPolicy> {
  if (env.isDevelopment()) {
    return {
      id,
      ptype: payload.ptype,
      v0: payload.v0 ?? null,
      v1: payload.v1 ?? null,
      v2: payload.v2 ?? null,
      v3: payload.v3 ?? null,
      v4: payload.v4 ?? null,
      v5: payload.v5 ?? null,
    };
  }
  const url = `${getAdminBaseUrl()}/admin/policies/${id}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "更新策略失败");
  }
  const data = await response.json();
  return data.item as AdminPolicy;
}

export async function deletePolicy(id: number): Promise<void> {
  if (env.isDevelopment()) return;
  const url = `${getAdminBaseUrl()}/admin/policies/${id}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "删除策略失败");
  }
}

export async function getLineConfig(): Promise<LineConfigPayload> {
  const url = `${getAdminBaseUrl()}/lines`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载产线配置失败: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("⚠️ getLineConfig: Received non-JSON response. Using defaults.");
      return { lines: [] };
    }
    const data = await response.json();
    return { lines: data.lines ?? [], views: data.views ?? {} };
  } catch (error) {
    console.warn("⚠️ getLineConfig failed:", error);
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error(`Fetch error at ${url}. Possible CORS or Network issue.`);
    }
    return { lines: [], views: {} };
  }
}

export async function saveLineConfig(payload: LineConfigPayload): Promise<void> {
  const url = `${getAdminBaseUrl()}/lines`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "保存产线配置失败");
  }
}

export async function getConfigApiList(): Promise<ConfigApiNode[]> {
  const url = `${getAdminBaseUrl()}/api_list`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载产线状态失败: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("⚠️ getConfigApiList: Received non-JSON response.");
      return [];
    }
    const data = await response.json();
    return (data.items ?? []) as ConfigApiNode[];
  } catch (error) {
    console.warn("⚠️ getConfigApiList failed:", error);
    return [];
  }
}

export const getConfigSpeedTestUrl = (options?: {
  chunkKb?: number;
  totalMb?: number;
}): string => {
  let base: string;

  // 配置中心测速统一走 /config/speed_test
  // - 生产 / 开发：通过反向代理访问当前站点 /config
  // - CORS 模式：基于远程地址追加 /config
  if (env.getMode() === "cors") {
    const raw = env.getCorsBaseUrl().trim();
    const root = raw || env.getCorsBaseUrl().trim();
    base = `${root.replace(/\/+$/, "")}/config`;
  } else if (env.getMode() === "production") {
    const configBase = env.getConfigBaseUrl();
    base = configBase ? `${configBase}/config` : "/config";
  } else {
    base = "/config";
  }

  const params = new URLSearchParams();
  if (options && typeof options.chunkKb === "number") {
    params.set("chunk_kb", String(options.chunkKb));
  }
  if (options && typeof options.totalMb === "number") {
    params.set("total_mb", String(options.totalMb));
  }
  const query = params.toString();
  return query ? `${base}/speed_test?${query}` : `${base}/speed_test`;
};

export async function getNginxConfig(): Promise<NginxConfigPayload> {
  if (env.isDevelopment()) {
    return {
      path: "/etc/nginx/conf.d/bkvision.conf",
      content: `map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 443 ssl;
  server_name bkvision.online;

  ssl_certificate /etc/nginx/ssl/bkvision.online.crt;
  ssl_certificate_key /etc/nginx/ssl/bkvision.online.key;

  # [IMPORTANT] CORS Configuration for Cross-Origin UI Access
  location /api/ {
    # Allow cross-origin requests from any domain (or specify your UI domain)
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

    # Handle OPTIONS preflight requests
    if ($request_method = 'OPTIONS') {
      add_header 'Access-Control-Allow-Origin' '*';
      add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
      add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
      add_header 'Access-Control-Max-Age' 1728000;
      add_header 'Content-Type' 'text/plain; charset=utf-8';
      add_header 'Content-Length' 0;
      return 204;
    }

    # Proxy to Backend Service
    # Note: the trailing slash in proxy_pass strips the '/api/' prefix
    proxy_pass http://127.0.0.1:8120/; 
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    root /var/www/bkvision/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
}`,
    };
  }
  const url = `${getAdminBaseUrl()}/config/nginx`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || `Failed to load nginx config: ${response.status}`);
    }
    return (await response.json()) as NginxConfigPayload;
  } catch (error) {
    console.error("❌ getNginxConfig failed:", error);
    throw error;
  }
}

export async function getSystemInfo(): Promise<SystemInfoPayload> {
  if (env.isDevelopment()) {
    return {
      line_names: ["Line-A", "Line-B"],
      database: {
        drive: "mysql",
        host: "127.0.0.1",
        port: 3306,
        database_type: "ncdplate",
        management_database: "DefectDetectionDatabBase",
        test_mode: false,
        main_status: "ok",
        main_error: null,
        management_status: "ok",
        management_error: null,
      },
      server: {
        hostname: "local-dev",
        os_name: "Windows",
        platform: "Windows-10.0.19045",
        platform_release: "10",
        platform_version: "10.0",
        cpu_count: 8,
        cpu_model: "Generic CPU",
      },
      runtime: {
        python_version: "3.11.0",
        python_executable: "C:\\Python\\python.exe",
      },
      resources: {
        cpu_percent: 28.5,
        memory_percent: 62.1,
        memory_total_bytes: 16 * 1024 * 1024 * 1024,
        memory_used_bytes: 9.9 * 1024 * 1024 * 1024,
        network_rx_bytes_per_sec: 1200,
        network_tx_bytes_per_sec: 800,
        notes: [],
      },
      service_resources: {
        cpu_percent: 8.4,
        memory_percent: 4.6,
        memory_rss_bytes: 0.9 * 1024 * 1024 * 1024,
        memory_vms_bytes: 1.2 * 1024 * 1024 * 1024,
        notes: [],
      },
      disks: [
        {
          device: "C:",
          mountpoint: "C:\\",
          fstype: "NTFS",
          total_bytes: 512 * 1024 * 1024 * 1024,
          used_bytes: 245 * 1024 * 1024 * 1024,
          free_bytes: 267 * 1024 * 1024 * 1024,
          percent: 47.8,
        },
      ],
      network_interfaces: [
        {
          name: "Ethernet",
          is_up: true,
          speed_mbps: 1000,
          rx_bytes_per_sec: 2.1 * 1024 * 1024,
          tx_bytes_per_sec: 1.6 * 1024 * 1024,
        },
      ],
    };
  }
  const url = `${getAdminBaseUrl()}/system-info`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || `Failed to load system info: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Received non-JSON response for system info");
    }
    return (await response.json()) as SystemInfoPayload;
  } catch (error) {
    console.error("❌ getSystemInfo failed:", error);
    if (error instanceof TypeError && error.message === "Failed to fetch") {
       throw new Error(`无法连接到系统信息接口。\nURL: ${url}\n这通常是由于跨域(CORS)请求被拦截或证书不信任导致。`);
    }
    throw error;
  }
}

export const getSystemMetricsWsUrl = (): string => {
  return `${getAdminWsBaseUrl()}/ws/system-metrics`;
};

export async function getConfigMate(): Promise<ConfigMatePayload> {
  if (env.isDevelopment()) {
    return {
      meta: {
        connection_mode: "development",
        api_base_url: "http://127.0.0.1:8120/api",
        service_name: "Defect Detection",
        company_name: "数据测试平台",
        service_version: "0.0.0",
        ui_version: "0.0.0",
      },
      lines: [],
      defaults: {},
    };
  }
  const url = `${getAdminBaseUrl()}/mate`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load config mate: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { lines: [], defaults: {} };
    }
    const data = (await response.json()) as ConfigMateResponse;
    const payload = data.payload;
    if (Array.isArray(payload)) {
      return { lines: payload };
    }
    return payload as ConfigMatePayload;
  } catch (error) {
    console.warn("⚠️ getConfigMate failed:", error);
    return { lines: [], defaults: {} };
  }
}

export async function getDownloadInfo(): Promise<DownloadInfo> {
  if (env.isDevelopment()) {
    return {
      latest_version: "0.1.0",
      history_versions: ["0.1.0"],
      platforms: [
        {
          key: "windows",
          label: "Windows",
          supported: true,
          requirements: ["Windows 10/11", "x64 处理器", "建议 8GB 内存"],
          latest_version: "0.1.0",
          builds: [
            {
              version: "0.1.0",
              label: "Windows 安装包 (EXE)",
              file_name: "DefectDetection Setup 0.1.0.exe",
              size_bytes: 0,
              size_display: "--",
              download_url: "/config/download/files/0.1.0/windows/DefectDetection%20Setup%200.1.0.exe",
              released_at: null,
            },
          ],
        },
        {
          key: "linux",
          label: "Linux",
          supported: false,
          requirements: [],
          builds: [],
        },
        {
          key: "macos",
          label: "macOS",
          supported: false,
          requirements: [],
          builds: [],
        },
        {
          key: "android",
          label: "Android",
          supported: false,
          requirements: [],
          builds: [],
        },
        {
          key: "ios",
          label: "iOS",
          supported: false,
          requirements: [],
          builds: [],
        },
      ],
      updated_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/download/info`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`加载下载信息失败: ${response.status}`);
  }
  return (await response.json()) as DownloadInfo;
}

export async function getCacheConfig(): Promise<CacheConfig> {
  if (env.isDevelopment()) {
    return {
      hostname: "local-dev",
      config_root: "configs/current",
      config_root_name: "current",
      map_path: "configs/current/map.json",
      server_path: "configs/current/server.json",
      templates: {
        memory_cache: {
          max_frames: -1,
          max_tiles: -1,
          max_mosaics: 8,
          max_defect_crops: 256,
          ttl_seconds: 300,
        },
        disk_cache: {
          disk_cache_enabled: true,
          disk_cache_max_records: 20000,
          defect_cache_enabled: true,
          defect_cache_expand: 100,
        },
      },
      defaults: {
        images: {},
      },
      views: {
        "2D": {
          frame_width: 16384,
          frame_height: 1024,
          pixel_scale: 1.0,
        },
      },
      lines: [
        {
          name: "本地测试数据",
          key: "test",
          profile: "default",
          mode: "direct",
          ip: "127.0.0.1",
          port: 8120,
          views: [
            {
              view: "2D",
              memory_cache: {
                max_frames: -1,
                max_tiles: -1,
                max_mosaics: 8,
                max_defect_crops: 256,
                ttl_seconds: 300,
              },
              disk_cache: {
                disk_cache_enabled: true,
                defect_cache_enabled: true,
                defect_cache_expand: 100,
              },
              images: {
                frame_width: 16384,
                frame_height: 1024,
                pixel_scale: 1.0,
              },
            },
          ],
        },
      ],
    };
  }
  const url = `${getAdminBaseUrl()}/cache`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || `Failed to load cache config: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Received non-JSON response for cache config");
    }
    return (await response.json()) as CacheConfig;
  } catch (error) {
    console.error("❌ getCacheConfig failed:", error);
    throw error;
  }
}

export async function updateCacheConfig(payload: CacheConfigUpdatePayload): Promise<CacheConfig> {
  if (env.isDevelopment()) {
    // 在开发模式下，仅更新本地状态，不真正调用后端
    console.warn("updateCacheConfig called in development mode; no-op.");
    return getCacheConfig();
  }
  const url = `${getAdminBaseUrl()}/cache`;
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || `Failed to update cache config: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Received non-JSON response for cache config");
    }
    return (await response.json()) as CacheConfig;
  } catch (error) {
    console.error("❌ updateCacheConfig failed:", error);
    throw error;
  }
}

export async function getTemplateConfig(): Promise<TemplateConfigPayload> {
  if (env.isDevelopment()) {
    return {
      server: { database: {}, images: {}, memory_cache: {}, disk_cache: {} },
      defect_class: {},
    };
  }
  const url = `${getAdminBaseUrl()}/config/template`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "加载模板配置失败");
  }
  return (await response.json()) as TemplateConfigPayload;
}

export async function updateTemplateConfig(
  payload: TemplateConfigUpdatePayload,
): Promise<TemplateConfigPayload> {
  if (env.isDevelopment()) {
    console.warn("updateTemplateConfig called in development mode; no-op.");
    return getTemplateConfig();
  }
  const url = `${getAdminBaseUrl()}/config/template`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "保存模板配置失败");
  }
  return (await response.json()) as TemplateConfigPayload;
}

export async function getLineSettings(key: string): Promise<LineSettingsPayload> {
  if (env.isDevelopment()) {
    return {
      key,
      views: [],
      defect_class_mode: "template",
      defect_class: {},
    };
  }
  const url = `${getAdminBaseUrl()}/config/line-settings/${encodeURIComponent(key)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "加载产线配置失败");
  }
  return (await response.json()) as LineSettingsPayload;
}

export async function updateLineSettings(
  key: string,
  payload: Omit<LineSettingsPayload, "key">,
): Promise<LineSettingsPayload> {
  if (env.isDevelopment()) {
    console.warn("updateLineSettings called in development mode; no-op.");
    return getLineSettings(key);
  }
  const url = `${getAdminBaseUrl()}/config/line-settings/${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "保存产线配置失败");
  }
  return (await response.json()) as LineSettingsPayload;
}

export async function restartLine(lineKey: string): Promise<void> {
  const url = `${getAdminBaseUrl()}/restart/${encodeURIComponent(lineKey)}`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "重启产线失败");
  }
}
