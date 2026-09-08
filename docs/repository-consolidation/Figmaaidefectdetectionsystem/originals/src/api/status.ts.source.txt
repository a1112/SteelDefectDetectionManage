import { env } from "../config/env";

export type ServiceStatus = {
  name: string;
  label?: string | null;
  priority?: number | null;
  state?: string | null;
  message?: string | null;
  data?: Record<string, any>;
  updated_at?: string | null;
};

export type LineStatusItem = {
  key: string;
  name?: string | null;
  kind?: string | null;
  host?: string | null;
  port?: number | null;
  online?: boolean | null;
  latest_timestamp?: string | null;
  latest_age_seconds?: number | null;
  services?: ServiceStatus[];
};

export type SimpleStatus = {
  service?: string | null;
  label?: string | null;
  priority?: number | null;
  state?: string | null;
  message?: string | null;
  data?: Record<string, any>;
  updated_at?: string | null;
  kind?: string | null;
};

export type SystemMonitor = {
  cpu_percent?: number | null;
  memory?: {
    total?: number;
    used?: number;
    percent?: number;
  } | null;
  disks?: Array<{
    mountpoint: string;
    total: number;
    used: number;
    percent: number;
  }>;
  updated_at?: string | null;
  disk_updated_at?: string | null;
};

export type ConfigStatusPayload = {
  items: LineStatusItem[];
  system_monitor?: SystemMonitor;
};

const getConfigBase = () => {
  const base = env.getConfigBaseUrl();
  return base ? `${base}/config` : "/config";
};

export async function getConfigStatus(lineKey?: string, kind?: string): Promise<ConfigStatusPayload> {
  const params = new URLSearchParams();
  if (lineKey) params.set("line_key", lineKey);
  if (kind) params.set("kind", kind);
  const url = `${getConfigBase()}/status${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load status: ${response.status}`);
  }
  const payload = (await response.json()) as ConfigStatusPayload;
  return { items: payload.items || [], system_monitor: payload.system_monitor };
}

export async function getConfigStatusSimple(lineKey?: string, kind?: string): Promise<SimpleStatus | null> {
  const params = new URLSearchParams();
  if (lineKey) params.set("line_key", lineKey);
  if (kind) params.set("kind", kind);
  const url = `${getConfigBase()}/status/simple${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load simple status: ${response.status}`);
  }
  const payload = (await response.json()) as { item?: SimpleStatus | null };
  return payload.item || null;
}

export async function getConfigStatusLogs(
  lineKey: string,
  kind: string,
  service: string,
  cursor: number = 0,
  limit: number = 200,
): Promise<{ items: any[]; cursor: number }> {
  const params = new URLSearchParams();
  params.set("service", service);
  params.set("cursor", String(cursor));
  params.set("limit", String(limit));
  const url = `${getConfigBase()}/status/${encodeURIComponent(lineKey)}/${encodeURIComponent(kind)}/log?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load logs: ${response.status}`);
  }
  return (await response.json()) as { items: any[]; cursor: number };
}

export async function clearConfigStatusLogs(
  lineKey: string,
  kind: string,
  service: string,
): Promise<void> {
  const params = new URLSearchParams();
  params.set("service", service);
  const url = `${getConfigBase()}/status/${encodeURIComponent(lineKey)}/${encodeURIComponent(kind)}/log/clear?${params.toString()}`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to clear logs: ${response.status}`);
  }
}
