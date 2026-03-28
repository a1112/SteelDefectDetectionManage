import React, { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  Rows3,
  Columns3,
  Palette,
} from "lucide-react";
import { ModeSwitch } from "../ModeSwitch";
import type {
  ActiveTab,
  ImageOrientation,
} from "../../types/app.types";
import { env } from "../../config/env";
import type { ApiNode } from "../../api/types";
import { useTheme, themePresets } from "../ThemeContext";
import { Button } from "../ui/button";

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
  const { currentTheme, applyTheme, applyThemeById } = useTheme();
  
  const theme = currentTheme.colors.background === "#ffffff" ? "light" : "dark";

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
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
            <select
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-sm focus:outline-none focus:border-primary"
              value={lineName || ""}
              onChange={(event) => onLineChange?.(event.target.value)}
            >
              {apiNodes.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.name} ({node.key})
                </option>
              ))}
            </select>
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
              <select
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-sm focus:outline-none focus:border-primary"
                value={imageScale}
                onChange={(event) => handleImageScaleChange(Number(event.target.value))}
              >
                <option value={1}>100%</option>
                <option value={0.75}>75%</option>
                <option value={0.5}>50%</option>
                <option value={0.25}>25%</option>
              </select>
            </div>
          </div>
        )}
        {/* Theme Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                COLOR THEME / 配色主题
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                当前主题: {currentTheme.name}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {themePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyTheme(preset)}
                className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                  currentTheme.id === preset.id
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${preset.colors.background} 0%, ${preset.colors.muted} 100%)`,
                }}
                title={preset.description}
              >
                <div className="flex gap-1 mb-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.colors.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.colors.accent }}
                  />
                </div>
                <div
                  className="text-[10px] font-medium"
                  style={{ color: preset.colors.foreground }}
                >
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-2">
            当前支持 {themePresets.length} 种精选工业风格
          </div>
        </div>

        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            配色方案 / 明暗模式
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
            <button
              onClick={() => applyThemeById("business-light")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                theme === "light"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              浅色
            </button>
            <button
              onClick={() => applyThemeById("industrial-blue")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              深色
            </button>
          </div>
        </div>

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
