/**
 * 传统工业风格配置（优化版）
 * 基于：系统设计与开发技术规范.pdf
 * 风格特点：
 * - 经典蓝色系主色调，更丰富的层次
 * - 精致的渐变和阴影效果
 * - 专业的工业界面设计
 * - 清晰的视觉层次
 */

import type { StylePreset } from "../types";
import { createColorValue } from "../colorUtils";

// ========== 传统工业 - 深邃蓝 ==========
export const traditionalDeepBlue: StylePreset = {
  id: "traditional-deep-blue",
  name: "深邃蓝工业",
  description: "专业深蓝工业界面，沉稳大气",
  category: "traditional",
  version: "1.0.0",
  mode: "traditional",
  theme: "dark",

  colors: {
    // 主色调 - 工业蓝
    primary: createColorValue("#2563EB"),
    primaryHover: createColorValue("#3B82F6"),
    primaryActive: createColorValue("#1D4ED8"),
    primaryForeground: createColorValue("#FFFFFF"),

    // 次要色
    secondary: createColorValue("#1E293B"),
    secondaryHover: createColorValue("#334155"),
    secondaryForeground: createColorValue("#F1F5F9"),

    // 强调色 - 科技紫
    accent: createColorValue("#8B5CF6"),
    accentHover: createColorValue("#A78BFA"),
    accentForeground: createColorValue("#FFFFFF"),

    // 语义色
    success: createColorValue("#10B981"),
    warning: createColorValue("#F59E0B"),
    error: createColorValue("#EF4444"),
    info: createColorValue("#3B82F6"),

    // 背景色系 - 深蓝渐变
    background: createColorValue("#0B1120"),
    backgroundElevated: createColorValue("#151E32"),
    backgroundSurface: createColorValue("#1E293B"),

    // 前景色系
    foreground: createColorValue("#E2E8F0"),
    foregroundMuted: createColorValue("#94A3B8"),
    foregroundDisabled: createColorValue("#475569"),

    // 边框色系
    border: createColorValue("#1E3A5F"),
    borderHover: createColorValue("#3B82F6"),
    borderFocus: createColorValue("#60A5FA"),

    // 组件色
    card: createColorValue("#151E32"),
    cardForeground: createColorValue("#E2E8F0"),
    popover: createColorValue("#151E32"),
    popoverForeground: createColorValue("#E2E8F0"),
    muted: createColorValue("#1E293B"),
    mutedForeground: createColorValue("#64748B"),

    // 图表色
    chart1: createColorValue("#3B82F6"),
    chart2: createColorValue("#10B981"),
    chart3: createColorValue("#F59E0B"),
    chart4: createColorValue("#8B5CF6"),
    chart5: createColorValue("#EF4444"),
  },

  defectColors: {
    crack: createColorValue("#DC2626"),       // 裂纹 - 深红
    inclusion: createColorValue("#EA580C"),   // 夹杂 - 深橙
    scratch: createColorValue("#D97706"),     // 划伤 - 琥珀
    pit: createColorValue("#059669"),         // 麻点 - 深绿
    dent: createColorValue("#0891B2"),        // 凹陷 - 青色
    rollMark: createColorValue("#2563EB"),    // 轧痕 - 蓝色
    scale: createColorValue("#7C3AED"),       // 氧化皮 - 紫色
    other: createColorValue("#6B7280"),       // 其他 - 灰色

    levelA: createColorValue("#10B981"),      // A级 - 绿色
    levelB: createColorValue("#3B82F6"),      // B级 - 蓝色
    levelC: createColorValue("#F59E0B"),      // C级 - 橙色
    levelD: createColorValue("#EF4444"),      // D级 - 红色
  },

  fonts: {
    fontFamilyBase: ['"Microsoft YaHei"', '"PingFang SC"', "Arial", "sans-serif"],
    fontFamilyMono: ['"Consolas"', '"JetBrains Mono"', "monospace"],
    fontFamilyDisplay: ['"Microsoft YaHei"', '"PingFang SC"', "Arial", "sans-serif"],

    fontSizeXs: "0.75rem",
    fontSizeSm: "0.875rem",
    fontSizeBase: "1rem",
    fontSizeLg: "1.125rem",
    fontSizeXl: "1.25rem",
    fontSize2Xl: "1.5rem",
    fontSize3Xl: "1.875rem",
    fontSize4Xl: "2.25rem",

    fontWeightLight: 300,
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightSemiBold: 600,
    fontWeightBold: 700,

    lineHeightTight: 1.25,
    lineHeightBase: 1.5,
    lineHeightRelaxed: 1.75,
  },

  spacing: {
    unit: 4,
    spacingXs: "0.25rem",
    spacingSm: "0.5rem",
    spacingMd: "1rem",
    spacingLg: "1.5rem",
    spacingXl: "2rem",
    spacing2Xl: "3rem",
    spacing3Xl: "4rem",
    spacing4Xl: "6rem",
  },

  radius: {
    radiusNone: "0",
    radiusSm: "4px",
    radiusMd: "6px",
    radiusLg: "8px",
    radiusXl: "12px",
    radiusFull: "9999px",
  },

  shadows: {
    shadowSm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
    shadowMd: "0 4px 12px rgba(0, 0, 0, 0.4)",
    shadowLg: "0 8px 24px rgba(0, 0, 0, 0.5)",
    shadowXl: "0 16px 48px rgba(0, 0, 0, 0.6)",
    shadow2Xl: "0 32px 64px rgba(0, 0, 0, 0.7)",
    shadowInner: "inset 0 2px 8px rgba(0, 0, 0, 0.4)",
    shadowGlow: "0 0 24px rgba(59, 130, 246, 0.4)",
    shadowInset: "inset 0 2px 8px rgba(0, 0, 0, 0.3)",
  },

  animations: {
    easeDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.6, 1)",
    easeBounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",

    durationFast: "150ms",
    durationBase: "250ms",
    durationSlow: "350ms",

    transitionBase: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
    transitionColors: "background-color 250ms cubic-bezier(0.4, 0, 0.2, 1), border-color 250ms cubic-bezier(0.4, 0, 0.2, 1)",
    transitionTransform: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  borders: {
    borderWidth: { thin: "1px", base: "1px", thick: "2px" },
    borderStyle: { solid: "solid", dashed: "dashed", dotted: "dotted" },
  },

  components: {
    button: { paddingX: "1rem", paddingY: "0.5rem", height: { sm: "2rem", md: "2.5rem", lg: "3rem" }, radius: "4px" },
    input: { paddingX: "0.75rem", paddingY: "0.5rem", height: "2.5rem", radius: "4px" },
    card: { padding: "1rem", radius: "6px", spacing: "1rem" },
    table: { cellPadding: "0.75rem 1rem", headerHeight: "3rem", rowHeight: "3rem", borderColor: "#1E3A5F" },
    navbar: { height: "3.5rem", paddingX: "1.5rem", background: "#151E32" },
    sidebar: { width: "16rem", collapsedWidth: "4rem", padding: "0.75rem" },
  },

  zIndex: { dropdown: 1000, sticky: 1020, fixed: 1030, modalBackdrop: 1040, modal: 1050, popover: 1060, tooltip: 1070, notification: 1080 },

  customCSSVars: {
    "--gradient-primary": "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
    "--gradient-surface": "linear-gradient(180deg, #151E32 0%, #0B1120 100%)",
    "--glow-primary": "0 0 20px rgba(37, 99, 235, 0.4)",
    "--grid-color": "rgba(59, 130, 246, 0.05)",
    "--grid-size": "32px",
  },
};

// ========== 传统工业 - 经典灰 ==========
export const traditionalClassicGray: StylePreset = {
  ...traditionalDeepBlue,
  id: "traditional-classic-gray",
  name: "经典工业灰",
  description: "中性灰色工业界面，专注内容",
  category: "traditional",
  version: "1.0.0",
  mode: "traditional",
  theme: "dark",

  colors: {
    ...traditionalDeepBlue.colors,
    // 主色调 - 青灰
    primary: createColorValue("#475569"),
    primaryHover: createColorValue("#64748B"),
    primaryActive: createColorValue("#334155"),
    primaryForeground: createColorValue("#FFFFFF"),

    // 强调色 - 蓝色作为点缀
    accent: createColorValue("#3B82F6"),
    accentHover: createColorValue("#60A5FA"),
    accentForeground: createColorValue("#FFFFFF"),

    // 背景色系 - 纯灰
    background: createColorValue("#0A0A0A"),
    backgroundElevated: createColorValue("#171717"),
    backgroundSurface: createColorValue("#262626"),

    // 次要色
    secondary: createColorValue("#262626"),
    secondaryHover: createColorValue("#404040"),
    secondaryForeground: createColorValue("#FAFAFA"),

    // 前景色系
    foreground: createColorValue("#E5E5E5"),
    foregroundMuted: createColorValue("#A3A3A3"),
    foregroundDisabled: createColorValue("#525252"),

    // 边框色系
    border: createColorValue("#262626"),
    borderHover: createColorValue("#404040"),
    borderFocus: createColorValue("#525252"),

    // 组件色
    card: createColorValue("#171717"),
    cardForeground: createColorValue("#E5E5E5"),
    popover: createColorValue("#171717"),
    popoverForeground: createColorValue("#E5E5E5"),
    muted: createColorValue("#262626"),
    mutedForeground: createColorValue("#737373"),
  },

  customCSSVars: {
    "--gradient-primary": "linear-gradient(135deg, #475569 0%, #334155 100%)",
    "--gradient-surface": "linear-gradient(180deg, #171717 0%, #0A0A0A 100%)",
    "--glow-primary": "0 0 16px rgba(71, 85, 105, 0.3)",
    "--grid-color": "rgba(255, 255, 255, 0.03)",
    "--grid-size": "32px",
  },
};

// ========== 传统工业 - 专业浅色 ==========
export const traditionalProLight: StylePreset = {
  ...traditionalDeepBlue,
  id: "traditional-pro-light",
  name: "专业浅色",
  description: "明亮清晰的工业界面，适合办公环境",
  category: "traditional",
  version: "1.0.0",
  mode: "traditional",
  theme: "light",

  colors: {
    // 主色调
    primary: createColorValue("#2563EB"),
    primaryHover: createColorValue("#3B82F6"),
    primaryActive: createColorValue("#1D4ED8"),
    primaryForeground: createColorValue("#FFFFFF"),

    // 次要色
    secondary: createColorValue("#F1F5F9"),
    secondaryHover: createColorValue("#E2E8F0"),
    secondaryForeground: createColorValue("#1E293B"),

    // 强调色
    accent: createColorValue("#8B5CF6"),
    accentHover: createColorValue("#A78BFA"),
    accentForeground: createColorValue("#FFFFFF"),

    // 语义色
    success: createColorValue("#10B981"),
    warning: createColorValue("#F59E0B"),
    error: createColorValue("#EF4444"),
    info: createColorValue("#3B82F6"),

    // 背景色系
    background: createColorValue("#F8FAFC"),
    backgroundElevated: createColorValue("#FFFFFF"),
    backgroundSurface: createColorValue("#F1F5F9"),

    // 前景色系
    foreground: createColorValue("#1E293B"),
    foregroundMuted: createColorValue("#64748B"),
    foregroundDisabled: createColorValue("#CBD5E1"),

    // 边框色系
    border: createColorValue("#E2E8F0"),
    borderHover: createColorValue("#CBD5E1"),
    borderFocus: createColorValue("#3B82F6"),

    // 组件色
    card: createColorValue("#FFFFFF"),
    cardForeground: createColorValue("#1E293B"),
    popover: createColorValue("#FFFFFF"),
    popoverForeground: createColorValue("#1E293B"),
    muted: createColorValue("#F1F5F9"),
    mutedForeground: createColorValue("#64748B"),

    // 图表色
    chart1: createColorValue("#3B82F6"),
    chart2: createColorValue("#10B981"),
    chart3: createColorValue("#F59E0B"),
    chart4: createColorValue("#8B5CF6"),
    chart5: createColorValue("#EF4444"),
  },

  defectColors: {
    crack: createColorValue("#DC2626"),
    inclusion: createColorValue("#EA580C"),
    scratch: createColorValue("#D97706"),
    pit: createColorValue("#059669"),
    dent: createColorValue("#0891B2"),
    rollMark: createColorValue("#2563EB"),
    scale: createColorValue("#7C3AED"),
    other: createColorValue("#94A3B8"),

    levelA: createColorValue("#10B981"),
    levelB: createColorValue("#3B82F6"),
    levelC: createColorValue("#F59E0B"),
    levelD: createColorValue("#EF4444"),
  },

  shadows: {
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    shadowMd: "0 4px 12px rgba(0, 0, 0, 0.08)",
    shadowLg: "0 8px 24px rgba(0, 0, 0, 0.12)",
    shadowXl: "0 16px 48px rgba(0, 0, 0, 0.15)",
    shadow2Xl: "0 32px 64px rgba(0, 0, 0, 0.18)",
    shadowInner: "inset 0 2px 8px rgba(0, 0, 0, 0.04)",
    shadowGlow: "0 0 24px rgba(37, 99, 235, 0.15)",
    shadowInset: "inset 0 2px 8px rgba(0, 0, 0, 0.03)",
  },

  components: {
    ...traditionalDeepBlue.components,
    navbar: { height: "3.5rem", paddingX: "1.5rem", background: "#FFFFFF" },
  },

  customCSSVars: {
    "--gradient-primary": "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
    "--gradient-surface": "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)",
    "--glow-primary": "0 0 16px rgba(37, 99, 235, 0.15)",
    "--grid-color": "rgba(0, 0, 0, 0.03)",
    "--grid-size": "32px",
  },
};

// ========== 传统工业 - 钢铁蓝 ==========
export const traditionalSteelBlue: StylePreset = {
  ...traditionalDeepBlue,
  id: "traditional-steel-blue",
  name: "钢铁蓝",
  description: "冷色调钢铁风格，硬朗专业",
  category: "traditional",
  version: "1.0.0",
  mode: "traditional",
  theme: "dark",

  colors: {
    ...traditionalDeepBlue.colors,
    // 主色调 - 冷钢蓝
    primary: createColorValue("#0EA5E9"),
    primaryHover: createColorValue("#38BDF8"),
    primaryActive: createColorValue("#0284C7"),
    primaryForeground: createColorValue("#FFFFFF"),

    // 强调色 - 青色
    accent: createColorValue("#06B6D4"),
    accentHover: createColorValue("#22D3EE"),
    accentForeground: createColorValue("#0A0A0A"),

    // 背景色系 - 冷深蓝
    background: createColorValue("#082F49"),
    backgroundElevated: createColorValue("#0C4A6E"),
    backgroundSurface: createColorValue("#075985"),

    // 次要色
    secondary: createColorValue("#164E63"),
    secondaryHover: createColorValue("#155E75"),
    secondaryForeground: createColorValue("#ECFEFF"),

    // 前景色系
    foreground: createColorValue("#F0F9FF"),
    foregroundMuted: createColorValue("#7DD3FC"),
    foregroundDisabled: createColorValue("#0E7490"),

    // 边框色系
    border: createColorValue("#155E75"),
    borderHover: createColorValue("#0E7490"),
    borderFocus: createColorValue("#0EA5E9"),

    // 组件色
    card: createColorValue("#0C4A6E"),
    cardForeground: createColorValue("#F0F9FF"),
    popover: createColorValue("#0C4A6E"),
    popoverForeground: createColorValue("#F0F9FF"),
    muted: createColorValue("#075985"),
    mutedForeground: createColorValue("#67E8F9"),
  },

  customCSSVars: {
    "--gradient-primary": "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
    "--gradient-surface": "linear-gradient(180deg, #0C4A6E 0%, #082F49 100%)",
    "--glow-primary": "0 0 24px rgba(14, 165, 233, 0.4)",
    "--grid-color": "rgba(125, 211, 252, 0.08)",
    "--grid-size": "32px",
  },
};

// 导出所有传统风格预设
export const traditionalPresets: StylePreset[] = [
  traditionalDeepBlue,
  traditionalClassicGray,
  traditionalProLight,
  traditionalSteelBlue,
];
