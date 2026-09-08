/**
 * 风格选择器组件
 * 用于在设置面板中选择和切换不同的风格预设
 */

import { useState } from "react";
import {
  Check,
  Palette,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useStyleSystem, useAppMode } from "@/components/StyleSystemProvider";
import { toast } from "sonner";

interface StyleCardProps {
  preset: {
    id: string;
    name: string;
    description: string;
    category: string;
    colors: {
      primary: { hex: string };
      background: { hex: string };
      accent: { hex: string };
    };
  };
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

function StyleCard({ preset, isActive, onSelect, onDelete }: StyleCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isActive ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{preset.name}</CardTitle>
          {isActive && <Check className="h-4 w-4 text-primary" />}
        </div>
        <CardDescription className="text-xs">{preset.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 颜色预览 */}
        <div className="flex gap-2 mb-3">
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: preset.colors.primary.hex }}
            title="主色"
          />
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: preset.colors.accent.hex }}
            title="强调色"
          />
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: preset.colors.background.hex }}
            title="背景色"
          />
        </div>
        {preset.category === "custom" && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            删除
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface StyleSelectorProps {
  mode?: "traditional" | "modern";
}

export function StyleSelector({ mode }: StyleSelectorProps) {
  const { mode: appMode, setMode } = useAppMode();
  const currentMode = mode || appMode;
  const {
    activePreset,
    traditionalPresets,
    modernPresets,
    applyPreset,
    deletePreset,
    exportPreset,
    importPreset,
    resetToDefault,
  } = useStyleSystem();

  const [importJson, setImportJson] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);

  // 获取当前模式的预设列表
  const currentPresets =
    currentMode === "modern" ? modernPresets : traditionalPresets;

  // 分离内置预设和自定义预设
  const builtinPresets = currentPresets.filter((p) => p.category !== "custom");
  const customPresets = currentPresets.filter((p) => p.category === "custom");

  // 处理导出
  const handleExport = () => {
    try {
      const json = exportPreset(activePreset.id);
      // 创建下载链接
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-${activePreset.id}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出风格: ${activePreset.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "未知错误");
    }
  };

  // 处理导入
  const handleImport = () => {
    if (!importJson.trim()) {
      toast.error("请输入风格配置JSON");
      return;
    }
    const success = importPreset(importJson);
    if (success) {
      setShowImportDialog(false);
      setImportJson("");
      toast.success("已导入自定义风格");
    } else {
      toast.error("无效的风格配置JSON");
    }
  };

  // 处理删除
  const handleDelete = (presetId: string) => {
    if (confirm("确定要删除这个自定义风格吗？")) {
      deletePreset(presetId);
      toast.success("已删除自定义风格");
    }
  };

  // 处理重置
  const handleReset = () => {
    resetToDefault();
    toast.success("已重置为默认风格");
  };

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      {!mode && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <span className="font-medium">应用模式</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currentMode === "traditional" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("traditional")}
            >
              传统模式
            </Button>
            <Button
              variant={currentMode === "modern" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("modern")}
            >
              现代化模式
            </Button>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          导出当前风格
        </Button>
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              导入风格
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>导入风格配置</DialogTitle>
              <DialogDescription>
                粘贴导出的风格配置JSON以导入自定义风格
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-json">配置 JSON</Label>
                <Input
                  id="import-json"
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='{"id": "...", "name": "...", ...}'
                  className="font-mono text-xs"
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleImport}>导入</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RefreshCw className="h-4 w-4 mr-1" />
          重置为默认
        </Button>
      </div>

      {/* 风格选择 */}
      <Tabs defaultValue="builtin">
        <TabsList>
          <TabsTrigger value="builtin">内置风格</TabsTrigger>
          {customPresets.length > 0 && (
            <TabsTrigger value="custom">自定义风格</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="builtin" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtinPresets.map((preset) => (
              <StyleCard
                key={preset.id}
                preset={preset}
                isActive={activePreset.id === preset.id}
                onSelect={() => applyPreset(preset.id)}
              />
            ))}
          </div>
        </TabsContent>

        {customPresets.length > 0 && (
          <TabsContent value="custom" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customPresets.map((preset) => (
                <StyleCard
                  key={preset.id}
                  preset={preset}
                  isActive={activePreset.id === preset.id}
                  onSelect={() => applyPreset(preset.id)}
                  onDelete={() => handleDelete(preset.id)}
                />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* 当前风格信息 */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">当前风格</h3>
        <div className="text-sm text-muted-foreground">
          <p>名称: {activePreset.name}</p>
          <p>描述: {activePreset.description}</p>
          <p>类别: {activePreset.category === "traditional" ? "传统模式" : activePreset.category === "modern" ? "现代化模式" : "自定义"}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 紧凑型风格选择器
 * 用于设置面板中的快速切换
 */
interface CompactStyleSelectorProps {
  mode?: "traditional" | "modern";
}

export function CompactStyleSelector({ mode }: CompactStyleSelectorProps) {
  const { mode: appMode } = useAppMode();
  const currentMode = mode || appMode;
  const {
    traditionalPresets,
    modernPresets,
    activePreset,
    applyPreset,
  } = useStyleSystem();

  const currentPresets =
    currentMode === "modern" ? modernPresets : traditionalPresets;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {currentPresets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => applyPreset(preset.id)}
          className={`p-2 rounded-md border text-xs transition-all ${
            activePreset.id === preset.id
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          }`}
          title={preset.description}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: preset.colors.primary.hex }}
            />
            <span className="truncate">{preset.name}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
