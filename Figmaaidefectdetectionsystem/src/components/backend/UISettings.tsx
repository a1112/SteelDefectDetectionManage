import { useEffect, useState } from "react";
import { Save, RotateCcw, Check, Palette } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { toast } from "sonner@2.0.3";
import { useTheme, themePresets } from "../ThemeContext";
import { getUiSettings, saveUiSettings } from "../../api/admin";

export interface UIConfig {
  theme: "light" | "dark" | "auto";
  themePreset: string;
  customTheme: boolean;
  primaryColor: string;
  accentColor: string;
  language: string;
  fontSize: number;
  animationSpeed: number;
  compactMode: boolean;
  showGridLines: boolean;
  autoRefreshInterval: number;
  clientCachePrefetchEnabled: boolean;
  clientCacheTileLimit: number;
  clientCacheDefectLimit: number;
}

const defaultConfig: UIConfig = {
  theme: "dark",
  themePreset: "industrial-dark",
  customTheme: false,
  primaryColor: "#3b82f6",
  accentColor: "#6366f1",
  language: "zh-CN",
  fontSize: 14,
  animationSpeed: 300,
  compactMode: true,
  showGridLines: true,
  autoRefreshInterval: 30,
  clientCachePrefetchEnabled: true,
  clientCacheTileLimit: 200,
  clientCacheDefectLimit: 500,
};

export const UISettings: React.FC = () => {
  const { currentTheme, applyTheme, applyThemeById } = useTheme();
  const [config, setConfig] = useState<UIConfig>(() => ({
    ...defaultConfig,
    themePreset: currentTheme.id,
    primaryColor: currentTheme.colors.primary,
    accentColor: currentTheme.colors.accent,
  }));
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      try {
        const payload = await getUiSettings(defaultConfig);
        if (cancelled) return;

        // 确保加载的配置在预设范围内
        const presetExists = themePresets.some((p) => p.id === payload.themePreset);
        if (!presetExists) {
          payload.themePreset = themePresets[0].id;
        }

        setConfig(payload);
        setHasChanges(false);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "加载 UI 设置失败";
        toast.error(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = <K extends keyof UIConfig>(key: K, value: UIConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = themePresets.find((p) => p.id === presetId);
    if (preset) {
      setConfig((prev) => ({
        ...prev,
        themePreset: presetId,
        customTheme: false,
        primaryColor: preset.colors.primary,
        accentColor: preset.colors.accent,
      }));
      setHasChanges(true);
      // 立即应用主题以增强交互反馈
      applyTheme(preset);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveUiSettings(config);
      toast.success("UI设置已保存");
      setHasChanges(false);

      // 保存时确保应用当前选中的预设
      applyThemeById(config.themePreset);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存 UI 设置失败";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("确定要重置为默认设置吗？")) {
      setConfig(defaultConfig);
      applyThemeById(defaultConfig.themePreset);
      setHasChanges(true);
      toast.info("已重置为默认设置");
    }
  };

  const handleApplyTheme = () => {
    const preset = themePresets.find((p) => p.id === config.themePreset);
    if (preset) {
      applyTheme(preset);
      toast.success(`已应用主题: ${preset.name}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载 UI 设置...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">UI设置</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 主题预设选择器 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-5 h-5" />
              主题预设
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {themePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    config.themePreset === preset.id
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.background} 0%, ${preset.colors.muted} 100%)`,
                  }}
                >
                  {config.themePreset === preset.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: preset.colors.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: preset.colors.accent }}
                      />
                      <div
                        className="w-6 h-6 rounded border"
                        style={{
                          backgroundColor: preset.colors.muted,
                          borderColor: preset.colors.border,
                        }}
                      />
                    </div>
                    <div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: preset.colors.foreground }}
                      >
                        {preset.name}
                      </div>
                      <div
                        className="text-xs opacity-70"
                        style={{ color: preset.colors.foreground }}
                      >
                        {preset.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplyTheme}
                className="flex items-center gap-2"
                size="sm"
              >
                立即预览主题
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  id="customTheme"
                  checked={config.customTheme}
                  onCheckedChange={(checked) => handleChange("customTheme", checked)}
                />
                <Label htmlFor="customTheme">启用自定义主题</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自定义颜色 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">自定义颜色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">明暗模式</Label>
              <Select
                value={config.theme}
                onValueChange={(value: any) => handleChange("theme", value)}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">浅色</SelectItem>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="auto">跟随系统</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">主色调</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => {
                    handleChange("primaryColor", e.target.value);
                    handleChange("customTheme", true);
                  }}
                  className="w-20 h-10 cursor-pointer"
                  disabled={!config.customTheme}
                />
                <Input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => {
                    handleChange("primaryColor", e.target.value);
                    handleChange("customTheme", true);
                  }}
                  className="flex-1 font-mono"
                  disabled={!config.customTheme}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">强调色</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => {
                    handleChange("accentColor", e.target.value);
                    handleChange("customTheme", true);
                  }}
                  className="w-20 h-10 cursor-pointer"
                  disabled={!config.customTheme}
                />
                <Input
                  type="text"
                  value={config.accentColor}
                  onChange={(e) => {
                    handleChange("accentColor", e.target.value);
                    handleChange("customTheme", true);
                  }}
                  className="flex-1 font-mono"
                  disabled={!config.customTheme}
                />
              </div>
            </div>

            {config.customTheme && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                💡 提示：自定义颜色将覆盖主题预设
              </div>
            )}
          </CardContent>
        </Card>

        {/* 界面设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">界面设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">语言</Label>
              <Select
                value={config.language}
                onValueChange={(value) => handleChange("language", value)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="zh-TW">繁体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontSize">
                字体大小: {config.fontSize}px
              </Label>
              <Slider
                id="fontSize"
                min={12}
                max={20}
                step={1}
                value={[config.fontSize]}
                onValueChange={([value]) => handleChange("fontSize", value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="animationSpeed">
                动画速度: {config.animationSpeed}ms
              </Label>
              <Slider
                id="animationSpeed"
                min={100}
                max={1000}
                step={50}
                value={[config.animationSpeed]}
                onValueChange={([value]) => handleChange("animationSpeed", value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 显示选项 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">显示选项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compactMode">紧凑模式</Label>
                <div className="text-xs text-muted-foreground">
                  减少界面间距以显示更多内容
                </div>
              </div>
              <Switch
                id="compactMode"
                checked={config.compactMode}
                onCheckedChange={(checked) => handleChange("compactMode", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showGridLines">显示网格线</Label>
                <div className="text-xs text-muted-foreground">
                  在图像视图中显示网格参考线
                </div>
              </div>
              <Switch
                id="showGridLines"
                checked={config.showGridLines}
                onCheckedChange={(checked) =>
                  handleChange("showGridLines", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 性能设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">性能设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autoRefreshInterval">
                自动刷新间隔: {config.autoRefreshInterval}秒
              </Label>
              <Slider
                id="autoRefreshInterval"
                min={5}
                max={300}
                step={5}
                value={[config.autoRefreshInterval]}
                onValueChange={([value]) =>
                  handleChange("autoRefreshInterval", value)
                }
              />
              <div className="text-xs text-muted-foreground">
                设置为0表示禁用自动刷新
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 客户端缓存 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">客户端缓存</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="clientCachePrefetchEnabled">启用预加载</Label>
                <div className="text-xs text-muted-foreground">
                  对已缓存的数据预加载瓦片与缺陷小图
                </div>
              </div>
              <Switch
                id="clientCachePrefetchEnabled"
                checked={config.clientCachePrefetchEnabled}
                onCheckedChange={(checked) =>
                  handleChange("clientCachePrefetchEnabled", checked)
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientCacheTileLimit">瓦片预加载上限</Label>
                <Input
                  id="clientCacheTileLimit"
                  type="number"
                  value={config.clientCacheTileLimit}
                  onChange={(e) =>
                    handleChange("clientCacheTileLimit", Number(e.target.value))
                  }
                  disabled={!config.clientCachePrefetchEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCacheDefectLimit">缺陷小图预加载上限</Label>
                <Input
                  id="clientCacheDefectLimit"
                  type="number"
                  value={config.clientCacheDefectLimit}
                  onChange={(e) =>
                    handleChange("clientCacheDefectLimit", Number(e.target.value))
                  }
                  disabled={!config.clientCachePrefetchEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
