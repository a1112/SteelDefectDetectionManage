import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCcw, Trash2, Lock, EyeOff } from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  clearConfigStatusLogs,
  getConfigStatus,
  getConfigStatusLogs,
  type LineStatusItem,
  type ServiceStatus,
  type SystemMonitor,
} from "../api/status";
import { getTestModelConfig, getTestModelStatus } from "../api/testModel";

const stateColor = (state?: string | null) => {
  const normalized = (state || "").toLowerCase();
  if (normalized === "error") return "bg-red-500/10 text-red-400 border-red-500/30";
  if (normalized === "running") return "bg-blue-500/10 text-blue-300 border-blue-500/30";
  if (normalized === "warning") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
};

export default function StatusCenterPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LineStatusItem[]>([]);
  const [monitor, setMonitor] = useState<SystemMonitor | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"control" | "api">("api");
  const [controlTab, setControlTab] = useState<"server" | "data" | "api">("server");
  const [lockedService, setLockedService] = useState<string | null>(null);
  const [hiddenServices, setHiddenServices] = useState<string[]>([]);
  const [logService, setLogService] = useState<string>("all");
  const [logs, setLogs] = useState<any[]>([]);
  const [logCursor, setLogCursor] = useState(0);
  const logCursorRef = useRef(0);
  const [testModelConfig, setTestModelConfig] = useState<Record<string, any> | null>(null);
  const [testModelStatus, setTestModelStatus] = useState<Record<string, any> | null>(null);
  const [showControlLogs, setShowControlLogs] = useState(false);

  const currentItem = useMemo(() => {
    if (!selectedKey || !selectedKind) return items[0] || null;
    return items.find((item) => item.key === selectedKey && item.kind === selectedKind) || null;
  }, [items, selectedKey, selectedKind]);

  const serviceList = useMemo(() => {
    const services = currentItem?.services || [];
    let filtered = services;
    if (lockedService) {
      filtered = filtered.filter((svc) => svc.name === lockedService);
    } else if (hiddenServices.length) {
      filtered = filtered.filter((svc) => !hiddenServices.includes(svc.name));
    }
    if (activePanel === "api") {
      filtered = filtered.filter((svc) => svc.name !== "database" && svc.name !== "image_path");
    }
    return filtered;
  }, [currentItem, hiddenServices, lockedService, activePanel]);

  const controlServices = useMemo(() => {
    if (currentItem?.key !== "__control__") return [];
    return currentItem.services || [];
  }, [currentItem]);

  const apiItems = useMemo(() => {
    return items.filter((item) => item.key !== "__control__");
  }, [items]);

  const pickSimple = (services: ServiceStatus[]) => {
    const normalize = (state?: string | null) => (state || "ready").toLowerCase();
    const weight = (state?: string | null) => {
      const value = normalize(state);
      if (value === "error") return 3;
      if (value === "warning") return 2;
      if (value === "running") return 1;
      return 0;
    };
    const errors = services.filter((svc) => normalize(svc.state) === "error");
    if (errors.length) {
      return errors.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    }
    const running = services.filter((svc) => normalize(svc.state) === "running");
    if (running.length) {
      return running.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    }
    return services.sort((a, b) => weight(b.state) - weight(a.state))[0];
  };

  const loadItems = async () => {
    try {
      const payload = await getConfigStatus();
      const sorted = [...payload.items].sort((a, b) => {
        if (a.key === "__control__") return -1;
        if (b.key === "__control__") return 1;
        return 0;
      });
      setItems(sorted);
      setMonitor(payload.system_monitor || null);
      if (!selectedKey || !selectedKind) {
        if (sorted.length) {
          setSelectedKey(sorted[0].key);
          setSelectedKind(sorted[0].kind || "2D");
        }
      }
    } catch {
      toast.error("状态列表加载失败");
    }
  };

  useEffect(() => {
    void loadItems();
    const timer = window.setInterval(loadItems, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentItem?.key || !currentItem?.kind) return;
    const loadLogs = async () => {
      try {
        const resp = await getConfigStatusLogs(
          currentItem.key,
          currentItem.kind,
          logService,
          logCursorRef.current,
          200,
        );
        const nextItems = resp.items || [];
        if (logCursorRef.current === 0) {
          setLogs(nextItems);
        } else if (nextItems.length) {
          setLogs((prev) => [...prev, ...nextItems].slice(-500));
        }
        const nextCursor = resp.cursor || logCursorRef.current;
        logCursorRef.current = nextCursor;
        setLogCursor(nextCursor);
      } catch {
        if (logCursorRef.current === 0) {
          setLogs([]);
        }
      }
    };
    void loadLogs();
    const timer = window.setInterval(loadLogs, 2000);
    return () => window.clearInterval(timer);
  }, [currentItem?.key, currentItem?.kind, logService]);

  useEffect(() => {
    if (activePanel !== "control" || controlTab !== "data") return;
    const loadModel = async () => {
      try {
        const [config, status] = await Promise.all([
          getTestModelConfig(),
          getTestModelStatus(),
        ]);
        setTestModelConfig(config);
        setTestModelStatus(status);
      } catch {
        setTestModelConfig(null);
        setTestModelStatus(null);
      }
    };
    void loadModel();
    const timer = window.setInterval(loadModel, 2000);
    return () => window.clearInterval(timer);
  }, [activePanel, controlTab]);

  const resetLogs = async () => {
    logCursorRef.current = 0;
    setLogCursor(0);
    if (!currentItem?.key || !currentItem?.kind) return;
    try {
      const resp = await getConfigStatusLogs(currentItem.key, currentItem.kind, logService, 0, 200);
      setLogs(resp.items || []);
      logCursorRef.current = resp.cursor || 0;
      setLogCursor(logCursorRef.current);
    } catch {
      setLogs([]);
    }
  };

  const clearLogs = async () => {
    if (!currentItem?.key || !currentItem?.kind) return;
    await clearConfigStatusLogs(currentItem.key, currentItem.kind, logService);
    logCursorRef.current = 0;
    setLogCursor(0);
    setLogs([]);
    toast.success("日志已清空");
  };

  const toggleHidden = (service: ServiceStatus) => {
    setHiddenServices((prev) => {
      if (prev.includes(service.name)) {
        return prev.filter((name) => name !== service.name);
      }
      return [...prev, service.name];
    });
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">返回</span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="text-sm font-bold">状态监控</div>
        </div>
        <button
          onClick={loadItems}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs"
        >
          <RefreshCcw className="w-3 h-3" />
          刷新
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-border bg-card/60 p-3 overflow-auto">
          <div className="text-xs font-semibold mb-2">API 列表</div>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const active = item.key === selectedKey && item.kind === selectedKind;
              return (
                <button
                  key={`${item.key}-${item.kind}`}
                  onClick={() => {
                    setSelectedKey(item.key);
                    setSelectedKind(item.kind || "2D");
                    setActivePanel(item.key === "__control__" ? "control" : "api");
                    setLockedService(null);
                    setHiddenServices([]);
                    setLogService("all");
                    logCursorRef.current = 0;
                    setLogCursor(0);
                  }}
                  className={`text-left rounded-sm border px-3 py-2 text-xs transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="font-semibold">
                    {item.name || item.key} ({item.kind || "2D"})
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.host}:{item.port}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {!currentItem ? (
            <div className="text-sm text-muted-foreground">暂无状态数据</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    setActivePanel("control");
                    const control = items.find((item) => item.key === "__control__");
                    if (control) {
                      setSelectedKey(control.key);
                      setSelectedKind(control.kind || "center");
                    }
                  }}
                  className={`px-3 py-1 rounded-sm border ${
                    activePanel === "control"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  控制中心
                </button>
                <button
                  onClick={() => {
                    setActivePanel("api");
                    if (currentItem?.key === "__control__") {
                      const firstApi = apiItems[0];
                      if (firstApi) {
                        setSelectedKey(firstApi.key);
                        setSelectedKind(firstApi.kind || "2D");
                      }
                    }
                  }}
                  className={`px-3 py-1 rounded-sm border ${
                    activePanel === "api"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  API 服务
                </button>
              </div>

              {activePanel === "control" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setControlTab("server")}
                      className={`px-3 py-1 rounded-sm border ${
                        controlTab === "server"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      服务器状态
                    </button>
                    <button
                      onClick={() => setControlTab("data")}
                      className={`px-3 py-1 rounded-sm border ${
                        controlTab === "data"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      数据生成
                    </button>
                    <button
                      onClick={() => setControlTab("api")}
                      className={`px-3 py-1 rounded-sm border ${
                        controlTab === "api"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      API 服务状态
                    </button>
                  </div>

                  {controlTab === "server" && monitor && (
                    <div className="border border-border rounded-sm p-3 bg-card/70 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>系统监控</span>
                        <span>更新时间：{monitor.updated_at || "--"}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span>CPU：{monitor.cpu_percent ?? "--"}%</span>
                        <span>内存：{monitor.memory?.percent ?? "--"}%</span>
                        <span>磁盘：{monitor.disk_updated_at || "--"}</span>
                      </div>
                    </div>
                  )}

                  {controlTab === "data" && (
                    <div className="border border-border rounded-sm p-3 bg-card/70">
                      <div className="text-xs font-semibold mb-2">图像生成</div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">当前产线</span>
                          <span>{testModelConfig?.line_key || "--"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">视图</span>
                          <span>{Array.isArray(testModelConfig?.views) ? testModelConfig?.views.join(", ") : "--"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">记录间隔</span>
                          <span>{testModelConfig?.record_interval_seconds ?? "--"} 秒</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">图像数量</span>
                          <span>
                            {testModelConfig?.image_count_min ?? "--"} ~ {testModelConfig?.image_count_max ?? "--"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">单张间隔</span>
                          <span>{testModelConfig?.image_interval_ms ?? "--"} ms</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">缺陷间隔</span>
                          <span>{testModelConfig?.defect_interval_seconds ?? "--"} 秒</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">间隔缺陷数量</span>
                          <span>{testModelConfig?.defects_per_interval ?? "--"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">生成缺陷</span>
                          <span>{testModelConfig?.generate_defects ? "开启" : "关闭"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">当前流水号</span>
                          <span>{testModelStatus?.current_seq ?? "--"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">当前索引</span>
                          <span>{testModelStatus?.current_image_index ?? "--"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">剩余记录</span>
                          <span>{testModelStatus?.remaining_records ?? "--"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">运行状态</span>
                          <span>{testModelStatus?.running ? "运行中" : "已停止"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <div className="text-muted-foreground">
                          {controlServices.find((svc) => svc.name === "image_generate")?.message || "系统就绪"}
                        </div>
                        <button
                          onClick={() => {
                            setLogService("image_generate");
                            setShowControlLogs((prev) => !prev);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px]"
                        >
                          查看日志
                        </button>
                      </div>
                      {showControlLogs && (
                        <div className="mt-2 h-40 overflow-auto border border-border rounded-sm bg-[#0b0f14] text-[#c9d1d9] font-mono text-[11px]">
                          {logs.length === 0 ? (
                            <div className="px-3 py-3 text-muted-foreground">暂无日志</div>
                          ) : (
                            logs.map((item, idx) => (
                              <div key={`control-log-${idx}`} className="px-3 py-2 border-b border-white/5">
                                <div className="text-[#8b949e]">
                                  [{item.id}] {item.time} {item.level}
                                </div>
                                <div className="text-[#7aa2f7]">{item.message}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {controlTab === "api" && (
                    <div className="border border-border rounded-sm p-3 bg-card/70">
                      <div className="text-xs font-semibold mb-2">API 服务状态</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {apiItems.map((item) => {
                          const summary = pickSimple(item.services || []);
                          return (
                            <div key={`${item.key}-${item.kind}`} className="border border-border rounded-sm p-2">
                              <div className="font-semibold">
                                {item.name || item.key} ({item.kind || "2D"})
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {summary?.label || summary?.name || "系统就绪"}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {item.online ? "在线" : "离线"} / 最新数据：
                                {item.latest_age_seconds !== null && item.latest_age_seconds !== undefined
                                  ? `${item.latest_age_seconds}s`
                                  : "--"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
              {currentItem.services && (
                <div className="border border-border rounded-sm p-3 bg-card/70 text-xs">
                  <div className="text-xs font-semibold mb-2">基础状态</div>
                  <div className="grid grid-cols-2 gap-2">
                    {currentItem.services
                      .filter((svc) => svc.name === "database" || svc.name === "image_path")
                      .map((svc) => (
                        <div
                          key={svc.name}
                          className={`border rounded-sm p-2 ${stateColor(svc.state)}`}
                        >
                          <div className="font-semibold">{svc.label || svc.name}</div>
                          <div className="text-[11px]">{svc.message || "系统就绪"}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">
                      {currentItem.name || currentItem.key} / {currentItem.kind || "2D"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {currentItem.host}:{currentItem.port}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    数据时间：{currentItem.latest_timestamp || "--"}
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span>服务状态</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <button
                      onClick={() => {
                        setLockedService(null);
                        setHiddenServices([]);
                      }}
                      className="px-2 py-1 border border-border rounded-sm"
                    >
                      恢复默认
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {serviceList.map((service) => (
                    <div
                      key={service.name}
                      className="border border-border rounded-sm p-2 bg-background/60 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{service.label || service.name}</span>
                        <span className={`px-2 py-0.5 rounded-sm border ${stateColor(service.state)}`}>
                          {service.state || "ready"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {service.message || "系统就绪"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        更新时间：{service.updated_at || "--"}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() =>
                            setLockedService((prev) => (prev === service.name ? null : service.name))
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px]"
                        >
                          <Lock className="w-3 h-3" />
                          {lockedService === service.name ? "取消锁定" : "锁定"}
                        </button>
                        <button
                          onClick={() => toggleHidden(service)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px]"
                        >
                          <EyeOff className="w-3 h-3" />
                          {hiddenServices.includes(service.name) ? "取消屏蔽" : "屏蔽"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span>服务日志</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <button
                      onClick={resetLogs}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      刷新日志
                    </button>
                    <button
                      onClick={clearLogs}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-destructive/40 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                      清空日志
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs mb-2">
                  <span className="text-muted-foreground">服务筛选</span>
                  <select
                    value={logService}
                    onChange={(e) => {
                      setLogService(e.target.value);
                      logCursorRef.current = 0;
                      setLogCursor(0);
                    }}
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  >
                    <option value="all">全部</option>
                    {(currentItem.services || []).map((service) => (
                      <option key={service.name} value={service.name}>
                        {service.label || service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="h-56 overflow-auto border border-border rounded-sm bg-[#0b0f14] text-[#c9d1d9] font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <div className="px-3 py-4 text-muted-foreground">暂无日志</div>
                  ) : (
                    logs.map((item, idx) => (
                      <div key={`status-log-${idx}`} className="px-3 py-2 border-b border-white/5">
                        <div className="text-[#8b949e]">
                          [{item.id}] {item.time} {item.level}
                        </div>
                        <div className="text-[#7aa2f7]">
                          {item.service ? `服务: ${item.service} ` : ""}
                          {item.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
