import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import type { ApiNode } from "../../api/types";
import { Database, Gauge, Zap, Monitor } from "lucide-react";
import { getConfigSpeedTestUrl } from "../../api/admin";
import { env } from "../../config/env";
import { RotateCw } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { isElectronRuntime, isTauriRuntime } from "../../utils/runtime";

const SPEED_TEST_DURATION_MS = 60_000;
const SPEED_SAMPLE_INTERVAL_MS = 1_000;

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ApiNode[];
  currentLineKey: string;
  onConfirm: (lineKey: string) => void;
  onRefresh: () => void;
}

export function DataSourceModal({
  isOpen,
  onClose,
  nodes,
  currentLineKey,
  onConfirm,
  onRefresh,
}: DataSourceModalProps) {
  const isElectron = isElectronRuntime();
  const isTauri = isTauriRuntime();
  const isDesktop = isElectron || isTauri;
  const [selected, setSelected] = useState("");
  const [imageScale, setImageScale] = useState<number>(env.getImageScale());
  const [appMode, setAppMode] = useState<"development" | "production">(env.getMode() === "development" ? "development" : "production");
  const [corsProxy, setCorsProxy] = useState<boolean>(env.getMode() === "cors");
  const [corsUrl, setCorsUrl] = useState(env.getCorsBaseUrl());
  const [productionBaseUrl, setProductionBaseUrl] = useState(
    env.getProductionBaseUrl(),
  );
  const [isMobile, setIsMobile] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLatencyError, setIsLatencyError] = useState(false);
  const [isSpeedTestOpen, setIsSpeedTestOpen] = useState(false);
  const [isSpeedTesting, setIsSpeedTesting] = useState(false);
  const [testConfigCenter, setTestConfigCenter] = useState(false);
  const [speedSamples, setSpeedSamples] = useState<number[]>([]);
  const [speedElapsed, setSpeedElapsed] = useState(0);
  const [speedError, setSpeedError] = useState<string | null>(null);
  const hasUserSelectedRef = useRef(false);
  const speedBytesRef = useRef(0);
  const speedLastBytesRef = useRef(0);
  const speedIntervalRef = useRef<number | null>(null);
  const speedTimeoutRef = useRef<number | null>(null);
  const speedAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasUserSelectedRef.current = false;
      return;
    }
    onRefresh();
    setProductionBaseUrl(env.getProductionBaseUrl());
    
    // Only set initial selection if the user hasn't interacted yet
    if (!hasUserSelectedRef.current) {
      if (currentLineKey) {
        setSelected(currentLineKey);
      } else if (nodes.length > 0) {
        setSelected(nodes[0].key || nodes[0].line_key || "");
      }
    }
  }, [isOpen, onRefresh, currentLineKey]); // Remove nodes dependency to prevent reset on data refresh

  useEffect(() => {
    if (!isOpen) return;
    if (hasUserSelectedRef.current) return;
    // Fallback if selected is still empty after nodes load
    if (!selected && nodes.length > 0) {
      const firstKey = nodes[0].key || nodes[0].line_key || "";
      setSelected(firstKey);
    }
  }, [isOpen, nodes]); // Separate effect for dynamic node loading

  useEffect(() => {
    if (!isOpen) return;
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selected) return;

    const checkLatency = async () => {
      const selectedNode = nodes.find(n => n.key === selected);
      if (!selectedNode) return;

      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        // Use no-cors to avoid CORS issues while checking connectivity
        const url = `http://${selectedNode.ip}:${selectedNode.port}/health`;
        await fetch(url, { mode: 'no-cors', signal: controller.signal });
        const endTime = performance.now();
        setLatency(Math.round(endTime - startTime));
        setIsLatencyError(false);
      } catch (err) {
        setIsLatencyError(true);
        setLatency(null);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkLatency();
    const interval = setInterval(checkLatency, 5000);
    return () => clearInterval(interval);
  }, [isOpen, selected, nodes]);

  useEffect(() => {
    if (!isSpeedTestOpen) {
      stopSpeedTest();
    }
  }, [isSpeedTestOpen]);

  const handleConfirm = () => {
    if (selected) {
      env.setImageScale(imageScale);
      
      let finalMode: AppMode = appMode;
      if (corsProxy) {
        finalMode = "cors";
        env.setCorsBaseUrl(corsUrl);
      }
      env.setMode(finalMode);
      if (isDesktop && finalMode === "production") {
        env.setProductionBaseUrl(productionBaseUrl);
      }
      
      onConfirm(selected);
    }
    onClose();
  };

  const handleProxyConfirm = () => {
    const trimmedUrl = corsUrl.trim();
    if (!trimmedUrl) {
      return;
    }
    const normalizedUrl = trimmedUrl
      .replace(/\/api\/?$/i, "")
      .replace(/\/+$/, "");
    const finalUrl = normalizedUrl || trimmedUrl;
    setCorsUrl(finalUrl);
    env.setCorsBaseUrl(finalUrl);
    env.setMode("cors");
    setCorsProxy(true);
    onRefresh();
  };

  const stopSpeedTest = (finalElapsed?: number) => {
    if (speedAbortRef.current) {
      speedAbortRef.current.abort();
      speedAbortRef.current = null;
    }
    if (speedIntervalRef.current != null) {
      window.clearInterval(speedIntervalRef.current);
      speedIntervalRef.current = null;
    }
    if (speedTimeoutRef.current != null) {
      window.clearTimeout(speedTimeoutRef.current);
      speedTimeoutRef.current = null;
    }
    setIsSpeedTesting(false);
    if (typeof finalElapsed === "number") {
      setSpeedElapsed(finalElapsed);
    }
  };

  const startSpeedTest = async () => {
    if (isSpeedTesting) return;

    const selectedNode = nodes.find((n) => n.key === selected);
    if (!selectedNode && !testConfigCenter) {
      setSpeedError("请先选择要测试的产线");
      return;
    }

    setSpeedError(null);
    setSpeedSamples([]);
    setSpeedElapsed(0);
    speedBytesRef.current = 0;
    speedLastBytesRef.current = 0;
    setIsSpeedTesting(true);
    const controller = new AbortController();
    speedAbortRef.current = controller;
    const startAt = performance.now();
    const endAt = startAt + SPEED_TEST_DURATION_MS;

    speedIntervalRef.current = window.setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = Math.min(
        60,
        Math.floor((now - startAt) / SPEED_SAMPLE_INTERVAL_MS),
      );
      setSpeedElapsed(elapsedSeconds);
      const deltaBytes = speedBytesRef.current - speedLastBytesRef.current;
      speedLastBytesRef.current = speedBytesRef.current;
      const mbps = (deltaBytes * 8) / 1_000_000;
      setSpeedSamples((prev) => [...prev, mbps].slice(-60));
    }, SPEED_SAMPLE_INTERVAL_MS);

    speedTimeoutRef.current = window.setTimeout(() => {
      stopSpeedTest(60);
    }, SPEED_TEST_DURATION_MS);

    try {
      const params = new URLSearchParams();
      params.set("chunk_kb", "1024");
      // total_mb=0 表示后端持续输出，由前端控制测试时长（60秒）
      params.set("total_mb", "0");
      const isFileProtocol = env.isFileProtocol();

      const buildLineSpeedTestUrl = (node: ApiNode): string => {
        // 计算最终模式：是否走 CORS 代理
        const finalMode = corsProxy ? "cors" : appMode;
        const lineKey = node.key || currentLineKey || selected;

        if (!lineKey) {
          return "";
        }

        // CORS 模式：基于远程地址追加 /api/{line_key}
        if (finalMode === "cors") {
          const raw = (corsUrl || env.getCorsBaseUrl()).trim();
          const root = raw || env.getCorsBaseUrl().trim();
          const baseApi = root.endsWith("/api")
            ? root
            : root.endsWith("/api/")
              ? root.slice(0, -1)
              : `${root.replace(/\/+$/, "")}/api`;
          return `${baseApi}/${encodeURIComponent(
            lineKey,
          )}/speed_test?${params.toString()}`;
        }

        // 本地 / 生产：统一走 /api
        const basePath = "/api";
        const prefix = isFileProtocol ? `${env.getConfigBaseUrl()}${basePath}` : basePath;
        return `${prefix}/${encodeURIComponent(
          lineKey,
        )}/speed_test?${params.toString()}`;
      };

      const url = testConfigCenter
        ? getConfigSpeedTestUrl({
            chunkKb: 1024,
            totalMb: 0,
          })
        : buildLineSpeedTestUrl(selectedNode as ApiNode);

      if (!url) {
        setSpeedError("无法构造测速地址，请检查配置");
        return;
      }

      const response = await fetch(
        url,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok || !response.body) {
        throw new Error("测速接口不可用");
      }
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          speedBytesRef.current += value.byteLength;
        }
        if (performance.now() >= endAt) {
          controller.abort();
          break;
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSpeedError("测速失败，请检查配置中心接口");
      }
    } finally {
      stopSpeedTest(
        Math.min(60, Math.floor((performance.now() - startAt) / 1000)),
      );
    }
  };

  const formatMbps = (value: number) => {
    if (!Number.isFinite(value)) return "-";
    if (value < 10) return value.toFixed(2);
    if (value < 100) return value.toFixed(1);
    return value.toFixed(0);
  };

  const buildSpeedPath = (values: number[], width: number, height: number) => {
    if (!values.length) return "";
    const maxValue = Math.max(...values, 1);
    const step = width / Math.max(values.length - 1, 1);
    const points = values.map((value, index) => {
      const x = index * step;
      const y = height - (value / maxValue) * height;
      return { x, y };
    });
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  };

  const speedMax = speedSamples.length ? Math.max(...speedSamples) : 0;
  const speedAvg =
    speedSamples.length > 0
      ? speedSamples.reduce((sum, value) => sum + value, 0) / speedSamples.length
      : 0;
  const speedCurrent =
    speedSamples.length > 0 ? speedSamples[speedSamples.length - 1] : 0;

  const currentEnvMode = env.getMode();
  const selectedMode = corsProxy ? "cors" : appMode;
  const isEnvDirty = selectedMode !== currentEnvMode;

  const formatAge = (seconds?: number) => {
    if (seconds == null || !Number.isFinite(seconds)) return "-";
    if (seconds < 60) return "刚刚";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const months = Math.floor(days / 30);
    return `${months} 个月前`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[580px] bg-card/80 backdrop-blur-xl border-border shadow-2xl">
          <DialogHeader className="pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Database className="w-5 h-5 text-primary" />
              数据源与性能配置
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>

          <div className="space-y-6 pt-1 pb-4">
            {/* System Mode Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <Monitor className="w-4 h-4" />
                  运行环境与代理
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setAppMode("development");
                      setCorsProxy(false);
                      env.setMode("development");
                      onRefresh();
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-md border text-[11px] font-bold transition-all h-16 ${
                      appMode === "development" && !corsProxy
                        ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30"
                        : "border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground cursor-pointer"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    调试模式
                  </button>

                  <button
                    onClick={() => {
                      setAppMode("production");
                      setCorsProxy(false);
                      env.setMode("production");
                      onRefresh();
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-md border text-[11px] font-bold transition-all h-16 ${
                      appMode === "production" && !corsProxy
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
                        : "border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground cursor-pointer"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    生产模式
                  </button>

                  <button
                    onClick={() => {
                      setCorsProxy(true);
                      env.setMode("cors");
                      if (corsUrl) env.setCorsBaseUrl(corsUrl);
                      onRefresh();
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-md border text-[11px] font-bold transition-all h-16 ${
                      corsProxy
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground cursor-pointer"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    跨域代理
                  </button>
                </div>
                
                {corsProxy && (
                  <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                        代理服务器配置
                      </div>
                      <span className="text-[9px] text-muted-foreground bg-muted/50 px-1 rounded">CORS 模式</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-muted-foreground">请输入用于解决跨域限制的代理地址:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={corsUrl}
                          onChange={(e) => setCorsUrl(e.target.value)}
                          placeholder="http://proxy-server.com"
                          className="w-full bg-background border border-border rounded px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleProxyConfirm}
                          className="h-7 px-3 text-[11px] font-bold whitespace-nowrap"
                        >
                          确认
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  <Database className="w-4 h-4" />
                  产线数据源选择
                  {selected && (
                    <div className="flex items-center gap-1.5 ml-1 px-1.5 py-0.5 rounded bg-muted/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase opacity-60">延时:</span>
                      {isLatencyError ? (
                        <span className="text-[10px] text-red-500 font-black animate-pulse">连接失败</span>
                      ) : (
                        <span className={`text-[10px] font-black font-mono ${latency && latency > 200 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                          {latency ?? '--'} ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[11px] px-3 font-bold bg-muted/30 border-border hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={onRefresh}
                >
                  <RotateCw className="w-3 h-3 mr-1" />
                  刷新配置
                </Button>
              </div>
              {isDesktop && appMode === "production" && !corsProxy && (
                <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    生产模式服务地址
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={productionBaseUrl}
                      onChange={(e) =>
                        setProductionBaseUrl(e.target.value)
                      }
                      placeholder="http://192.168.1.10:80"
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    仅 Electron 生效，保存后会持久化到本地配置。
                  </div>
                </div>
              )}
              {nodes.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  暂无可用数据源，请确认后端已启并提供 /config/api_list。
                </div>
              )}
              <div
                className="space-y-2 overflow-y-auto pr-1 overscroll-contain"
                style={{
                  maxHeight: isMobile ? "calc(100vh - 240px)" : "220px",
                }}
              >
                {nodes.map((node) => {
                  const isOffline = node.online === false;
                  const isStale =
                    node.latest_age_seconds != null &&
                    Number.isFinite(node.latest_age_seconds) &&
                    node.latest_age_seconds > 86400;
                  const statusColor = isOffline
                    ? "text-red-500"
                    : isStale
                    ? "text-yellow-500"
                    : "text-muted-foreground";
                  return (
                    <label
                      key={node.key}
                      className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                        selected === node.key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="data-source"
                          value={node.key}
                          checked={selected === node.key}
                          onChange={() => {
                            hasUserSelectedRef.current = true;
                            setSelected(node.key);
                          }}
                        />
                        <div className="flex flex-col">
                          <span
                            className={`font-medium ${
                              isOffline ? "text-red-500" : ""
                            }`}
                          >
                            {node.name} ({node.key})
                          </span>
                          <span className={`text-[11px] ${statusColor}`}>
                            {node.online ? "在线" : "离线"} · 最新数据
                            {formatAge(node.latest_age_seconds)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`text-xs ${
                          isOffline ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        {node.ip ? node.ip : "-"}:{node.port ?? "-"}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Image Scale Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                图像缩放
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">
                  影响瓦片、缺陷小图与帧图像返回的分辨率
                </div>
                <select
                  className="h-7 rounded-md border border-border bg-background px-2 text-[11px] font-mono"
                  value={imageScale}
                  onChange={(event) => setImageScale(Number(event.target.value))}
                >
                  <option value={1}>100%</option>
                  <option value={0.75}>75%</option>
                  <option value={0.5}>50%</option>
                  <option value={0.25}>25%</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="测速"
              onClick={() => setIsSpeedTestOpen(true)}
            >
              <Gauge className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                取消
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={!selected}>
                切换并保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSpeedTestOpen} onOpenChange={setIsSpeedTestOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Gauge className="h-5 w-5 text-primary" />
              下载带宽测试
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <div>1分钟下行带宽测试，结果仅作参考。</div>
              <div className="text-xs text-muted-foreground">
                测试产线：
                <span className="font-medium text-foreground">
                  {nodes.find((n) => n.key === selected)?.name ||
                    nodes.find((n) => n.key === selected)?.key ||
                    "未选择"}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>进度: {speedElapsed}s / 60s</span>
                <span>峰值: {formatMbps(speedMax)} Mbps</span>
              </div>
              <div className="mt-3 h-[140px] w-full">
                <svg viewBox="0 0 520 140" className="h-full w-full">
                  <defs>
                    <linearGradient id="speedLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <path
                    d={buildSpeedPath(speedSamples, 520, 120)}
                    fill="none"
                    stroke="url(#speedLine)"
                    strokeWidth="3"
                  />
                  <line x1="0" y1="120" x2="520" y2="120" stroke="currentColor" opacity="0.2" />
                </svg>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">当前</div>
                  <div className="text-base font-semibold text-foreground">
                    {formatMbps(speedCurrent)} Mbps
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">平均</div>
                  <div className="text-base font-semibold text-foreground">
                    {formatMbps(speedAvg)} Mbps
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">样本</div>
                  <div className="text-base font-semibold text-foreground">
                    {speedSamples.length} / 60
                  </div>
                </div>
              </div>
            </div>

            {speedError && <div className="text-sm text-red-500">{speedError}</div>}
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="test-config-center"
                checked={testConfigCenter}
                onCheckedChange={(value) =>
                  setTestConfigCenter(value === true)
                }
              />
              <label
                htmlFor="test-config-center"
                className="text-xs text-muted-foreground select-none cursor-pointer"
              >
                测试配置中心
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSpeedTestOpen(false)}
              >
                关闭
              </Button>
              {isSpeedTesting ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => stopSpeedTest()}
                >
                  停止
                </Button>
              ) : (
                <Button type="button" onClick={startSpeedTest}>
                  开始测速
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
