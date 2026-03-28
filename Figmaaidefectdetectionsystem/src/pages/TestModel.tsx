import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, RefreshCcw, Trash2, Database, Layers } from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  clearTestDatabase,
  clearTestModelLogs,
  deleteTestImages,
  getTestModelConfig,
  getTestModelLogs,
  getTestModelStatus,
  startTestModel,
  stopTestModel,
  updateTestModelConfig,
} from "../api/testModel";
import { getLineConfig } from "../api/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const numberOr = (value: any, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function TestModelPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [serverConfig, setServerConfig] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const [currentSeq, setCurrentSeq] = useState<number | null>(null);
  const [currentSteel, setCurrentSteel] = useState<string | null>(null);
  const [remainingRecords, setRemainingRecords] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [steelCount, setSteelCount] = useState<number | null>(null);
  const [defectCount, setDefectCount] = useState<number | null>(null);
  const [maxSeq, setMaxSeq] = useState<number | null>(null);
  const [dbName, setDbName] = useState<string | null>(null);
  const [dbUrl, setDbUrl] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(2);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [imageTopRoot, setImageTopRoot] = useState<string | null>(null);
  const [imageBottomRoot, setImageBottomRoot] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isClearDbOpen, setIsClearDbOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logCursor, setLogCursor] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement | null>(null);
  const logCursorRef = useRef(0);
  const [lineOptions, setLineOptions] = useState<Array<{ key: string; name?: string }>>([]);
  const [viewOptions, setViewOptions] = useState<string[]>([]);
  const logTimerRef = useRef<number | null>(null);

  const loadStatus = async () => {
    try {
      const status = await getTestModelStatus();
      setEnabled(status.enabled);
      setRunning(status.running);
      setCurrentSeq(status.current_seq ?? null);
      setCurrentSteel(status.current_steel_id ?? null);
      setRemainingRecords(status.remaining_records ?? null);
      setCurrentIndex(status.current_image_index ?? null);
      setSteelCount(status.steel_count ?? null);
      setDefectCount(status.defect_count ?? null);
      setMaxSeq(status.max_seq ?? null);
      setDbName(status.database_name ?? null);
      setDbUrl(status.database_url ?? null);
      setImageTopRoot(status.image_top_root ?? null);
      setImageBottomRoot(status.image_bottom_root ?? null);
    } catch {
      setEnabled(false);
    }
  };

  const loadConfig = async () => {
    try {
      const nextConfig = await getTestModelConfig();
      setServerConfig(nextConfig);
      setConfig(nextConfig);
      setIsDirty(false);
      isDirtyRef.current = false;
    } catch {
      toast.error("加载配置失败");
    }
  };

  useEffect(() => {
    void loadStatus();
    void loadConfig();
    getLineConfig()
      .then((payload) => {
        const lines = (payload.lines || []).map((line: any) => ({
          key: String(line.key || line.name || ""),
          name: line.name,
        })).filter((item) => item.key);
        setLineOptions(lines);
        const views = payload.views ? Object.keys(payload.views) : [];
        setViewOptions(views.length ? views : ["2D"]);
      })
      .catch(() => {
        setLineOptions([]);
        setViewOptions(["2D"]);
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(loadStatus, 2000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const resp = await getTestModelLogs(200, logCursorRef.current);
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
    logTimerRef.current = timer;
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!autoScroll || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, autoScroll]);

  const handleUpdateConfig = async (patch: Record<string, any>) => {
    try {
      const next = await updateTestModelConfig({ ...config, ...patch });
      setConfig(next);
      setServerConfig(next);
      setIsDirty(false);
      isDirtyRef.current = false;
      toast.success("配置已更新");
    } catch {
      toast.error("配置更新失败");
    }
  };

  const patchConfig = (patch: Record<string, any>) => {
    setIsDirty(true);
    isDirtyRef.current = true;
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  if (!enabled) {
    return (
      <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
        <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold tracking-tighter">返回</span>
            </button>
            <div className="h-6 w-[1px] bg-border mx-1" />
            <div className="text-sm font-bold">模拟运行测试</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          未启用 TEST_MODEL（请创建 configs/TEST_MODEL 文件）
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">返回</span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">模拟运行测试</span>
            <span className="text-[10px] text-muted-foreground">/test_model</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={loadConfig}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs"
            >
            <RefreshCcw className="w-3 h-3" />
            刷新
          </button>
          {running ? (
            <button
              onClick={async () => {
                await stopTestModel();
                toast.success("已停止");
                void loadStatus();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs"
            >
              <Pause className="w-3 h-3" />
              停止
            </button>
          ) : (
            <button
              onClick={async () => {
                await handleUpdateConfig(config);
                await startTestModel();
                toast.success("已启动");
                void loadStatus();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary text-xs"
            >
              <Play className="w-3 h-3" />
              启动
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border rounded-sm p-3 bg-card/70 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>数据生产</span>
              <div className="flex items-center gap-2">
                {running ? (
                  <button
                    onClick={async () => {
                      await stopTestModel();
                      toast.success("已停止");
                      void loadStatus();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs"
                  >
                    <Pause className="w-3 h-3" />
                    停止
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await handleUpdateConfig(config);
                      await startTestModel();
                      toast.success("已启动");
                      void loadStatus();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary text-xs"
                  >
                    <Play className="w-3 h-3" />
                    开始
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">产线</span>
                <select
                  value={config.line_key ?? ""}
                  onChange={(e) => patchConfig({ line_key: e.target.value || null })}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                >
                  <option value="">默认</option>
                  {lineOptions.map((line) => (
                    <option key={line.key} value={line.key}>
                      {line.name || line.key}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">生成视图</span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground h-8">
                  {viewOptions.map((view) => {
                    const selected = Array.isArray(config.views) ? config.views : [];
                    const checked = selected.includes(view);
                    return (
                      <label key={view} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = checked
                              ? selected.filter((item: string) => item !== view)
                              : [...selected, view];
                            patchConfig({ views: next.length ? next : ["2D"] });
                          }}
                        />
                        {view}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">记录间隔(秒)</span>
                <input
                  type="number"
                  value={config.record_interval_seconds ?? 5}
                  onChange={(e) =>
                    patchConfig({ record_interval_seconds: numberOr(e.target.value, 5) })
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">生成数量</span>
                <input
                  type="number"
                  value={config.total_records ?? ""}
                  onChange={(e) =>
                    patchConfig({ total_records: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  placeholder="为空表示持续生成"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">图像数量(最小)</span>
                <input
                  type="number"
                  value={config.image_count_min ?? 8}
                  onChange={(e) => patchConfig({ image_count_min: numberOr(e.target.value, 8) })}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">图像数量(最大)</span>
                <input
                  type="number"
                  value={config.image_count_max ?? 20}
                  onChange={(e) => patchConfig({ image_count_max: numberOr(e.target.value, 20) })}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">单张间隔(ms)</span>
                <input
                  type="number"
                  value={config.image_interval_ms ?? ""}
                  onChange={(e) =>
                    patchConfig({ image_interval_ms: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">缺陷间隔(秒)</span>
                <input
                  type="number"
                  value={config.defect_interval_seconds ?? 3}
                  onChange={(e) =>
                    patchConfig({ defect_interval_seconds: numberOr(e.target.value, 3) })
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">间隔缺陷数量</span>
                <input
                  type="number"
                  value={config.defects_per_interval ?? 5}
                  onChange={(e) =>
                    patchConfig({ defects_per_interval: numberOr(e.target.value, 5) })
                  }
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(config.generate_defects)}
                  onChange={(e) => patchConfig({ generate_defects: e.target.checked })}
                />
                生成缺陷数据
              </label>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>当前流水号：{currentSeq ?? "--"}</span>
              <span>板号：{currentSteel ?? "--"}</span>
              <span>当前索引：{currentIndex ?? "--"}</span>
              <span>剩余记录：{remainingRecords ?? "持续"}</span>
            </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateConfig(config)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary text-xs"
                >
                  保存配置
                </button>
                {isDirty ? (
                  <button
                    onClick={() => {
                      setConfig(serverConfig);
                      setIsDirty(false);
                      isDirtyRef.current = false;
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs"
                  >
                    重置
                  </button>
                ) : null}
                {isDirty ? <span className="text-[10px] text-amber-500">已修改未保存</span> : null}
              </div>
          </div>

          <div className="border border-border rounded-sm p-3 bg-card/70 flex flex-col gap-3">
            <div className="text-xs font-semibold">{"\u4fe1\u606f\u663e\u793a"}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">{"\u4e0a\u8868\u9762\u4fdd\u5b58\u8def\u5f84"}</span>
                <div
                  className="rounded-sm border border-border bg-background px-2 py-1 text-[11px] font-mono break-all"
                  title={imageTopRoot ?? ""}
                >
                  {imageTopRoot ?? "--"}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">{"\u4e0b\u8868\u9762\u4fdd\u5b58\u8def\u5f84"}</span>
                <div
                  className="rounded-sm border border-border bg-background px-2 py-1 text-[11px] font-mono break-all"
                  title={imageBottomRoot ?? ""}
                >
                  {imageBottomRoot ?? "--"}
                </div>
              </div>
            </div>
            <div className="border-t border-border/60 pt-2 flex flex-col gap-2">
              <div className="text-xs font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                {"\u6570\u636e\u5e93\u72b6\u6001"}
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {"\u8bb0\u5f55\u6570"}:{steelCount ?? "--"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {"\u7f3a\u9677\u6570"}:{defectCount ?? "--"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {"\u6700\u5927\u6d41\u6c34\u53f7"}:{maxSeq ?? "--"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {"\u5e93\u540d"}:{dbName ?? "--"}
                </span>
              </div>
              <div className="flex items-center justify-end text-[11px] text-muted-foreground font-mono">
                {dbUrl ?? "--"}
              </div>
            </div>
            <div className="border-t border-border/60 pt-2 flex flex-col gap-2">
              <div className="text-xs font-semibold">{"\u6570\u636e\u5220\u9664"}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{"\u8d77\u59cb\u6d41\u6c34\u53f7"}</span>
                  <input
                    type="number"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(numberOr(e.target.value, 2))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{"\u7ed3\u675f\u6d41\u6c34\u53f7"}</span>
                  <input
                    type="number"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(numberOr(e.target.value, 10))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDeleteOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-destructive/40 text-destructive text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  {"\u5220\u9664\u56fe\u50cf"}
                </button>
                <button
                  onClick={() => setIsClearDbOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-destructive/40 text-destructive text-xs"
                >
                  {"\u6e05\u7a7a\u6570\u636e\u5e93"}
                </button>
              </div>
            </div>
          </div>
          <div className="border border-border rounded-sm p-3 bg-card/70 flex flex-col gap-3 col-span-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>日志记录</span>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <button
                  onClick={async () => {
                    logCursorRef.current = 0;
                    setLogCursor(0);
                    try {
                      const resp = await getTestModelLogs(200, 0);
                      setLogs(resp.items || []);
                      logCursorRef.current = resp.cursor || 0;
                      setLogCursor(logCursorRef.current);
                    } catch {
                      setLogs([]);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px]"
                >
                  刷新日志
                </button>
                <button
                  onClick={async () => {
                    await clearTestModelLogs();
                    logCursorRef.current = 0;
                    setLogCursor(0);
                    setLogs([]);
                    toast.success("日志已清空");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-destructive/40 text-destructive text-[11px]"
                >
                  清空日志
                </button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  自动滚动
                </label>
              </div>
            </div>
            <div
              ref={logRef}
              className="h-56 overflow-auto border border-border rounded-sm bg-[#0b0f14] text-[#c9d1d9] font-mono"
            >
              {logs.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground">暂无日志</div>
              ) : (
                logs.map((item, idx) => {
                  const files = Array.isArray(item.data?.files) ? item.data.files : [];
                  const fileLabel = files.length ? files[0] : "";
                  const fileSuffix = files.length > 1 ? ` (+${files.length - 1})` : "";
                  return (
                    <div
                      key={`log-${idx}`}
                      className="px-3 py-2 text-[11px] border-b border-white/5"
                    >
                      <div className="text-[#8b949e]">
                        [{item.id}] {item.time} - {item.message}
                      </div>
                      <div className="text-[#7aa2f7]">
                        {item.data?.seq_no ? `流水号: ${item.data.seq_no} ` : ""}
                        {item.data?.steel_id ? `板号: ${item.data.steel_id} ` : ""}
                        {item.data?.views?.length ? `视图: ${item.data.views.join(", ")} ` : ""}
                        {item.data?.surfaces?.length
                          ? `表面: ${item.data.surfaces
                              .map((surface: any) => {
                                if (typeof surface === "string") return surface;
                                const label = surface.surface ?? surface.name;
                                if (!label) return "";
                                const count = surface.files ?? surface.count;
                                return count !== undefined ? `${label}:${count}` : String(label);
                              })
                              .filter(Boolean)
                              .join(" ")} `
                          : ""}
                        {fileLabel ? `文件: ${fileLabel}${fileSuffix} ` : ""}
                        {item.data?.image_interval_ms !== undefined
                          ? `单张间隔: ${item.data.image_interval_ms}ms `
                          : ""}
                        {item.data?.elapsed_seconds !== undefined
                          ? `耗时: ${item.data.elapsed_seconds}s `
                          : ""}
                        {item.data?.defect_count !== undefined ? `缺陷: ${item.data.defect_count} ` : ""}
                        {Number.isFinite(item.data?.image_index) ? `图像索引: ${item.data.image_index} ` : ""}
                        {Number.isFinite(item.data?.img_index_max)
                          ? `图像索引范围: ${item.data.img_index_min ?? 1}-${item.data.img_index_max} `
                          : ""}
                        {item.data?.samples?.length ? `样本: ${item.data.samples[0]}` : ""}
                        {item.data?.error ? `错误: ${item.data.error}` : ""}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-[520px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">删除图像</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              删除指定流水号区间的图像目录（不会删除源样本）。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">起始流水号</span>
              <input
                type="number"
                value={rangeStart}
                onChange={(e) => setRangeStart(numberOr(e.target.value, 2))}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">结束流水号</span>
              <input
                type="number"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(numberOr(e.target.value, 10))}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={async () => {
                await deleteTestImages(rangeStart, rangeEnd);
                toast.success("图像已删除");
                setIsDeleteOpen(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px]"
            >
              确认删除
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isClearDbOpen} onOpenChange={setIsClearDbOpen}>
        <DialogContent className="max-w-[480px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">清空数据库</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              清空测试数据库中的 steelrecord 与缺陷表。
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsClearDbOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={async () => {
                await clearTestDatabase();
                toast.success("数据库已清空");
                setIsClearDbOpen(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px]"
            >
              确认清空
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
