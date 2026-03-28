
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Activity,
  Database,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  getConfigApiList,
  getLineConfig,
  getLineSettings,
  getTemplateConfig,
  restartLine,
  saveLineConfig,
  updateLineSettings,
  updateTemplateConfig,
  type ConfigApiNode,
  type LineSettingsPayload,
  type TemplateConfigPayload,
} from "../../api/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const clampColorChannel = (value: number) =>
  Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0));

const toHexChannel = (value: number) =>
  clampColorChannel(value).toString(16).padStart(2, "0");

const rgbToHex = (color?: { red?: number; green?: number; blue?: number }) =>
  `#${toHexChannel(color?.red ?? 0)}${toHexChannel(color?.green ?? 0)}${toHexChannel(
    color?.blue ?? 0,
  )}`;

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) {
    return { red: 0, green: 0, blue: 0 };
  }
  const red = parseInt(cleaned.slice(0, 2), 16);
  const green = parseInt(cleaned.slice(2, 4), 16);
  const blue = parseInt(cleaned.slice(4, 6), 16);
  return {
    red: Number.isFinite(red) ? red : 0,
    green: Number.isFinite(green) ? green : 0,
    blue: Number.isFinite(blue) ? blue : 0,
  };
};

type LineViewDraft = {
  database: Record<string, any>;
  images: Record<string, any>;
  memory_cache: Record<string, any>;
  disk_cache: Record<string, any>;
  useDatabaseTemplate: boolean;
  useImagesTemplate: boolean;
  useCacheTemplate: boolean;
};

const MEMORY_CACHE_FIELDS: Array<{
  key: string;
  label: string;
  hint?: string;
  type?: "number" | "boolean";
}> = [
  { key: "max_frames", label: "帧缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "max_tiles", label: "瓦片缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "max_mosaics", label: "拼图缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "max_defect_crops", label: "缺陷裁剪缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "ttl_seconds", label: "缓存有效期(秒)", type: "number" },
];

const DISK_CACHE_FIELDS: Array<{
  key: string;
  label: string;
  hint?: string;
  type?: "number" | "boolean";
}> = [
  { key: "disk_cache_enabled", label: "磁盘缓存", type: "boolean" },
  { key: "disk_cache_max_records", label: "磁盘缓存记录上限", type: "number" },
  { key: "disk_cache_scan_interval_seconds", label: "磁盘扫描间隔(秒)", type: "number" },
  { key: "disk_cache_cleanup_interval_seconds", label: "磁盘清理间隔(秒)", type: "number" },
  { key: "disk_precache_enabled", label: "磁盘预热", type: "boolean" },
  { key: "disk_precache_levels", label: "预热层级", type: "number" },
  { key: "disk_precache_workers", label: "缓存线程数", type: "number" },
  { key: "defect_cache_enabled", label: "缺陷裁剪缓存", type: "boolean" },
  { key: "defect_cache_expand", label: "缺陷扩展像素", type: "number" },
];

const DATABASE_FIELDS: Array<{
  key: string;
  label: string;
  type?: "text" | "number";
}> = [
  { key: "drive", label: "驱动", type: "text" },
  { key: "host", label: "主机", type: "text" },
  { key: "port", label: "端口", type: "number" },
  { key: "user", label: "用户", type: "text" },
  { key: "password", label: "密码", type: "text" },
  { key: "charset", label: "字符集", type: "text" },
  { key: "database_type", label: "数据库类型", type: "text" },
  { key: "management_database", label: "管理库名", type: "text" },
  { key: "sqlite_dir", label: "SQLite目录", type: "text" },
];

const IMAGE_FIELDS: Array<{
  key: string;
  label: string;
  type?: "text" | "number";
}> = [
  { key: "top_root", label: "上表面目录", type: "text" },
  { key: "bottom_root", label: "下表面目录", type: "text" },
  { key: "disk_cache_top_root", label: "上表面缓存目录", type: "text" },
  { key: "disk_cache_bottom_root", label: "下表面缓存目录", type: "text" },
  { key: "default_view", label: "默认视图", type: "text" },
  { key: "file_extension", label: "文件扩展", type: "text" },
  { key: "frame_width", label: "帧宽", type: "number" },
  { key: "frame_height", label: "帧高", type: "number" },
  { key: "tile_default_size", label: "瓦片默认尺寸", type: "number" },
  { key: "pixel_scale", label: "像素比例", type: "number" },
  { key: "mode", label: "图像模式", type: "text" },
];

type DefectClassItem = {
  class: number;
  name: string;
  tag: string;
  color: { red: number; green: number; blue: number };
  severity?: number;
  desc?: string;
  parent?: string[];
};

const parseJsonObject = (raw: string): { value?: Record<string, any>; error?: string } => {
  try {
    const parsed = JSON.parse(raw.trim() || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { value: parsed as Record<string, any> };
    }
    return { error: "JSON 必须是对象" };
  } catch (error) {
    return { error: (error as Error).message };
  }
};

export const ServiceSettings: React.FC = () => {
  const [template, setTemplate] = useState<TemplateConfigPayload | null>(null);
  const [templateDatabase, setTemplateDatabase] = useState<Record<string, any>>({});
  const [templateImages, setTemplateImages] = useState<Record<string, any>>({});
  const [templateMemoryCache, setTemplateMemoryCache] = useState<Record<string, any>>({});
  const [templateDiskCache, setTemplateDiskCache] = useState<Record<string, any>>({});
  const [templateDefectItems, setTemplateDefectItems] = useState<DefectClassItem[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [lines, setLines] = useState<Record<string, any>[]>([]);
  const [mapViews, setMapViews] = useState<Record<string, any>>({});
  const [apiStatus, setApiStatus] = useState<Record<string, ConfigApiNode>>({});
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [isLineEditOpen, setIsLineEditOpen] = useState(false);
  const [isSavingLines, setIsSavingLines] = useState(false);
  const [isRefreshingLines, setIsRefreshingLines] = useState(false);

  const [, setLineSettings] = useState<LineSettingsPayload | null>(null);
  const [lineViewDrafts, setLineViewDrafts] = useState<Record<string, LineViewDraft>>({});
  const [activeView, setActiveView] = useState("2D");
  const [lineDefectMode, setLineDefectMode] = useState<"template" | "custom">("template");
  const [lineDefectItems, setLineDefectItems] = useState<DefectClassItem[]>([]);
  const [isSavingLineSettings, setIsSavingLineSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"template" | "line">("template");
  const [lineEditTab, setLineEditTab] = useState<
    "general" | "database" | "images" | "cache" | "defect"
  >("general");
  const [jsonPreview, setJsonPreview] = useState<{
    title: string;
    content: string;
    onSave: (value: string) => void;
  } | null>(null);
  const [jsonEditText, setJsonEditText] = useState("");

  useEffect(() => {
    let mounted = true;
    getTemplateConfig()
      .then((payload) => {
        if (!mounted) return;
        setTemplate(payload);
        setTemplateDatabase(payload.server?.database || {});
        setTemplateImages(payload.server?.images || {});
        setTemplateMemoryCache(payload.server?.memory_cache || {});
        setTemplateDiskCache(payload.server?.disk_cache || {});
        const defectPayload = payload.defect_class || {};
        const defectItems = Array.isArray(defectPayload.items) ? defectPayload.items : [];
        setTemplateDefectItems(defectItems as DefectClassItem[]);
      })
      .catch((err) => {
        console.error("Failed to load template config", err);
        toast.error("加载模板配置失败");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void refreshLineConfig();
  }, []);

  useEffect(() => {
    if (jsonPreview) {
      setJsonEditText(jsonPreview.content || "");
    }
  }, [jsonPreview]);

  const refreshLineConfig = async () => {
    setIsRefreshingLines(true);
    try {
      const [payload, status] = await Promise.all([
        getLineConfig(),
        getConfigApiList(),
      ]);
      setLines(payload.lines ?? []);
      setMapViews(payload.views ?? {});
      const statusMap: Record<string, ConfigApiNode> = {};
      status.forEach((item) => {
        if (item.key) statusMap[item.key] = item;
      });
      setApiStatus(statusMap);
    } catch (err) {
      console.error("Failed to load line config", err);
      toast.error("加载产线配置失败");
    } finally {
      setIsRefreshingLines(false);
    }
  };

  const handleSaveTemplates = async () => {
    if (!template) return;
    setIsSavingTemplate(true);
    try {
      const nextDefectItems = templateDefectItems.map((item, index) => ({
        ...item,
        class: Number.isFinite(item.class) ? item.class : index,
        severity: Number.isFinite(item.severity) ? Number(item.severity) : 1,
        color: {
          red: Number(item.color?.red ?? 0),
          green: Number(item.color?.green ?? 0),
          blue: Number(item.color?.blue ?? 0),
        },
      }));
      const next = await updateTemplateConfig({
        server: {
          database: templateDatabase,
          images: templateImages,
          memory_cache: templateMemoryCache,
          disk_cache: templateDiskCache,
        },
        defect_class: {
          num: nextDefectItems.length,
          items: nextDefectItems,
        },
      });
      setTemplate(next);
      setTemplateDatabase(next.server?.database || {});
      setTemplateImages(next.server?.images || {});
      setTemplateMemoryCache(next.server?.memory_cache || {});
      setTemplateDiskCache(next.server?.disk_cache || {});
      const defectPayload = next.defect_class || {};
      const defectItems = Array.isArray(defectPayload.items) ? defectPayload.items : [];
      setTemplateDefectItems(defectItems as DefectClassItem[]);
      toast.success("模板配置已保存");
    } catch (err) {
      console.error("Failed to save template config", err);
      toast.error("保存模板配置失败");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveLines = async () => {
    setIsSavingLines(true);
    try {
      await saveLineConfig({ lines, views: mapViews });
      toast.success("产线配置已保存");
      await refreshLineConfig();
    } catch (err) {
      console.error("Failed to save line config", err);
      toast.error("保存产线配置失败");
    } finally {
      setIsSavingLines(false);
    }
  };

  const openEditLine = (index: number) => {
    setEditingLineIndex(index);
    setIsLineEditOpen(true);
    setLineEditTab("general");
    const line = lines[index];
    const key = String(line?.key || line?.name || "");
    void loadLineSettings(key);
  };

  const handleLineChange = (key: string, value: any) => {
    if (editingLineIndex === null) return;
    setLines((prev) =>
      prev.map((item, idx) =>
        idx === editingLineIndex ? { ...item, [key]: value } : item,
      ),
    );
  };

  const handleAddLine = () => {
    const next = {
      name: "",
      key: "",
      mode: "direct",
      ip: "",
      port: 8200,
      profile: "default",
    };
    setLines((prev) => [next, ...prev]);
    setEditingLineIndex(0);
    setIsLineEditOpen(true);
    setLineEditTab("general");
    void loadLineSettings("");
  };

  const handleDeleteLine = (index: number) => {
    if (!confirm("确定要删除该产线吗？")) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleLineEnabled = (index: number) => {
    setLines((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const mode = String(item.mode || "direct");
        return {
          ...item,
          mode: mode === "disabled" ? "direct" : "disabled",
        };
      }),
    );
  };

  const handleRestartLine = async (key: string, name?: string) => {
    if (!key) {
      toast.error("缺少产线 key");
      return;
    }
    try {
      await restartLine(key);
      toast.success(`产线 ${name || key} 已重启`);
      await refreshLineConfig();
    } catch (err) {
      console.error("Failed to restart line", err);
      toast.error(`产线 ${name || key} 重启失败`);
    }
  };
  const loadLineSettings = async (lineKey: string) => {
    const viewKeys = Object.keys(mapViews || {});
    const fallbackViews = viewKeys.length ? viewKeys : ["2D"];
    if (!lineKey) {
      const emptyViews = fallbackViews.map((view) => ({
        view,
        database: {},
        images: {},
        memory_cache: {},
        disk_cache: {},
      }));
      applyLineSettings({
        key: "",
        views: emptyViews,
        defect_class_mode: "template",
        defect_class: {},
      });
      return;
    }
    try {
      const payload = await getLineSettings(lineKey);
      applyLineSettings(payload);
    } catch (err) {
      console.error("Failed to load line settings", err);
      toast.error("加载产线覆盖配置失败");
      const emptyViews = fallbackViews.map((view) => ({
        view,
        database: {},
        images: {},
        memory_cache: {},
        disk_cache: {},
      }));
      applyLineSettings({
        key: lineKey,
        views: emptyViews,
        defect_class_mode: "template",
        defect_class: {},
      });
    }
  };

  const applyLineSettings = (payload: LineSettingsPayload) => {
    setLineSettings(payload);
    const drafts: Record<string, LineViewDraft> = {};
    (payload.views || []).forEach((viewItem) => {
      const database = viewItem.database || {};
      const images = viewItem.images || {};
      const memoryCache = viewItem.memory_cache || {};
      const diskCache = viewItem.disk_cache || {};
      drafts[viewItem.view] = {
        database,
        images,
        memory_cache: memoryCache,
        disk_cache: diskCache,
        useDatabaseTemplate: Object.keys(database).length === 0,
        useImagesTemplate: Object.keys(images).length === 0,
        useCacheTemplate:
          Object.keys(memoryCache).length === 0 && Object.keys(diskCache).length === 0,
      };
    });
    setLineViewDrafts(drafts);
    const firstView = payload.views?.[0]?.view || "2D";
    setActiveView(firstView);
    const mode = payload.defect_class_mode === "custom" ? "custom" : "template";
    setLineDefectMode(mode);
    const defectPayload = payload.defect_class || {};
    const defectItems = Array.isArray(defectPayload.items) ? defectPayload.items : [];
    setLineDefectItems(defectItems as DefectClassItem[]);
  };

  const updateViewDraft = (view: string, patch: Partial<LineViewDraft>) => {
    setLineViewDrafts((prev) => ({
      ...prev,
      [view]: {
        ...prev[view],
        ...patch,
      },
    }));
  };

  const updateTemplateSection = (
    section: "database" | "images" | "memory_cache" | "disk_cache",
    key: string,
    value: string | number | boolean,
  ) => {
    if (section === "database") {
      setTemplateDatabase((prev) => ({ ...prev, [key]: value }));
    } else if (section === "images") {
      setTemplateImages((prev) => ({ ...prev, [key]: value }));
    } else if (section === "memory_cache") {
      setTemplateMemoryCache((prev) => ({ ...prev, [key]: value }));
    } else {
      setTemplateDiskCache((prev) => ({ ...prev, [key]: value }));
    }
  };

  const updateLineViewSection = (
    view: string,
    section: "database" | "images" | "memory_cache" | "disk_cache",
    key: string,
    value: string | number | boolean,
  ) => {
    setLineViewDrafts((prev) => ({
      ...prev,
      [view]: {
        ...(prev[view] || {
          database: {},
          images: {},
          memory_cache: {},
          disk_cache: {},
          useDatabaseTemplate: true,
          useImagesTemplate: true,
          useCacheTemplate: true,
        }),
        [section]: {
          ...(prev[view]?.[section] || {}),
          [key]: value,
        },
      },
    }));
  };

  const setLineViewSectionObject = (
    view: string,
    section: "database" | "images" | "memory_cache" | "disk_cache",
    value: Record<string, any>,
  ) => {
    setLineViewDrafts((prev) => ({
      ...prev,
      [view]: {
        ...(prev[view] || {
          database: {},
          images: {},
          memory_cache: {},
          disk_cache: {},
          useDatabaseTemplate: true,
          useImagesTemplate: true,
          useCacheTemplate: true,
        }),
        [section]: value,
      },
    }));
  };

  const addDefectItem = (setter: (value: DefectClassItem[] | ((prev: DefectClassItem[]) => DefectClassItem[])) => void) => {
    setter((prev) => [
      ...prev,
      {
        class: prev.length,
        name: "",
        tag: "",
        color: { red: 0, green: 0, blue: 0 },
        severity: 1,
        desc: "",
        parent: [],
      },
    ]);
  };

  const handleSaveLineSettings = async (): Promise<boolean> => {
    if (editingLineIndex === null) return false;
    const line = lines[editingLineIndex];
    const lineKey = String(line?.key || line?.name || "");
    if (!lineKey) {
      toast.error("请先填写产线 Key");
      return false;
    }

    const viewPayloads = Object.entries(lineViewDrafts).map(([view, draft]) => ({
      view,
      database: draft.useDatabaseTemplate ? {} : draft.database,
      images: draft.useImagesTemplate ? {} : draft.images,
      memory_cache: draft.useCacheTemplate ? {} : draft.memory_cache,
      disk_cache: draft.useCacheTemplate ? {} : draft.disk_cache,
    }));

    const defectPayload =
      lineDefectMode === "custom"
        ? {
            num: lineDefectItems.length,
            items: lineDefectItems.map((item, index) => ({
              ...item,
              class: Number.isFinite(item.class) ? item.class : index,
              severity: Number.isFinite(item.severity) ? Number(item.severity) : 1,
              color: {
                red: Number(item.color?.red ?? 0),
                green: Number(item.color?.green ?? 0),
                blue: Number(item.color?.blue ?? 0),
              },
            })),
          }
        : {};

    setIsSavingLineSettings(true);
    try {
      const next = await updateLineSettings(lineKey, {
        views: viewPayloads,
        defect_class_mode: lineDefectMode,
        defect_class: defectPayload,
      });
      applyLineSettings(next);
      toast.success("产线覆盖配置已保存");
      return true;
    } catch (err) {
      console.error("Failed to save line settings", err);
      toast.error((err as Error).message || "保存产线覆盖配置失败");
      return false;
    } finally {
      setIsSavingLineSettings(false);
    }
  };

  const lineStatus = useMemo(() => {
    const map: Record<string, { online: boolean; age?: number | null }> = {};
    Object.keys(apiStatus).forEach((key) => {
      const status = apiStatus[key];
      map[key] = {
        online: Boolean(status?.online),
        age: status?.latest_age_seconds ?? null,
      };
    });
    return map;
  }, [apiStatus]);

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
    return `${days}d`;
  };

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-xs">
        <LoaderSpinner />
        <span>正在加载服务设置...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase tracking-[0.2em]">Service</span>
            <span className="text-foreground font-bold">
              服务设置 / {activeTab === "template" ? "模板编辑" : "产线编辑"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>配置目录：<span className="font-mono text-foreground">configs/current</span></span>
            {activeTab === "template" ? (
              <span className="opacity-70">模板修改会写入 configs/current/server.json</span>
            ) : (
              <span className="opacity-70">产线修改会写入 configs/current/map.json</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setActiveTab("template")}
              className={`px-3 py-1 rounded-sm border ${
                activeTab === "template"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              模板编辑
            </button>
            <button
              onClick={() => setActiveTab("line")}
              className={`px-3 py-1 rounded-sm border ${
                activeTab === "line"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              产线编辑
            </button>
          </div>
          {activeTab === "template" && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span>模板仅对当前运行目录生效</span>
            </div>
          )}
        </div>
      </div>

      {activeTab === "template" ? (
        <div className="flex-1 p-4 overflow-hidden">
          <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar">
            <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">数据库模板</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Server.json
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setJsonPreview({
                      title: "数据库模板 JSON",
                      content: formatJson(templateDatabase),
                      onSave: (value) => {
                        const parsed = parseJsonObject(value);
                        if (parsed.error) {
                          toast.error(`数据库 JSON 解析失败: ${parsed.error}`);
                          return;
                        }
                        setTemplateDatabase(parsed.value || {});
                        toast.success("数据库 JSON 已更新");
                      },
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                >
                  查看 JSON
                </button>
                <button
                  onClick={handleSaveTemplates}
                  disabled={isSavingTemplate}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <RefreshCcw className={`w-3 h-3 ${isSavingTemplate ? "animate-spin" : ""}`} />
                  <span>保存模板</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {DATABASE_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{field.label}</span>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={templateDatabase?.[field.key] ?? ""}
                    onChange={(e) =>
                      updateTemplateSection(
                        "database",
                        field.key,
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              ))}
            </div>
          </div>

            <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  图像模板
                </div>
                <button
                  onClick={() =>
                    setJsonPreview({
                      title: "图像模板 JSON",
                      content: formatJson(templateImages),
                      onSave: (value) => {
                        const parsed = parseJsonObject(value);
                        if (parsed.error) {
                          toast.error(`图像 JSON 解析失败: ${parsed.error}`);
                          return;
                        }
                        setTemplateImages(parsed.value || {});
                        toast.success("图像 JSON 已更新");
                      },
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                >
                  查看 JSON
                </button>
              </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {IMAGE_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{field.label}</span>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={templateImages?.[field.key] ?? ""}
                    onChange={(e) =>
                      updateTemplateSection(
                        "images",
                        field.key,
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              ))}
            </div>
          </div>

            <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <HardDrive className="w-4 h-4 text-primary" />
                  缓存模板
                </div>
                <button
                  onClick={() =>
                    setJsonPreview({
                      title: "缓存模板 JSON",
                      content: formatJson({
                        memory_cache: templateMemoryCache,
                        disk_cache: templateDiskCache,
                      }),
                      onSave: (value) => {
                        const parsed = parseJsonObject(value);
                        if (parsed.error) {
                          toast.error(`缓存 JSON 解析失败: ${parsed.error}`);
                          return;
                        }
                        setTemplateMemoryCache(parsed.value?.memory_cache || {});
                        setTemplateDiskCache(parsed.value?.disk_cache || {});
                        toast.success("缓存 JSON 已更新");
                      },
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                >
                  查看 JSON
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1 text-[11px]">
                <div className="col-span-2 text-[11px] text-muted-foreground">内存缓存</div>
                {MEMORY_CACHE_FIELDS.map((field) => {
                  const value = templateMemoryCache?.[field.key];
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
                          updateTemplateSection(
                            "memory_cache",
                            field.key,
                            Number(e.target.value),
                          )
                        }
                        className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                      />
                    </label>
                  );
                })}
                <div className="col-span-2 text-[11px] text-muted-foreground mt-2">磁盘缓存</div>
                {DISK_CACHE_FIELDS.map((field) => {
                  const value = templateDiskCache?.[field.key];
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
                            updateTemplateSection(
                              "disk_cache",
                              field.key,
                              e.target.value === "true",
                            )
                          }
                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                        >
                          <option value="true">启用</option>
                          <option value="false">禁用</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          value={value ?? ""}
                          onChange={(e) =>
                            updateTemplateSection(
                              "disk_cache",
                              field.key,
                              Number(e.target.value),
                            )
                          }
                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <FileText className="w-4 h-4 text-primary" />
                  DefectClass 模板
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setJsonPreview({
                        title: "DefectClass 模板 JSON",
                        content: formatJson({ num: templateDefectItems.length, items: templateDefectItems }),
                        onSave: (value) => {
                          const parsed = parseJsonObject(value);
                          if (parsed.error) {
                            toast.error(`DefectClass JSON 解析失败: ${parsed.error}`);
                            return;
                          }
                          const items = Array.isArray(parsed.value?.items) ? parsed.value?.items : [];
                          setTemplateDefectItems(items as DefectClassItem[]);
                          toast.success("DefectClass JSON 已更新");
                        },
                      })
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                  >
                    查看 JSON
                  </button>
                  <button
                    onClick={() => addDefectItem(setTemplateDefectItems)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-border hover:bg-muted/50"
                  >
                    <Plus className="w-3 h-3" />
                    添加
                  </button>
                </div>
              </div>
            <div className="max-h-[260px] overflow-auto border border-border rounded-sm">
              <div className="grid grid-cols-[0.6fr_1fr_0.8fr_1.2fr_0.7fr_1.3fr_0.6fr] gap-2 px-2 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <span>编号</span>
                <span>名称</span>
                <span>标签</span>
                <span>描述</span>
                <span>严重等级</span>
                <span>颜色</span>
                <span className="text-right">操作</span>
              </div>
              {templateDefectItems.map((item, index) => (
                <div
                  key={`defect-${index}`}
                  className="grid grid-cols-[0.6fr_1fr_0.8fr_1.2fr_0.7fr_1.3fr_0.6fr] gap-2 px-2 py-2 text-[11px] border-b border-border/50"
                >
                  <input
                    type="number"
                    value={item.class ?? index}
                    onChange={(e) =>
                      setTemplateDefectItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, class: Number(e.target.value) } : row,
                        ),
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                  <input
                    value={item.name ?? ""}
                    onChange={(e) =>
                      setTemplateDefectItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                  <input
                    value={item.tag ?? ""}
                    onChange={(e) =>
                      setTemplateDefectItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, tag: e.target.value } : row,
                        ),
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                  <input
                    value={item.desc ?? ""}
                    onChange={(e) =>
                      setTemplateDefectItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, desc: e.target.value } : row,
                        ),
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                  <input
                    type="number"
                    value={item.severity ?? 1}
                    onChange={(e) =>
                      setTemplateDefectItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, severity: Number(e.target.value) } : row,
                        ),
                      )
                    }
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded border border-border"
                        style={{ backgroundColor: rgbToHex(item.color) }}
                      />
                      <input
                        type="color"
                        value={rgbToHex(item.color)}
                        onChange={(e) => {
                          const next = hexToRgb(e.target.value);
                          setTemplateDefectItems((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, color: next } : row,
                            ),
                          );
                        }}
                        className="h-7 w-10 rounded-sm border border-border bg-background p-0"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="number"
                        value={item.color?.red ?? 0}
                        onChange={(e) =>
                          setTemplateDefectItems((prev) =>
                            prev.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    color: { ...row.color, red: Number(e.target.value) },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="h-7 rounded-sm border border-border bg-background px-1 text-xs"
                      />
                      <input
                        type="number"
                        value={item.color?.green ?? 0}
                        onChange={(e) =>
                          setTemplateDefectItems((prev) =>
                            prev.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    color: { ...row.color, green: Number(e.target.value) },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="h-7 rounded-sm border border-border bg-background px-1 text-xs"
                      />
                      <input
                        type="number"
                        value={item.color?.blue ?? 0}
                        onChange={(e) =>
                          setTemplateDefectItems((prev) =>
                            prev.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    color: { ...row.color, blue: Number(e.target.value) },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="h-7 rounded-sm border border-border bg-background px-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() =>
                        setTemplateDefectItems((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="p-1 hover:bg-muted/60 rounded text-destructive"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {templateDefectItems.length === 0 && (
                <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                  暂无 DefectClass 配置
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">产线配置与运行</span>
              <span className="text-[10px]">支持编辑、停用、重启与覆盖配置</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-border hover:bg-muted/50"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
              <button
                onClick={refreshLineConfig}
                disabled={isRefreshingLines}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-border hover:bg-muted/50"
              >
                <RefreshCcw className={`w-3 h-3 ${isRefreshingLines ? "animate-spin" : ""}`} />
                刷新
              </button>
              <button
                onClick={handleSaveLines}
                disabled={isSavingLines}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <RotateCw className={`w-3 h-3 ${isSavingLines ? "animate-spin" : ""}`} />
                保存
              </button>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            覆盖配置写入 <span className="font-mono">configs/current/generated</span>。
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-sm">
            <div className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_1fr] gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <span>产线</span>
              <span>连接</span>
              <span>端口</span>
              <span>状态</span>
              <span className="text-right">操作</span>
            </div>
            {lines.map((line, index) => {
              const key = String(line.key || line.name || "");
              const status = lineStatus[key];
              const online = status?.online ?? false;
              const mode = String(line.mode || "direct");
              return (
                <div
                  key={`${key}-${index}`}
                  className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_1fr] gap-2 px-3 py-2 text-[12px] border-b border-border/50 hover:bg-muted/30"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{line.name || "未命名"}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{key || "--"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono">{line.ip || "-"}</span>
                    <span className="text-[10px] text-muted-foreground">模式: {mode}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono">{line.port ?? "-"}</span>
                    <span className="text-[10px] text-muted-foreground">Profile: {line.profile || "default"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-bold ${online ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {online ? "在线" : "离线"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      心跳: {formatAge(status?.age)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditLine(index)}
                      className="p-1 hover:bg-muted/60 rounded"
                      title="编辑"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleLineEnabled(index)}
                      className="p-1 hover:bg-muted/60 rounded"
                      title={mode === "disabled" ? "启用" : "停用"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRestartLine(key, line.name)}
                      className="p-1 hover:bg-muted/60 rounded"
                      title="重启"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLine(index)}
                      className="p-1 hover:bg-muted/60 rounded text-destructive"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {lines.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                暂无产线配置
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={Boolean(jsonPreview)} onOpenChange={(open) => !open && setJsonPreview(null)}>
        <DialogContent className="max-w-[900px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">{jsonPreview?.title || "JSON 预览"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              可直接编辑 JSON，保存后写入当前表单状态。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <textarea
              value={jsonEditText}
              onChange={(e) => setJsonEditText(e.target.value)}
              className="min-h-[360px] rounded-sm border border-border bg-background px-3 py-2 text-[11px] font-mono"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setJsonPreview(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
              >
                取消
              </button>
              <button
                onClick={() => jsonPreview?.onSave(jsonEditText)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
              >
                保存
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLineEditOpen} onOpenChange={setIsLineEditOpen}>
        <DialogContent className="max-w-[980px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">产线编辑</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              基础信息修改后请返回上一层点击“保存”。覆盖配置可在此直接保存。
            </DialogDescription>
          </DialogHeader>
          {editingLineIndex !== null && lines[editingLineIndex] && (
            <div className="grid gap-3 text-xs">
              <div className="grid grid-cols-[170px_1fr] gap-3">
                <div className="border border-border rounded-sm p-2 bg-card/60 flex flex-col gap-1 text-[11px]">
                  <button
                    onClick={() => setLineEditTab("general")}
                    className={`w-full text-left px-3 py-2 rounded-sm border ${
                      lineEditTab === "general"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    常规设置
                  </button>
                  <button
                    onClick={() => setLineEditTab("database")}
                    className={`w-full text-left px-3 py-2 rounded-sm border ${
                      lineEditTab === "database"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    数据库设置
                  </button>
                  <button
                    onClick={() => setLineEditTab("images")}
                    className={`w-full text-left px-3 py-2 rounded-sm border ${
                      lineEditTab === "images"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    图像设置
                  </button>
                  <button
                    onClick={() => setLineEditTab("cache")}
                    className={`w-full text-left px-3 py-2 rounded-sm border ${
                      lineEditTab === "cache"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    缓存设置
                  </button>
                  <button
                    onClick={() => setLineEditTab("defect")}
                    className={`w-full text-left px-3 py-2 rounded-sm border ${
                      lineEditTab === "defect"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    缺陷设置
                  </button>
                </div>

                <div className="grid gap-2">
                  {lineEditTab === "general" && (
                    <div className="grid gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground">产线名称</span>
                        <input
                          value={lines[editingLineIndex].name ?? ""}
                          onChange={(e) => handleLineChange("name", e.target.value)}
                          className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Key</span>
                        <input
                          value={lines[editingLineIndex].key ?? ""}
                          onChange={(e) => handleLineChange("key", e.target.value)}
                          className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">模式</span>
                          <select
                            value={lines[editingLineIndex].mode ?? "direct"}
                            onChange={(e) => handleLineChange("mode", e.target.value)}
                            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                          >
                            <option value="direct">direct</option>
                            <option value="proxy">proxy</option>
                            <option value="disabled">disabled</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Profile</span>
                          <input
                            value={lines[editingLineIndex].profile ?? ""}
                            onChange={(e) => handleLineChange("profile", e.target.value)}
                            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">IP</span>
                          <input
                            value={lines[editingLineIndex].ip ?? ""}
                            onChange={(e) => handleLineChange("ip", e.target.value)}
                            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground">端口</span>
                          <input
                            type="number"
                            value={lines[editingLineIndex].port ?? ""}
                            onChange={(e) =>
                              handleLineChange("port", Number(e.target.value) || 0)
                            }
                            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          覆盖配置按 view 保存至 configs/current/generated/{lines[editingLineIndex].key || "<key>"}
                        </span>
                        <button
                          onClick={() =>
                            loadLineSettings(
                              String(lines[editingLineIndex].key || lines[editingLineIndex].name || ""),
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-border hover:bg-muted/50"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          加载覆盖
                        </button>
                      </div>
                    </div>
                  )}

                  {lineEditTab !== "general" && (
                    <div className="border border-border rounded-md p-2 bg-card/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">覆盖配置</span>
                        <button
                          onClick={handleSaveLineSettings}
                          disabled={isSavingLineSettings}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <RotateCw className={`w-3 h-3 ${isSavingLineSettings ? "animate-spin" : ""}`} />
                          保存覆盖
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {Object.keys(lineViewDrafts).map((view) => (
                          <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`px-2 py-1 rounded-sm text-[11px] border ${activeView === view ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {view}
                          </button>
                        ))}
                      </div>

                      {lineViewDrafts[activeView] && (
                        <div className="grid gap-3">
                          {lineEditTab === "database" && (
                            <div className="border border-border rounded-sm p-2 grid gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold">数据库</span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={lineViewDrafts[activeView].useDatabaseTemplate}
                                      onChange={(e) =>
                                        updateViewDraft(activeView, {
                                          useDatabaseTemplate: e.target.checked,
                                          database: e.target.checked ? {} : lineViewDrafts[activeView].database,
                                        })
                                      }
                                    />
                                    使用模板
                                  </label>
                                  <button
                                    onClick={() =>
                                      setJsonPreview({
                                        title: `数据库覆盖 JSON - ${activeView}`,
                                        content: formatJson(lineViewDrafts[activeView].database),
                                        onSave: (value) => {
                                          const parsed = parseJsonObject(value);
                                          if (parsed.error) {
                                            toast.error(`数据库 JSON 解析失败: ${parsed.error}`);
                                            return;
                                          }
                                          setLineViewSectionObject(activeView, "database", parsed.value || {});
                                          updateViewDraft(activeView, { useDatabaseTemplate: false });
                                          toast.success("数据库 JSON 已更新");
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border text-muted-foreground hover:text-foreground"
                                  >
                                    查看 JSON
                                  </button>
                                </div>
                              </div>
                              {!lineViewDrafts[activeView].useDatabaseTemplate && (
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  {DATABASE_FIELDS.map((field) => (
                                    <label key={field.key} className="flex flex-col gap-1">
                                      <span className="text-muted-foreground">{field.label}</span>
                                      <input
                                        type={field.type === "number" ? "number" : "text"}
                                        value={lineViewDrafts[activeView].database?.[field.key] ?? ""}
                                        onChange={(e) =>
                                          updateLineViewSection(
                                            activeView,
                                            "database",
                                            field.key,
                                            field.type === "number" ? Number(e.target.value) : e.target.value,
                                          )
                                        }
                                        className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                      />
                                    </label>
                                  ))}
                                </div>
                              )}
                              {lineViewDrafts[activeView].useDatabaseTemplate && (
                                <div className="text-[11px] text-muted-foreground">继承模板数据库配置</div>
                              )}
                            </div>
                          )}

                          {lineEditTab === "images" && (
                            <div className="border border-border rounded-sm p-2 grid gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold">图像</span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={lineViewDrafts[activeView].useImagesTemplate}
                                      onChange={(e) =>
                                        updateViewDraft(activeView, {
                                          useImagesTemplate: e.target.checked,
                                          images: e.target.checked ? {} : lineViewDrafts[activeView].images,
                                        })
                                      }
                                    />
                                    使用模板
                                  </label>
                                  <button
                                    onClick={() =>
                                      setJsonPreview({
                                        title: `图像覆盖 JSON - ${activeView}`,
                                        content: formatJson(lineViewDrafts[activeView].images),
                                        onSave: (value) => {
                                          const parsed = parseJsonObject(value);
                                          if (parsed.error) {
                                            toast.error(`图像 JSON 解析失败: ${parsed.error}`);
                                            return;
                                          }
                                          setLineViewSectionObject(activeView, "images", parsed.value || {});
                                          updateViewDraft(activeView, { useImagesTemplate: false });
                                          toast.success("图像 JSON 已更新");
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border text-muted-foreground hover:text-foreground"
                                  >
                                    查看 JSON
                                  </button>
                                </div>
                              </div>
                              {!lineViewDrafts[activeView].useImagesTemplate && (
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  {IMAGE_FIELDS.map((field) => (
                                    <label key={field.key} className="flex flex-col gap-1">
                                      <span className="text-muted-foreground">{field.label}</span>
                                      <input
                                        type={field.type === "number" ? "number" : "text"}
                                        value={lineViewDrafts[activeView].images?.[field.key] ?? ""}
                                        onChange={(e) =>
                                          updateLineViewSection(
                                            activeView,
                                            "images",
                                            field.key,
                                            field.type === "number" ? Number(e.target.value) : e.target.value,
                                          )
                                        }
                                        className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                      />
                                    </label>
                                  ))}
                                </div>
                              )}
                              {lineViewDrafts[activeView].useImagesTemplate && (
                                <div className="text-[11px] text-muted-foreground">继承模板图像配置</div>
                              )}
                            </div>
                          )}

                          {lineEditTab === "cache" && (
                            <div className="border border-border rounded-sm p-2 grid gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold">缓存</span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={lineViewDrafts[activeView].useCacheTemplate}
                                      onChange={(e) =>
                                        updateViewDraft(activeView, {
                                          useCacheTemplate: e.target.checked,
                                          memory_cache: e.target.checked
                                            ? {}
                                            : lineViewDrafts[activeView].memory_cache,
                                          disk_cache: e.target.checked ? {} : lineViewDrafts[activeView].disk_cache,
                                        })
                                      }
                                    />
                                    使用模板
                                  </label>
                                  <button
                                    onClick={() =>
                                      setJsonPreview({
                                        title: `缓存覆盖 JSON - ${activeView}`,
                                        content: formatJson({
                                          memory_cache: lineViewDrafts[activeView].memory_cache,
                                          disk_cache: lineViewDrafts[activeView].disk_cache,
                                        }),
                                        onSave: (value) => {
                                          const parsed = parseJsonObject(value);
                                          if (parsed.error) {
                                            toast.error(`缓存 JSON 解析失败: ${parsed.error}`);
                                            return;
                                          }
                                          setLineViewSectionObject(
                                            activeView,
                                            "memory_cache",
                                            parsed.value?.memory_cache || {},
                                          );
                                          setLineViewSectionObject(
                                            activeView,
                                            "disk_cache",
                                            parsed.value?.disk_cache || {},
                                          );
                                          updateViewDraft(activeView, { useCacheTemplate: false });
                                          toast.success("缓存 JSON 已更新");
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                                  >
                                    查看 JSON
                                  </button>
                                </div>
                              </div>
                              {!lineViewDrafts[activeView].useCacheTemplate && (
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="col-span-2 text-[11px] text-muted-foreground">内存缓存</div>
                                  {MEMORY_CACHE_FIELDS.map((field) => (
                                    <label key={field.key} className="flex flex-col gap-1">
                                      <span className="text-muted-foreground">{field.label}</span>
                                      <input
                                        type="number"
                                        value={lineViewDrafts[activeView].memory_cache?.[field.key] ?? ""}
                                        onChange={(e) =>
                                          updateLineViewSection(
                                            activeView,
                                            "memory_cache",
                                            field.key,
                                            Number(e.target.value),
                                          )
                                        }
                                        className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                      />
                                    </label>
                                  ))}
                                  <div className="col-span-2 text-[11px] text-muted-foreground mt-2">磁盘缓存</div>
                                  {DISK_CACHE_FIELDS.map((field) => (
                                    <label key={field.key} className="flex flex-col gap-1">
                                      <span className="text-muted-foreground">{field.label}</span>
                                      {field.type === "boolean" ? (
                                        <select
                                          value={String(Boolean(lineViewDrafts[activeView].disk_cache?.[field.key]))}
                                          onChange={(e) =>
                                            updateLineViewSection(
                                              activeView,
                                              "disk_cache",
                                              field.key,
                                              e.target.value === "true",
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        >
                                          <option value="true">启用</option>
                                          <option value="false">禁用</option>
                                        </select>
                                      ) : (
                                        <input
                                          type="number"
                                          value={lineViewDrafts[activeView].disk_cache?.[field.key] ?? ""}
                                          onChange={(e) =>
                                            updateLineViewSection(
                                              activeView,
                                              "disk_cache",
                                              field.key,
                                              Number(e.target.value),
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        />
                                      )}
                                    </label>
                                  ))}
                                </div>
                              )}
                              {lineViewDrafts[activeView].useCacheTemplate && (
                                <div className="text-[11px] text-muted-foreground">继承模板缓存配置</div>
                              )}
                            </div>
                          )}

                          {lineEditTab === "defect" && (
                            <div className="border border-border rounded-sm p-2 grid gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold">DefectClass</span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="radio"
                                      checked={lineDefectMode === "template"}
                                      onChange={() => setLineDefectMode("template")}
                                    />
                                    使用模板
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="radio"
                                      checked={lineDefectMode === "custom"}
                                      onChange={() => setLineDefectMode("custom")}
                                    />
                                    使用独立
                                  </label>
                                </div>
                              </div>
                              {lineDefectMode === "custom" ? (
                                <div className="grid gap-2">
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() =>
                                        setJsonPreview({
                                          title: `DefectClass 覆盖 JSON - ${activeView}`,
                                          content: formatJson({ num: lineDefectItems.length, items: lineDefectItems }),
                                          onSave: (value) => {
                                            const parsed = parseJsonObject(value);
                                            if (parsed.error) {
                                              toast.error(`DefectClass JSON 解析失败: ${parsed.error}`);
                                              return;
                                            }
                                            const items = Array.isArray(parsed.value?.items) ? parsed.value?.items : [];
                                            setLineDefectItems(items as DefectClassItem[]);
                                            toast.success("DefectClass JSON 已更新");
                                          },
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                                    >
                                      查看 JSON
                                    </button>
                                    <button
                                      onClick={() => addDefectItem(setLineDefectItems)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] border border-border hover:bg-muted/50"
                                    >
                                      <Plus className="w-3 h-3" />
                                      添加
                                    </button>
                                  </div>
                                  <div className="max-h-[240px] overflow-auto border border-border rounded-sm">
                                    <div className="grid grid-cols-[0.6fr_1fr_0.8fr_1.2fr_0.7fr_1.3fr_0.6fr] gap-2 px-2 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                                      <span>编号</span>
                                      <span>名称</span>
                                      <span>标签</span>
                                      <span>描述</span>
                                      <span>严重等级</span>
                                      <span>颜色</span>
                                      <span className="text-right">操作</span>
                                    </div>
                                    {lineDefectItems.map((item, index) => (
                                      <div
                                        key={`line-defect-${index}`}
                                        className="grid grid-cols-[0.6fr_1fr_0.8fr_1.2fr_0.7fr_1.3fr_0.6fr] gap-2 px-2 py-2 text-[11px] border-b border-border/50"
                                      >
                                        <input
                                          type="number"
                                          value={item.class ?? index}
                                          onChange={(e) =>
                                            setLineDefectItems((prev) =>
                                              prev.map((row, i) =>
                                                i === index ? { ...row, class: Number(e.target.value) } : row,
                                              ),
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        />
                                        <input
                                          value={item.name ?? ""}
                                          onChange={(e) =>
                                            setLineDefectItems((prev) =>
                                              prev.map((row, i) =>
                                                i === index ? { ...row, name: e.target.value } : row,
                                              ),
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        />
                                        <input
                                          value={item.tag ?? ""}
                                          onChange={(e) =>
                                            setLineDefectItems((prev) =>
                                              prev.map((row, i) =>
                                                i === index ? { ...row, tag: e.target.value } : row,
                                              ),
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        />
                                        <input
                                          value={item.desc ?? ""}
                                          onChange={(e) =>
                                            setLineDefectItems((prev) =>
                                              prev.map((row, i) =>
                                                i === index ? { ...row, desc: e.target.value } : row,
                                              ),
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        />
                                        <input
                                          type="number"
                                          value={item.severity ?? 1}
                                          onChange={(e) =>
                                            setLineDefectItems((prev) =>
                                              prev.map((row, i) =>
                                                i === index ? { ...row, severity: Number(e.target.value) } : row,
                                              ),
                                            )
                                          }
                                          className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                                        />
                                        <div className="grid gap-1">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className="h-5 w-5 rounded border border-border"
                                              style={{ backgroundColor: rgbToHex(item.color) }}
                                            />
                                            <input
                                              type="color"
                                              value={rgbToHex(item.color)}
                                              onChange={(e) => {
                                                const next = hexToRgb(e.target.value);
                                                setLineDefectItems((prev) =>
                                                  prev.map((row, i) =>
                                                    i === index ? { ...row, color: next } : row,
                                                  ),
                                                );
                                              }}
                                              className="h-7 w-10 rounded-sm border border-border bg-background p-0"
                                            />
                                          </div>
                                          <div className="grid grid-cols-3 gap-1">
                                            <input
                                              type="number"
                                              value={item.color?.red ?? 0}
                                              onChange={(e) =>
                                                setLineDefectItems((prev) =>
                                                  prev.map((row, i) =>
                                                    i === index
                                                      ? {
                                                          ...row,
                                                          color: { ...row.color, red: Number(e.target.value) },
                                                        }
                                                      : row,
                                                  ),
                                                )
                                              }
                                              className="h-7 rounded-sm border border-border bg-background px-1 text-xs"
                                            />
                                            <input
                                              type="number"
                                              value={item.color?.green ?? 0}
                                              onChange={(e) =>
                                                setLineDefectItems((prev) =>
                                                  prev.map((row, i) =>
                                                    i === index
                                                      ? {
                                                          ...row,
                                                          color: { ...row.color, green: Number(e.target.value) },
                                                        }
                                                      : row,
                                                  ),
                                                )
                                              }
                                              className="h-7 rounded-sm border border-border bg-background px-1 text-xs"
                                            />
                                            <input
                                              type="number"
                                              value={item.color?.blue ?? 0}
                                              onChange={(e) =>
                                                setLineDefectItems((prev) =>
                                                  prev.map((row, i) =>
                                                    i === index
                                                      ? {
                                                          ...row,
                                                          color: { ...row.color, blue: Number(e.target.value) },
                                                        }
                                                      : row,
                                                  ),
                                                )
                                              }
                                              className="h-7 rounded-sm border border-border bg-background px-1 text-xs"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-end">
                                          <button
                                            onClick={() =>
                                              setLineDefectItems((prev) => prev.filter((_, i) => i !== index))
                                            }
                                            className="p-1 hover:bg-muted/60 rounded text-destructive"
                                            title="删除"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    {lineDefectItems.length === 0 && (
                                      <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                                        暂无 DefectClass 覆盖
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>使用模板 DefectClass.json</span>
                                  <button
                                    onClick={() =>
                                      setJsonPreview({
                                        title: "模板 DefectClass JSON",
                                        content: formatJson({
                                          num: templateDefectItems.length,
                                          items: templateDefectItems,
                                        }),
                                        onSave: (value) => {
                                          const parsed = parseJsonObject(value);
                                          if (parsed.error) {
                                            toast.error(`DefectClass JSON 解析失败: ${parsed.error}`);
                                            return;
                                          }
                                          const items = Array.isArray(parsed.value?.items) ? parsed.value?.items : [];
                                          setTemplateDefectItems(items as DefectClassItem[]);
                                          toast.success("DefectClass JSON 已更新");
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground"
                                  >
                                    查看 JSON
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setIsLineEditOpen(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    const ok = await handleSaveLineSettings();
                    if (ok) setIsLineEditOpen(false);
                  }}
                  disabled={isSavingLineSettings}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
                >
                  <RotateCw className={`w-3 h-3 ${isSavingLineSettings ? "animate-spin" : ""}`} />
                  确认
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LoaderSpinner: React.FC = () => (
  <div className="inline-flex items-center justify-center w-4 h-4 border border-border border-t-transparent rounded-full animate-spin" />
);
