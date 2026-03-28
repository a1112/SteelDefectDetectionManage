import { useEffect, useMemo, useState } from "react";
import { env } from "../config/env";
import {
  getSystemMetricsWsUrl,
  getSystemInfo,
  type SystemMetricsPayload,
} from "../api/admin";

export type ResourceSample = {
  timestamp: string;
  cpu: number | null;
  memory: number | null;
  serviceCpu: number | null;
  serviceMemory: number | null;
};

type UseSystemMetricsOptions = {
  enabled?: boolean;
  historySize?: number;
  mockIntervalMs?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildSample = (payload: SystemMetricsPayload): ResourceSample => ({
  timestamp: payload.timestamp,
  cpu: payload.resources.cpu_percent,
  memory: payload.resources.memory_percent,
  serviceCpu: payload.service_resources?.cpu_percent ?? null,
  serviceMemory: payload.service_resources?.memory_percent ?? null,
});

const createMockPayload = (prev?: SystemMetricsPayload): SystemMetricsPayload => {
  const cpu = clamp(
    (prev?.resources.cpu_percent ?? 30) + (Math.random() - 0.5) * 8,
    15,
    85,
  );
  const memory = clamp(
    (prev?.resources.memory_percent ?? 60) + (Math.random() - 0.5) * 4,
    35,
    90,
  );
  const serviceCpu = clamp(
    (prev?.service_resources?.cpu_percent ?? 12) + (Math.random() - 0.5) * 6,
    2,
    60,
  );
  const serviceMemory = clamp(
    (prev?.service_resources?.memory_percent ?? 6) + (Math.random() - 0.5) * 3,
    1,
    40,
  );
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    resources: {
      cpu_percent: cpu,
      memory_percent: memory,
      memory_total_bytes: 16 * 1024 * 1024 * 1024,
      memory_used_bytes: Math.round((memory / 100) * 16 * 1024 * 1024 * 1024),
      network_rx_bytes_per_sec: 2.2 * 1024 * 1024,
      network_tx_bytes_per_sec: 1.7 * 1024 * 1024,
      notes: [],
    },
    service_resources: {
      cpu_percent: serviceCpu,
      memory_percent: serviceMemory,
      memory_rss_bytes: Math.round(
        (serviceMemory / 100) * 16 * 1024 * 1024 * 1024,
      ),
      memory_vms_bytes: Math.round(
        (serviceMemory / 100) * 20 * 1024 * 1024 * 1024,
      ),
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
      {
        device: "D:",
        mountpoint: "D:\\",
        fstype: "NTFS",
        total_bytes: 1024 * 1024 * 1024 * 1024,
        used_bytes: 560 * 1024 * 1024 * 1024,
        free_bytes: 464 * 1024 * 1024 * 1024,
        percent: 54.7,
      },
    ],
    network_interfaces: [
      {
        name: "Ethernet",
        is_up: true,
        speed_mbps: 1000,
        rx_bytes_per_sec: 2.2 * 1024 * 1024,
        tx_bytes_per_sec: 1.7 * 1024 * 1024,
      },
      {
        name: "Wi-Fi",
        is_up: false,
        speed_mbps: 300,
        rx_bytes_per_sec: 0,
        tx_bytes_per_sec: 0,
      },
    ],
  };
};

export const useSystemMetrics = (options: UseSystemMetricsOptions = {}) => {
  const { enabled = true, historySize = 60, mockIntervalMs = 1200 } = options;
  const [metrics, setMetrics] = useState<SystemMetricsPayload | null>(null);
  const [history, setHistory] = useState<ResourceSample[]>([]);

  const pushHistory = (payload: SystemMetricsPayload) => {
    const sample = buildSample(payload);
    setHistory((prev) => [...prev, sample].slice(-historySize));
  };

  const isLive = useMemo(() => enabled && !env.isDevelopment(), [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // 用于取消所有异步操作的标志（使用对象包装以便可变）
    const cancelled = { current: false };
    const cleanupFns: Array<() => void> = [];

    if (!isLive) {
      let current = createMockPayload(metrics ?? undefined);
      setMetrics(current);
      pushHistory(current);

      const timer = window.setInterval(() => {
        if (cancelled.current) return;
        current = createMockPayload(current);
        setMetrics(current);
        pushHistory(current);
      }, mockIntervalMs);
      cleanupFns.push(() => window.clearInterval(timer));

      return () => {
        cleanupFns.forEach(fn => fn());
      };
    }

    let pollingTimer: number | null = null;
    let wsActive = true;

    const startPolling = () => {
      if (pollingTimer !== null || cancelled.current) return;
      pollingTimer = window.setInterval(async () => {
        if (cancelled.current) return;
        try {
          const info = await getSystemInfo();
          if (cancelled.current) return;
          const payload: SystemMetricsPayload = {
            timestamp: new Date().toISOString(),
            resources: info.resources,
            service_resources: info.service_resources,
            disks: info.disks,
            network_interfaces: info.network_interfaces,
          };
          setMetrics(payload);
          pushHistory(payload);
        } catch {
          // ignore polling errors
        }
      }, mockIntervalMs);
    };

    const stopPolling = () => {
      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };

    const ws = new WebSocket(getSystemMetricsWsUrl());

    const safeSetMetrics = (payload: SystemMetricsPayload) => {
      if (!cancelled.current) {
        setMetrics(payload);
        pushHistory(payload);
      }
    };

    ws.onmessage = (event) => {
      if (cancelled.current) return;
      try {
        const payload = JSON.parse(event.data) as SystemMetricsPayload;
        safeSetMetrics(payload);
      } catch {
        // ignore malformed payloads
      }
    };

    ws.onerror = () => {
      if (cancelled.current || !wsActive) return;
      stopPolling();
      startPolling();
    };

    ws.onclose = () => {
      if (cancelled.current || !wsActive) return;
      stopPolling();
      startPolling();
    };

    return () => {
      // 设置取消标志，防止任何异步操作继续执行
      cancelled.current = true;
      wsActive = false;
      stopPolling();
      // 安全关闭 WebSocket
      try {
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch {
        // 忽略关闭时的错误
      }
    };
  }, [enabled, isLive, mockIntervalMs, historySize]);

  return { metrics, history };
};
