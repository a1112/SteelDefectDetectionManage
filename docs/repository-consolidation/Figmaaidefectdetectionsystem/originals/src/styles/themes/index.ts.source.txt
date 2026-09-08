/**
 * 风格系统主入口
 * 整合所有风格预设
 */

export * from "./types";
export * from "./colorUtils";

export { traditionalPresets } from "./traditional";
export { modernPresets } from "./modern";

import { traditionalPresets } from "./traditional";
import { modernPresets } from "./modern";
import type { StylePreset, AppMode } from "./types";

/**
 * 所有风格预设
 */
export const allPresets: StylePreset[] = [
  ...traditionalPresets,
  ...modernPresets,
];

/**
 * 获取指定模式的风格预设
 */
export function getPresetsByMode(mode: AppMode): StylePreset[] {
  return allPresets.filter(preset => preset.mode === mode);
}

/**
 * 根据ID获取风格预设
 */
export function getPresetById(id: string): StylePreset | undefined {
  return allPresets.find(preset => preset.id === id);
}

/**
 * 获取默认风格预设（传统模式）
 */
export function getDefaultTraditionalPreset(): StylePreset {
  return traditionalPresets[0]; // traditional-dark
}

/**
 * 获取默认风格预设（现代模式）
 */
export function getDefaultModernPreset(): StylePreset {
  return modernPresets[0]; // modern-deep-space
}

/**
 * 风格预设名称映射（用于显示）
 */
export const presetNames: Record<string, string> = {
  "traditional-dark": "传统工业深色",
  "traditional-light": "传统工业浅色",
  "traditional-blue": "传统蓝色专业版",
  "modern-deep-space": "深空黑科技",
  "modern-cyberpunk": "赛博朋克",
  "modern-industrial": "现代深蓝工业",
  "modern-glass-light": "现代玻璃浅色",
};

/**
 * 应用风格预设到CSS变量
 */
export function applyPresetToCSS(preset: StylePreset): void {
  const root = document.documentElement;
  const c = preset.colors;

  // 基础颜色变量 - 使用HSL格式
  root.style.setProperty("--background", c.background.hsl);
  root.style.setProperty("--foreground", c.foreground.hsl);
  root.style.setProperty("--primary", c.primary.hsl);
  root.style.setProperty("--primary-foreground", c.primaryForeground.hsl);
  root.style.setProperty("--secondary", c.secondary.hsl);
  root.style.setProperty("--secondary-foreground", c.secondaryForeground.hsl);
  root.style.setProperty("--accent", c.accent.hsl);
  root.style.setProperty("--accent-foreground", c.accentForeground.hsl);
  root.style.setProperty("--muted", c.muted.hsl);
  root.style.setProperty("--muted-foreground", c.mutedForeground.hsl);
  root.style.setProperty("--destructive", c.error.hsl);
  root.style.setProperty("--destructive-foreground", "#ffffff");
  root.style.setProperty("--border", c.border.hsl);
  root.style.setProperty("--input", c.border.hsl);
  root.style.setProperty("--ring", c.borderFocus.hsl);
  root.style.setProperty("--card", c.card.hsl);
  root.style.setProperty("--card-foreground", c.cardForeground.hsl);
  root.style.setProperty("--popover", c.popover.hsl);
  root.style.setProperty("--popover-foreground", c.popoverForeground.hsl);

  // 图表颜色
  root.style.setProperty("--chart-1", c.chart1.hsl);
  root.style.setProperty("--chart-2", c.chart2.hsl);
  root.style.setProperty("--chart-3", c.chart3.hsl);
  root.style.setProperty("--chart-4", c.chart4.hsl);
  root.style.setProperty("--chart-5", c.chart5.hsl);

  // 缺陷颜色
  const dc = preset.defectColors;
  root.style.setProperty("--defect-crack", dc.crack.hex);
  root.style.setProperty("--defect-inclusion", dc.inclusion.hex);
  root.style.setProperty("--defect-scratch", dc.scratch.hex);
  root.style.setProperty("--defect-pit", dc.pit.hex);
  root.style.setProperty("--defect-dent", dc.dent.hex);
  root.style.setProperty("--defect-rollMark", dc.rollMark.hex);
  root.style.setProperty("--defect-scale", dc.scale.hex);
  root.style.setProperty("--defect-other", dc.other.hex);

  // 等级颜色
  root.style.setProperty("--level-a", dc.levelA.hex);
  root.style.setProperty("--level-b", dc.levelB.hex);
  root.style.setProperty("--level-c", dc.levelC.hex);
  root.style.setProperty("--level-d", dc.levelD.hex);

  // 圆角
  root.style.setProperty("--radius", preset.radius.radiusMd);

  // 自定义CSS变量
  if (preset.customCSSVars) {
    Object.entries(preset.customCSSVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // 设置dark class
  if (preset.theme === "dark" || (preset.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // 调试日志
  console.log(`[StyleSystem] 应用风格: ${preset.name}`, {
    primary: c.primary.hex,
    background: c.background.hex,
    accent: c.accent.hex,
    border: c.border.hex,
  });
}

/**
 * 存储键名
 */
const STORAGE_KEY = "style_system_preset";
const USER_PRESETS_KEY = "style_system_user_presets";

/**
 * 从localStorage获取保存的风格预设ID
 */
export function getSavedPresetId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 保存风格预设ID到localStorage
 */
export function savePresetId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    console.warn("Failed to save preset ID:", e);
  }
}

/**
 * 获取用户自定义风格预设
 */
export function getUserPresets(): StylePreset[] {
  try {
    const data = localStorage.getItem(USER_PRESETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 保存用户自定义风格预设
 */
export function saveUserPreset(preset: StylePreset): void {
  try {
    const presets = getUserPresets();
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn("Failed to save user preset:", e);
  }
}

/**
 * 删除用户自定义风格预设
 */
export function deleteUserPreset(id: string): void {
  try {
    const presets = getUserPresets().filter(p => p.id !== id);
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn("Failed to delete user preset:", e);
  }
}
