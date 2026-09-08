import React, { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  Rows3,
  Columns3,
  Palette,
  Monitor,
} from "lucide-react";
import { ModeSwitch } from "../ModeSwitch";
import type {
  ActiveTab,
  ImageOrientation,
} from "../../types/app.types";
import { env } from "../../config/env";
import type { ApiNode } from "../../api/types";
import { useStyleSystem, useAppMode } from "@/components/StyleSystemProvider";
import { Button } from "../ui/button";
import { StyleSelector } from "../StyleSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface SettingsPageProps {
  imageOrientation: ImageOrientation;
  setImageOrientation: (value: ImageOrientation) => void;
  apiNodes: ApiNode[];
  lineName: string;
  onLineChange: (key: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  imageOrientation,
  setImageOrientation,
  apiNodes,
  lineName,
  onLineChange,
}) => {
  const [imageScale, setImageScale] = useState(env.getImageScale());
  const [mode, setMode] = useState(env.getMode());
  const [corsBaseUrl, setCorsBaseUrl] = useState(env.getCorsBaseUrl());
  const { activePreset, applyPreset, traditionalPresets, modernPresets } = useStyleSystem();
  const { mode: appMode, setMode: setAppMode } = useAppMode();

  const activeNode =
    apiNodes.find((node) => node.key === lineName) ?? apiNodes[0];

  useEffect(() => {
    const handleModeChange = (e: CustomEvent) => {
      setMode(e.detail);
    };
    const handleCorsBaseUrlChange = (e: CustomEvent) => {
      setCorsBaseUrl(e.detail || "");
    };
    const handleImageScaleChange = (e: CustomEvent) => {
      setImageScale(Number(e.detail));
    };
    window.addEventListener(
      "app_mode_change",
      handleModeChange as EventListener,
    );
    window.addEventListener(
      "cors_base_url_change",
      handleCorsBaseUrlChange as EventListener,
    );
    window.addEventListener(
      "image_scale_change",
      handleImageScaleChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "app_mode_change",
        handleModeChange as EventListener,
      );
      window.removeEventListener(
        "cors_base_url_change",
        handleCorsBaseUrlChange as EventListener,
      );
      window.removeEventListener(
        "image_scale_change",
        handleImageScaleChange as EventListener,
      );
    };
  }, []);

  const handleImageScaleChange = (scale: number) => {
    if (scale === imageScale) return;
    env.setImageScale(scale);
    setImageScale(scale);
  };

  // 获取当前模式的预设列表
  const currentPresets = appMode === "modern" ? modernPresets : traditionalPresets;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium">
          系统配置
        </h3>
        <p className="text-sm text-muted-foreground">
          管理检测参数与设备设置
        </p>
      </div>

      {/* API 模式切换 */}
      <ModeSwitch />

      <div className="space-y-4">
        {/* 风格系统设置 */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                风格系统 / Style System
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                基于设计规范的专业风格系统，支持传统/现代化模式切换
              </div>
            </div>
          </div>

          {/* 应用模式切换 */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">应用模式</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAppMode("traditional")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  appMode === "traditional"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border hover:border-primary"
                }`}
              >
                传统模式
              </button>
              <button
                onClick={() => setAppMode("modern")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  appMode === "modern"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border hover:border-primary"
                }`}
              >
                现代化模式
              </button>
            </div>
          </div>

          {/* 风格选择器 */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {appMode === "traditional" ? "传统模式风格" : "现代化模式风格"} · 当前: {activePreset.name}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {currentPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    activePreset.id === preset.id
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.background.hex} 0%, ${preset.colors.muted.hex} 100%)`,
                  }}
                  title={preset.description}
                >
                  <div className="flex gap-1 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.colors.primary.hex }}
                    />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.colors.accent.hex }}
                    />
                  </div>
                  <div
                    className="text-[10px] font-medium truncate"
                    style={{ color: preset.colors.foreground.hex }}
                  >
                    {preset.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  CORS / 跨域地址
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  输入远程服务器地址，自动追加 /api
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-sm focus:outline-none focus:border-primary"
                value={corsBaseUrl}
                onChange={(event) =>
                  setCorsBaseUrl(event.target.value)
                }
                onBlur={() => env.setCorsBaseUrl(corsBaseUrl)}
                placeholder="http://9qwygl8e.zjz-service.cn:80"
              />
              <button
                type="button"
                className="px-3 py-2 text-xs border border-border rounded-sm hover:bg-accent transition-colors"
                onClick={() => env.setCorsBaseUrl(corsBaseUrl)}
              >
                应用
              </button>
            </div>
          </div>
        {mode === "production" && apiNodes && apiNodes.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  LINE / 产线切换
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  选择产线后将通过 /产线/api 访问后端
                </div>
              </div>
            </div>
            <Select value={lineName || ""} onValueChange={onLineChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择产线" />
              </SelectTrigger>
              <SelectContent>
                {apiNodes.map((node) => (
                  <SelectItem key={node.key} value={node.key}>
                    {node.name} ({node.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mode === "production" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Image Scale</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Output scale for tile/defect/frame images
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Select value={String(imageScale)} onValueChange={(v) => handleImageScaleChange(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">100%</SelectItem>
                  <SelectItem value="0.75">75%</SelectItem>
                  <SelectItem value="0.5">50%</SelectItem>
                  <SelectItem value="0.25">25%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            IMAGE ORIENTATION / 图像方向
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
            <button
              onClick={() => setImageOrientation("horizontal")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                imageOrientation === "horizontal"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              横向
            </button>
            <button
              onClick={() => setImageOrientation("vertical")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                imageOrientation === "vertical"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              纵向
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            检测阈值
          </label>
          <input
            type="range"
            className="w-full accent-primary"
          />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            相机曝光
          </label>
          <input
            type="range"
            className="w-full accent-primary"
          />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            自动存档日志
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked
              readOnly
              className="accent-primary w-4 h-4"
            />
            <span className="text-sm text-muted-foreground">
              已开启
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end gap-2">
        <button className="px-4 py-2 border border-border hover:bg-accent text-sm transition-colors">
          重置
        </button>
        <button className="px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          保存更改
        </button>
      </div>
    </div>
  );
};
