import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, Factory, RefreshCcw, Play } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner@2.0.3";
import {
  getLineConfig,
  getConfigApiList,
  restartLine,
  saveLineConfig,
  type ConfigApiNode,
} from "../../api/admin";

type LineItem = {
  name?: string;
  key?: string;
  mode?: string;
  ip?: string;
  port?: number | string;
  profile?: string;
  [key: string]: any;
};

const defaultLine: LineItem = {
  name: "",
  key: "",
  mode: "direct",
  ip: "",
  port: 8200,
  profile: "default",
};

export const LineConfigTable: React.FC = () => {
  const [lines, setLines] = useState<LineItem[]>([]);
  const [views, setViews] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<Record<string, ConfigApiNode>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);

  const loadAll = async () => {
    setIsRefreshing(true);
    try {
      const [payload, status] = await Promise.all([
        getLineConfig(),
        getConfigApiList(),
      ]);
      setLines(payload.lines ?? []);
      setViews(payload.views ?? {});
      const statusMap: Record<string, ConfigApiNode> = {};
      status.forEach((item) => {
        if (item.key) statusMap[item.key] = item;
      });
      const latencyMap = await measureLatencies(statusMap);
      const merged = Object.keys(statusMap).reduce<Record<string, ConfigApiNode>>((acc, key) => {
        acc[key] = { ...statusMap[key], latency_ms: latencyMap[key] ?? null };
        return acc;
      }, {});
      setApiStatus(merged);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "加载产线配置失败";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAll();
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLineChange = (index: number, key: string, value: any) => {
    setLines((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [{ ...defaultLine }, ...prev]);
    setShowAddRow(false); // 重用现有的逻辑，或者可以切换到 showAddRow 模式
  };

  const handleDeleteLine = (index: number) => {
    if (!confirm("确定要删除该产线吗？")) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveLineConfig({ lines, views });
      toast.success("产线配置已保存");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存产线配置失败";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const modeOptions = useMemo(() => ["direct", "proxy"], []);

  const formatAge = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "--";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const remaining = minutes % 60;
      return `${hours}h${remaining}m`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      const remainingHours = hours % 24;
      return `${days}d${remainingHours}h`;
    }
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return `${months}mo${remainingDays}d`;
  };

  const getLineKey = (line: LineItem) => line.key || line.name || "";
  const getHealthPath = (line: LineItem, status?: ConfigApiNode) => {
    const key = getLineKey(line);
    if (status?.path) {
      return `${status.path}/health`;
    }
    return `/api/${encodeURIComponent(key)}/health`;
  };

  const measureLatencies = async (statusMap: Record<string, ConfigApiNode>) => {
    const entries = Object.entries(statusMap);
    const results = await Promise.allSettled(
      entries.map(async ([key, status]) => {
        const line = lines.find((item) => (item.key || item.name) === key);
        const healthPath = getHealthPath(line || { key }, status);
        const start = typeof performance !== "undefined" ? performance.now() : Date.now();
        const response = await fetch(healthPath, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("health failed");
        }
        const end = typeof performance !== "undefined" ? performance.now() : Date.now();
        return { key, latency: Math.round(end - start) };
      }),
    );
    const latencyMap: Record<string, number> = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        latencyMap[result.value.key] = result.value.latency;
      } else {
        const key = entries[index]?.[0];
        if (key) latencyMap[key] = -1;
      }
    });
    return latencyMap;
  };

  const handleTestLine = async (line: LineItem) => {
    const key = getLineKey(line);
    const status = apiStatus[key];
    const healthPath = getHealthPath(line, status);
    try {
      const response = await fetch(healthPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`接口返回 ${response.status}`);
      }
      toast.success(`产线 ${line.name || key} 测试通过`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "测试失败";
      toast.error(`产线 ${line.name || key} 测试失败: ${message}`);
    }
  };

  const handleRestartLine = async (line: LineItem) => {
    const key = getLineKey(line);
    if (!key) {
      toast.error("缺少产线 key");
      return;
    }
    try {
      await restartLine(key);
      toast.success(`产线 ${line.name || key} 已重启`);
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "重启失败";
      toast.error(`产线 ${line.name || key} 重启失败: ${message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载产线配置...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Factory className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tighter uppercase">Production Line Edit</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                      Source: configs/current/map.json
                    </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[11px] font-bold border-dashed"
            onClick={handleAddLine}
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            NEW LINE
          </Button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] font-bold"
            onClick={loadAll}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            REFRESH
          </Button>
          <Button 
            size="sm" 
            className="h-8 text-[11px] font-bold px-4"
            onClick={handleSave} 
            disabled={isSaving}
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            {isSaving ? "SAVING..." : "SAVE ALL"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border bg-card/50">
        <div className="min-w-[1000px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase py-2">产线名称</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2">Key</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2">连接模式</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2">IP 地址</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2 w-24">端口</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2">Profile</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2">实时状态</TableHead>
                <TableHead className="text-[10px] font-bold uppercase py-2 text-right w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => {
                const key = getLineKey(line);
                const status = key ? apiStatus[key] : undefined;
                const online = status?.online ?? false;
                const ageText = formatAge(status?.latest_age_seconds ?? null);
                const latency =
                  status?.latency_ms === undefined || status?.latency_ms === null
                    ? "--"
                    : status?.latency_ms < 0
                      ? "--"
                      : `${status.latency_ms}ms`;
                return (
                  <TableRow key={`${line.key || line.name || "line"}-${index}`} className="border-b border-border/50 hover:bg-muted/30 group">
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-bold px-1 py-0.5 rounded-sm"
                        value={line.name ?? ""}
                        onChange={(e) => handleLineChange(index, "name", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-mono px-1 py-0.5 rounded-sm text-muted-foreground"
                        value={line.key ?? ""}
                        onChange={(e) => handleLineChange(index, "key", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <select
                        className="bg-background border border-border text-[11px] rounded-sm px-1 py-1 w-full focus:ring-1 focus:ring-primary focus:outline-none"
                        value={line.mode || "direct"}
                        onChange={(e) => handleLineChange(index, "mode", e.target.value)}
                      >
                        {modeOptions.map((mode) => (
                          <option key={mode} value={mode}>{mode.toUpperCase()}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-mono px-1 py-0.5 rounded-sm"
                        value={line.ip ?? ""}
                        onChange={(e) => handleLineChange(index, "ip", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-mono px-1 py-0.5 rounded-sm"
                        value={line.port ?? ""}
                        onChange={(e) => handleLineChange(index, "port", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-mono px-1 py-0.5 rounded-sm"
                        value={line.profile ?? ""}
                        onChange={(e) => handleLineChange(index, "profile", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex flex-col gap-0.5 text-[10px] font-mono">
                        <div className={`flex items-center gap-1.5 font-bold ${online ? "text-emerald-500" : "text-muted-foreground"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                          {online ? "ONLINE" : "OFFLINE"}
                        </div>
                        <div className="flex gap-2 opacity-60 italic">
                          <span>AGE:{ageText}</span>
                          <span>LAT:{latency}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-right flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleTestLine(line)}
                        title="测试连接"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleRestartLine(line)}
                        title="重启服务"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => handleDeleteLine(index)}
                        title="移除产线"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-[11px] text-muted-foreground font-mono">
                    NO PRODUCTION LINE DATA DETECTED
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
