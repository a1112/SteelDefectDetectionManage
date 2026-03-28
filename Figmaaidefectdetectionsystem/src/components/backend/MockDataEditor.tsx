import { useEffect, useState } from "react";
import { Save, RotateCcw, Database, Plus, Trash2, Copy } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { toast } from "sonner@2.0.3";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getMockDataConfig, saveMockDataConfig } from "../../api/admin";

interface MockDataConfig {
  steelPlateCount: number;
  defectCountRange: [number, number];
  defectTypes: string[];
  severityDistribution: {
    critical: number;
    major: number;
    minor: number;
  };
  imageCount: number;
  autoGenerateInterval: number;
}

const defaultConfig: MockDataConfig = {
  steelPlateCount: 50,
  defectCountRange: [5, 30],
  defectTypes: ["划伤", "气泡", "裂纹", "夹杂", "氧化皮"],
  severityDistribution: {
    critical: 10,
    major: 30,
    minor: 60,
  },
  imageCount: 10,
  autoGenerateInterval: 0,
};

interface DefectTemplate {
  id: string;
  name: string;
  type: string;
  severity: "critical" | "major" | "minor";
  minSize: number;
  maxSize: number;
}

const defaultTemplates: DefectTemplate[] = [
  {
    id: "1",
    name: "深度划伤",
    type: "划伤",
    severity: "critical",
    minSize: 50,
    maxSize: 200,
  },
  {
    id: "2",
    name: "表面气泡",
    type: "气泡",
    severity: "minor",
    minSize: 10,
    maxSize: 40,
  },
  {
    id: "3",
    name: "边缘裂纹",
    type: "裂纹",
    severity: "major",
    minSize: 30,
    maxSize: 150,
  },
];

export const MockDataEditor: React.FC = () => {
  const [config, setConfig] = useState<MockDataConfig>(defaultConfig);
  const [templates, setTemplates] = useState<DefectTemplate[]>(defaultTemplates);
  const [hasChanges, setHasChanges] = useState(false);
  const [newDefectType, setNewDefectType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      try {
        const payload = await getMockDataConfig({
          config: defaultConfig,
          templates: defaultTemplates,
        });
        if (cancelled) return;
        setConfig(payload.config ?? defaultConfig);
        setTemplates(payload.templates ?? defaultTemplates);
        setHasChanges(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "加载测试数据配置失败";
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

  const handleConfigChange = <K extends keyof MockDataConfig>(
    key: K,
    value: MockDataConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMockDataConfig({ config, templates });
      toast.success("测试数据配置已保存");
      setHasChanges(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存测试数据配置失败";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("确定要重置为默认配置吗？")) {
      setConfig(defaultConfig);
      setTemplates(defaultTemplates);
      setHasChanges(true);
      toast.info("已重置为默认配置");
    }
  };

  const handleAddDefectType = () => {
    if (!newDefectType.trim()) {
      toast.error("请输入缺陷类型名称");
      return;
    }
    if (config.defectTypes.includes(newDefectType.trim())) {
      toast.error("该缺陷类型已存在");
      return;
    }
    handleConfigChange("defectTypes", [...config.defectTypes, newDefectType.trim()]);
    setNewDefectType("");
    toast.success("已添加缺陷类型");
  };

  const handleRemoveDefectType = (type: string) => {
    if (config.defectTypes.length <= 1) {
      toast.error("至少需要保留一个缺陷类型");
      return;
    }
    handleConfigChange(
      "defectTypes",
      config.defectTypes.filter((t) => t !== type)
    );
    toast.success("已删除缺陷类型");
  };

  const handleAddTemplate = () => {
    const newTemplate: DefectTemplate = {
      id: Date.now().toString(),
      name: "新缺陷模板",
      type: config.defectTypes[0],
      severity: "minor",
      minSize: 10,
      maxSize: 50,
    };
    setTemplates([...templates, newTemplate]);
    setHasChanges(true);
    toast.success("已添加缺陷模板");
  };

  const handleRemoveTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    setHasChanges(true);
    toast.success("已删除缺陷模板");
  };

  const handleTemplateChange = (
    id: string,
    field: keyof DefectTemplate,
    value: any
  ) => {
    setTemplates(
      templates.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    setHasChanges(true);
  };

  const handleGenerateNow = () => {
    toast.success("正在生成测试数据...", {
      description: `将生成 ${config.steelPlateCount} 条钢板记录`,
    });
  };

  const handleExportConfig = () => {
    const data = {
      config,
      templates,
      exportTime: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-data-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("配置已导出");
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载测试数据配置...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl">测试数据编辑器</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              配置开发模式下的 Mock 数据生成规则
            </p>
          </div>
        </div>
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
            variant="outline"
            onClick={handleExportConfig}
            size="sm"
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            导出配置
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基础配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="steelPlateCount">钢板记录数量</Label>
              <Input
                id="steelPlateCount"
                type="number"
                value={config.steelPlateCount}
                onChange={(e) =>
                  handleConfigChange("steelPlateCount", parseInt(e.target.value))
                }
                min={1}
                max={1000}
              />
              <div className="text-xs text-muted-foreground">
                生成的钢板记录总数（1-1000）
              </div>
            </div>

            <div className="space-y-2">
              <Label>每块钢板缺陷数量范围</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    value={config.defectCountRange[0]}
                    onChange={(e) =>
                      handleConfigChange("defectCountRange", [
                        parseInt(e.target.value),
                        config.defectCountRange[1],
                      ])
                    }
                    placeholder="最小值"
                    min={0}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    value={config.defectCountRange[1]}
                    onChange={(e) =>
                      handleConfigChange("defectCountRange", [
                        config.defectCountRange[0],
                        parseInt(e.target.value),
                      ])
                    }
                    placeholder="最大值"
                    min={0}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                每块钢板将随机生成 {config.defectCountRange[0]} 到{" "}
                {config.defectCountRange[1]} 个缺陷
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageCount">每面图像数量</Label>
              <Input
                id="imageCount"
                type="number"
                value={config.imageCount}
                onChange={(e) =>
                  handleConfigChange("imageCount", parseInt(e.target.value))
                }
                min={1}
                max={50}
              />
              <div className="text-xs text-muted-foreground">
                每个表面（上表/下表）的图像帧数（1-50）
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="autoGenerateInterval">
                自动生成间隔（秒）
              </Label>
              <Input
                id="autoGenerateInterval"
                type="number"
                value={config.autoGenerateInterval}
                onChange={(e) =>
                  handleConfigChange(
                    "autoGenerateInterval",
                    parseInt(e.target.value)
                  )
                }
                min={0}
                max={3600}
              />
              <div className="text-xs text-muted-foreground">
                设置为0表示禁用自动生成
              </div>
            </div>

            <Button onClick={handleGenerateNow} className="w-full">
              立即生成测试数据
            </Button>
          </CardContent>
        </Card>

        {/* 严重程度分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">严重程度分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground mb-4">
              配置生成的缺陷在各严重程度等级的百分比分布（总和应为100%）
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="critical" className="text-red-500">
                  严重缺陷 (Critical)
                </Label>
                <span className="text-sm font-medium">
                  {config.severityDistribution.critical}%
                </span>
              </div>
              <Input
                id="critical"
                type="range"
                min={0}
                max={100}
                value={config.severityDistribution.critical}
                onChange={(e) =>
                  handleConfigChange("severityDistribution", {
                    ...config.severityDistribution,
                    critical: parseInt(e.target.value),
                  })
                }
                className="accent-red-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="major" className="text-yellow-500">
                  主要缺陷 (Major)
                </Label>
                <span className="text-sm font-medium">
                  {config.severityDistribution.major}%
                </span>
              </div>
              <Input
                id="major"
                type="range"
                min={0}
                max={100}
                value={config.severityDistribution.major}
                onChange={(e) =>
                  handleConfigChange("severityDistribution", {
                    ...config.severityDistribution,
                    major: parseInt(e.target.value),
                  })
                }
                className="accent-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="minor" className="text-green-500">
                  次要缺陷 (Minor)
                </Label>
                <span className="text-sm font-medium">
                  {config.severityDistribution.minor}%
                </span>
              </div>
              <Input
                id="minor"
                type="range"
                min={0}
                max={100}
                value={config.severityDistribution.minor}
                onChange={(e) =>
                  handleConfigChange("severityDistribution", {
                    ...config.severityDistribution,
                    minor: parseInt(e.target.value),
                  })
                }
                className="accent-green-500"
              />
            </div>

            <div className="bg-muted/30 p-3 rounded mt-4">
              <div className="text-xs font-medium mb-2">当前分布总和:</div>
              <div className="text-2xl font-bold">
                {config.severityDistribution.critical +
                  config.severityDistribution.major +
                  config.severityDistribution.minor}
                %
              </div>
              {config.severityDistribution.critical +
                config.severityDistribution.major +
                config.severityDistribution.minor !==
                100 && (
                <div className="text-xs text-yellow-500 mt-1">
                  ⚠️ 总和应为 100%
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 缺陷类型管理 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">缺陷类型管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="输入新的缺陷类型名称"
                value={newDefectType}
                onChange={(e) => setNewDefectType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDefectType();
                }}
              />
              <Button onClick={handleAddDefectType} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                添加
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {config.defectTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border"
                >
                  <span className="text-sm">{type}</span>
                  <button
                    onClick={() => handleRemoveDefectType(type)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 缺陷模板 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">缺陷生成模板</CardTitle>
              <Button onClick={handleAddTemplate} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                添加模板
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <Label className="text-xs">模板名称</Label>
                    <Input
                      value={template.name}
                      onChange={(e) =>
                        handleTemplateChange(template.id, "name", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">缺陷类型</Label>
                    <Select
                      value={template.type}
                      onValueChange={(value) =>
                        handleTemplateChange(template.id, "type", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.defectTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">严重程度</Label>
                    <Select
                      value={template.severity}
                      onValueChange={(value: any) =>
                        handleTemplateChange(template.id, "severity", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">严重</SelectItem>
                        <SelectItem value="major">主要</SelectItem>
                        <SelectItem value="minor">次要</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">最小尺寸</Label>
                    <Input
                      type="number"
                      value={template.minSize}
                      onChange={(e) =>
                        handleTemplateChange(
                          template.id,
                          "minSize",
                          parseInt(e.target.value)
                        )
                      }
                      className="mt-1"
                      min={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">最大尺寸</Label>
                    <Input
                      type="number"
                      value={template.maxSize}
                      onChange={(e) =>
                        handleTemplateChange(
                          template.id,
                          "maxSize",
                          parseInt(e.target.value)
                        )
                      }
                      className="mt-1"
                      min={1}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveTemplate(template.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  暂无缺陷模板，点击"添加模板"创建
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};