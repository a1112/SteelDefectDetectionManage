/**
 * ThemeContext - 主题上下文提供者
 * 集成新的风格系统，同时保持向后兼容性
 */

import { createContext, useContext, ReactNode } from "react";
import { StyleSystemProvider, useStyleSystem as useStyleSystemInternal } from "@/components/StyleSystemProvider";

// ========== 保留旧版接口以保持兼容性 ==========

/**
 * @deprecated 使用 StylePreset 代替
 */
export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

/**
 * @deprecated 使用 StylePreset 代替
 */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

/**
 * @deprecated 使用 newStylePresets 代替
 */
export const themePresets: ThemePreset[] = [
  {
    id: "industrial-blue",
    name: "工业深蓝",
    description: "经典工业界面，专业稳重",
    colors: {
      primary: "#3b82f6",
      accent: "#8b5cf6",
      background: "#0a0a0a",
      foreground: "#ffffff",
      muted: "#1a1a1a",
      border: "#2a2a2a",
    },
  },
  {
    id: "midnight-dark",
    name: "科技暗夜",
    description: "高对比度纯黑，极简高效",
    colors: {
      primary: "#60a5fa",
      accent: "#a78bfa",
      background: "#000000",
      foreground: "#e5e5e5",
      muted: "#0f0f0f",
      border: "#1f1f1f",
    },
  },
  {
    id: "forest-dark",
    name: "深林绿意",
    description: "护眼绿色调，自然舒适",
    colors: {
      primary: "#10b981",
      accent: "#34d399",
      background: "#05100a",
      foreground: "#ecfdf5",
      muted: "#064e3b",
      border: "#065f46",
    },
  },
  {
    id: "amber-alert",
    name: "工业警示",
    description: "醒目橙色，强化注意力",
    colors: {
      primary: "#f59e0b",
      accent: "#fbbf24",
      background: "#1a1005",
      foreground: "#fffbeb",
      muted: "#451a03",
      border: "#78350f",
    },
  },
  {
    id: "cyber-neon",
    name: "赛博霓虹",
    description: "未来主义风格，鲜艳动感",
    colors: {
      primary: "#d946ef",
      accent: "#f472b6",
      background: "#120a18",
      foreground: "#fdf4ff",
      muted: "#4a044e",
      border: "#701a75",
    },
  },
  {
    id: "steel-gray",
    name: "高级灰",
    description: "中性灰色调，低调沉稳",
    colors: {
      primary: "#94a3b8",
      accent: "#cbd5e1",
      background: "#18181b",
      foreground: "#f8fafc",
      muted: "#27272a",
      border: "#3f3f46",
    },
  },
  {
    id: "business-light",
    name: "简约浅色",
    description: "明亮清晰，适合办公环境",
    colors: {
      primary: "#2563eb",
      accent: "#7c3aed",
      background: "#ffffff",
      foreground: "#0a0a0a",
      muted: "#f5f5f5",
      border: "#e5e5e5",
    },
  },
];

interface LegacyThemeContextType {
  currentTheme: ThemePreset;
  applyTheme: (preset: ThemePreset) => void;
  applyThemeById: (id: string) => void;
}

const LegacyThemeContext = createContext<LegacyThemeContextType | undefined>(undefined);

/**
 * @deprecated 使用 useStyleSystem 代替
 * 向后兼容的 useTheme hook，直接使用新的风格系统
 */
export const useTheme = () => {
  // 直接使用新的风格系统，不需要额外的 context
  const { activePreset, applyPreset } = useStyleSystemInternal();

  // 将新风格系统转换为旧接口
  const currentTheme: ThemePreset = {
    id: activePreset.id,
    name: activePreset.name,
    description: activePreset.description,
    colors: {
      primary: activePreset.colors.primary.hex,
      accent: activePreset.colors.accent.hex,
      background: activePreset.colors.background.hex,
      foreground: activePreset.colors.foreground.hex,
      muted: activePreset.colors.muted.hex,
      border: activePreset.colors.border.hex,
    },
  };

  const applyTheme = (preset: ThemePreset) => {
    applyPreset(preset.id);
  };

  const applyThemeById = (id: string) => {
    applyPreset(id);
  };

  return { currentTheme, applyTheme, applyThemeById };
};

/**
 * ThemeProvider - 主入口
 * 直接使用 StyleSystemProvider
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return <StyleSystemProvider>{children}</StyleSystemProvider>;
};

// 导出新的风格系统
export { StyleSystemProvider, useStyleSystem, useAppMode } from "@/components/StyleSystemProvider";
export type { StylePreset, AppMode } from "@/styles/themes/types";
export { presetNames, getPresetsByMode } from "@/styles/themes";
