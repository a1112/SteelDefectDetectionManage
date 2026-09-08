/**
 * 现代化工业科技风格配置（优化版）
 * 基于：衡钢特大口径无缝钢管智能制造平台设计规范
 * 风格特点：
 * - 深色科技感主题
 * - 霓虹发光效果
 * - 玻璃态 (Glassmorphism) 设计
 * - 渐变背景
 * - 流畅动画
 * - 未来主义视觉效果
 */

import type { StylePreset } from "../types";
import { createColorValue } from "../colorUtils";

// ========== 现代科技 - 深空黑 ==========
export const modernDeepSpace: StylePreset = {
  id: "modern-deep-space",
  name: "深空黑科技",
  description: "极致深黑主题，高对比度，强调内容",
  category: "modern",
  version: "1.0.0",
  mode: "modern",
  theme: "dark",

  colors: {
    // 主色调 - 科技青
    primary: createColorValue("#00F0FF"),
    primaryHover: createColorValue("#6FFFFF"),
    primaryActive: createColorValue("#00C8D6"),
    primaryForeground: createColorValue("#000000"),

    // 次要色
    secondary: createColorValue("#0D1117"),
    secondaryHover: createColorValue("#161B22"),
    secondaryForeground: createColorValue("#E6EDF3"),

    // 强调色 - 赛博紫
    accent: createColorValue("#B026FF"),
    accentHover: createColorValue("#C559FF"),
    accentForeground: createColorValue("#FFFFFF"),

    // 语义色 - 霓虹风格
    success: createColorValue("#00FF94"),
    warning: createColorValue("#FFD700"),
    error: createColorValue("#FF2A6D"),
    info: createColorValue("#00F0FF"),

    // 背景色系 - 纯黑系列
    background: createColorValue("#000000"),
    backgroundElevated: createColorValue("#0A0A0A"),
    backgroundSurface: createColorValue("#111111"),

    // 前景色系
    foreground: createColorValue("#F0F0F0"),
    foregroundMuted: createColorValue("#888888"),
    foregroundDisabled: createColorValue("#444444"),

    // 边框色系
    border: createColorValue("#222222"),
    borderHover: createColorValue("#333333"),
    borderFocus: createColorValue("#00F0FF"),

    // 组件色
    card: createColorValue("#0A0A0A"),
    cardForeground: createColorValue("#F0F0F0"),
    popover: createColorValue("#0A0A0A"),
    popoverForeground: createColorValue("#F0F0F0"),
    muted: createColorValue("#111111"),
    mutedForeground: createColorValue("#666666"),

    // 图表色 - 霓虹系列
    chart1: createColorValue("#00F0FF"),
    chart2: createColorValue("#00FF94"),
    chart3: createColorValue("#FFD700"),
    chart4: createColorValue("#B026FF"),
    chart5: createColorValue("#FF2A6D"),
  },

  defectColors: {
    crack: createColorValue("#FF2A6D"),
    inclusion: createColorValue("#FFD700"),
    scratch: createColorValue("#00FF94"),
    pit: createColorValue("#00F0FF"),
    dent: createColorValue("#B026FF"),
    rollMark: createColorValue("#FF6B35"),
    scale: createColorValue("#7B61FF"),
    other: createColorValue("#666666"),

    levelA: createColorValue("#00FF94"),
    levelB: createColorValue("#00F0FF"),
    levelC: createColorValue("#FFD700"),
    levelD: createColorValue("#FF2A6D"),
  },

  fonts: {
    fontFamilyBase: ['"Inter"', '"SF Pro Display"', '"Microsoft YaHei"', "sans-serif"],
    fontFamilyMono: ['"JetBrains Mono"', '"Fira Code"', '"Consolas"', "monospace"],
    fontFamilyDisplay: ['"Inter"', '"SF Pro Display"', '"Microsoft YaHei"', "sans-serif"],

    fontSizeXs: "0.75rem",
    fontSizeSm: "0.875rem",
    fontSizeBase: "1rem",
    fontSizeLg: "1.125rem",
    fontSizeXl: "1.25rem",
    fontSize2Xl: "1.5rem",
    fontSize3Xl: "2rem",
    fontSize4Xl: "2.5rem",

    fontWeightLight: 300,
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightSemiBold: 600,
    fontWeightBold: 700,

    lineHeightTight: 1.2,
    lineHeightBase: 1.6,
    lineHeightRelaxed: 1.8,
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
    radiusMd: "8px",
    radiusLg: "12px",
    radiusXl: "16px",
    radiusFull: "9999px",
  },

  shadows: {
    shadowSm: "0 2px 4px rgba(0, 0, 0, 0.3)",
    shadowMd: "0 4px 12px rgba(0, 0, 0, 0.4)",
    shadowLg: "0 8px 24px rgba(0, 0, 0, 0.5)",
    shadowXl: "0 16px 48px rgba(0, 0, 0, 0.6)",
    shadow2Xl: "0 32px 64px rgba(0, 0, 0, 0.7)",
    shadowInner: "inset 0 2px 8px rgba(0, 0, 0, 0.5)",
    shadowGlow: "0 0 30px rgba(0, 240, 255, 0.5), 0 0 60px rgba(0, 240, 255, 0.3)",
    shadowInset: "inset 0 2px 8px rgba(0, 0, 0, 0.4)",
  },

  animations: {
    easeDefault: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    easeIn: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    easeOut: "cubic-bezier(0.215, 0.61, 0.355, 1)",
    easeInOut: "cubic-bezier(0.645, 0.045, 0.355, 1)",
    easeBounce: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",

    durationFast: "200ms",
    durationBase: "300ms",
    durationSlow: "500ms",

    transitionBase: "all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    transitionColors: "background-color 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    transitionTransform: "transform 300ms cubic-bezier(0.215, 0.61, 0.355, 1)",
  },

  borders: {
    borderWidth: { thin: "1px", base: "1.5px", thick: "2px" },
    borderStyle: { solid: "solid", dashed: "dashed", dotted: "dotted" },
  },

  components: {
    button: { paddingX: "1.25rem", paddingY: "0.625rem", height: { sm: "2.25rem", md: "2.75rem", lg: "3.25rem" }, radius: "8px" },
    input: { paddingX: "1rem", paddingY: "0.625rem", height: "2.75rem", radius: "8px" },
    card: { padding: "1.5rem", radius: "12px", spacing: "1.5rem" },
    table: { cellPadding: "1rem 1.25rem", headerHeight: "3.5rem", rowHeight: "3.5rem", borderColor: "#222222" },
    navbar: { height: "4rem", paddingX: "2rem", background: "rgba(0, 0, 0, 0.8)" },
    sidebar: { width: "18rem", collapsedWidth: "5rem", padding: "1rem" },
  },

  zIndex: { dropdown: 1000, sticky: 1020, fixed: 1030, modalBackdrop: 1040, modal: 1050, popover: 1060, tooltip: 1070, notification: 1080 },

  customCSSVars: {
    "--glass-bg": "rgba(10, 10, 10, 0.6)",
    "--glass-border": "rgba(255, 255, 255, 0.1)",
    "--glass-shadow": "0 8px 32px rgba(0, 0, 0, 0.4)",
    "--gradient-primary": "linear-gradient(135deg, #00F0FF 0%, #0066FF 100%)",
    "--gradient-accent": "linear-gradient(135deg, #B026FF 0%, #6B21FF 100%)",
    "--gradient-success": "linear-gradient(135deg, #00FF94 0%, #00CC7A 100%)",
    "--gradient-error": "linear-gradient(135deg, #FF2A6D 0%, #CC2256 100%)",
    "--glow-primary": "0 0 20px rgba(0, 240, 255, 0.5)",
    "--glow-accent": "0 0 20px rgba(176, 38, 255, 0.5)",
    "--grid-color": "rgba(255, 255, 255, 0.03)",
    "--grid-size": "40px",
  },

  globalStyles: `
    .tech-grid-bg {
      background-image:
        linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
        linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
      background-size: var(--grid-size) var(--grid-size);
    }
    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
    }
    .neon-border {
      border: 1px solid transparent;
      background-clip: padding-box;
      position: relative;
    }
    .neon-border::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(135deg, #00F0FF, #B026FF);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }
    .glow-text {
      text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
    }
    @keyframes scanline {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    .scanline-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 9999;
      background: linear-gradient(to bottom, transparent 0%, rgba(0, 240, 255, 0.03) 50%, transparent 100%);
      animation: scanline 8s linear infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 5px rgba(0, 240, 255, 0.5); }
      50% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(0, 240, 255, 0.4); }
    }
    .pulse-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }
  `,
};

// ========== 现代科技 - 赛博朋克 ==========
export const modernCyberpunk: StylePreset = {
  ...modernDeepSpace,
  id: "modern-cyberpunk",
  name: "赛博朋克",
  description: "霓虹配色，赛博朋克风格，强烈的视觉冲击",
  category: "modern",
  version: "1.0.0",
  mode: "modern",
  theme: "dark",

  colors: {
    ...modernDeepSpace.colors,
    // 赛博朋克配色 - 粉紫为主
    primary: createColorValue("#FF2A6D"),
    primaryHover: createColorValue("#FF5C8D"),
    primaryActive: createColorValue("#CC2256"),
    primaryForeground: createColorValue("#FFFFFF"),

    accent: createColorValue("#00F0FF"),
    accentHover: createColorValue("#6FFFFF"),
    accentForeground: createColorValue("#000000"),

    background: createColorValue("#0D0221"),
    backgroundElevated: createColorValue("#1A0A2E"),
    backgroundSurface: createColorValue("#2D1B4E"),
    card: createColorValue("#1A0A2E"),
    popover: createColorValue("#1A0A2E"),
  },

  defectColors: {
    crack: createColorValue("#FF2A6D"),
    inclusion: createColorValue("#00F0FF"),
    scratch: createColorValue("#FFE600"),
    pit: createColorValue("#B026FF"),
    dent: createColorValue("#FF6B35"),
    rollMark: createColorValue("#00FF94"),
    scale: createColorValue("#FF006E"),
    other: createColorValue("#666666"),

    levelA: createColorValue("#00FF94"),
    levelB: createColorValue("#00F0FF"),
    levelC: createColorValue("#FFE600"),
    levelD: createColorValue("#FF2A6D"),
  },

  customCSSVars: {
    ...modernDeepSpace.customCSSVars!,
    "--gradient-primary": "linear-gradient(135deg, #FF2A6D 0%, #FF6B35 100%)",
    "--gradient-accent": "linear-gradient(135deg, #00F0FF 0%, #B026FF 100%)",
    "--glow-primary": "0 0 20px rgba(255, 42, 109, 0.6)",
    "--glow-accent": "0 0 20px rgba(0, 240, 255, 0.5)",
  },
};

// ========== 现代科技 - 深蓝工业 ==========
export const modernIndustrial: StylePreset = {
  ...modernDeepSpace,
  id: "modern-industrial",
  name: "现代深蓝工业",
  description: "深蓝色系，现代工业风，专业稳重",
  category: "modern",
  version: "1.0.0",
  mode: "modern",
  theme: "dark",

  colors: {
    // 主色调 - 深蓝
    primary: createColorValue("#2979FF"),
    primaryHover: createColorValue("#5393FF"),
    primaryActive: createColorValue("#2161CC"),
    primaryForeground: createColorValue("#FFFFFF"),

    secondary: createColorValue("#0A1929"),
    secondaryHover: createColorValue("#132742"),
    secondaryForeground: createColorValue("#E3F2FD"),

    accent: createColorValue("#00E5FF"),
    accentHover: createColorValue("#33EBFF"),
    accentForeground: createColorValue("#000000"),

    success: createColorValue("#00C853"),
    warning: createColorValue("#FFAB00"),
    error: createColorValue("#FF3D00"),
    info: createColorValue("#2979FF"),

    background: createColorValue("#05101A"),
    backgroundElevated: createColorValue("#0A1929"),
    backgroundSurface: createColorValue("#132742"),

    foreground: createColorValue("#E3F2FD"),
    foregroundMuted: createColorValue("#90CAF9"),
    foregroundDisabled: createColorValue("#42A5F5"),

    border: createColorValue("#1A3A5C"),
    borderHover: createColorValue("#295B8A"),
    borderFocus: createColorValue("#2979FF"),

    card: createColorValue("#0A1929"),
    cardForeground: createColorValue("#E3F2FD"),
    popover: createColorValue("#0A1929"),
    popoverForeground: createColorValue("#E3F2FD"),
    muted: createColorValue("#132742"),
    mutedForeground: createColorValue("#64B5F6"),

    chart1: createColorValue("#2979FF"),
    chart2: createColorValue("#00C853"),
    chart3: createColorValue("#FFAB00"),
    chart4: createColorValue("#AA00FF"),
    chart5: createColorValue("#FF3D00"),
  },

  defectColors: {
    crack: createColorValue("#FF3D00"),
    inclusion: createColorValue("#FFAB00"),
    scratch: createColorValue("#00C853"),
    pit: createColorValue("#00E5FF"),
    dent: createColorValue("#AA00FF"),
    rollMark: createColorValue("#2979FF"),
    scale: createColorValue("#7C4DFF"),
    other: createColorValue("#666666"),

    levelA: createColorValue("#00C853"),
    levelB: createColorValue("#2979FF"),
    levelC: createColorValue("#FFAB00"),
    levelD: createColorValue("#FF3D00"),
  },

  radius: {
    radiusNone: "0",
    radiusSm: "2px",
    radiusMd: "4px",
    radiusLg: "8px",
    radiusXl: "12px",
    radiusFull: "9999px",
  },

  customCSSVars: {
    ...modernDeepSpace.customCSSVars!,
    "--gradient-primary": "linear-gradient(135deg, #2979FF 0%, #00E5FF 100%)",
    "--gradient-accent": "linear-gradient(135deg, #00E5FF 0%, #00C853 100%)",
    "--glow-primary": "0 0 20px rgba(41, 121, 255, 0.5)",
    "--glow-accent": "0 0 20px rgba(0, 229, 255, 0.5)",
  },
};

// ========== 现代科技 - 玻璃浅色 ==========
export const modernGlassLight: StylePreset = {
  ...modernDeepSpace,
  id: "modern-glass-light",
  name: "现代玻璃浅色",
  description: "玻璃态浅色主题，清爽现代",
  category: "modern",
  version: "1.0.0",
  mode: "modern",
  theme: "light",

  colors: {
    primary: createColorValue("#007AFF"),
    primaryHover: createColorValue("#3395FF"),
    primaryActive: createColorValue("#0062CC"),
    primaryForeground: createColorValue("#FFFFFF"),

    secondary: createColorValue("#F2F2F7"),
    secondaryHover: createColorValue("#E5E5EA"),
    secondaryForeground: createColorValue("#1C1C1E"),

    accent: createColorValue("#5856D6"),
    accentHover: createColorValue("#7B79EB"),
    accentForeground: createColorValue("#FFFFFF"),

    success: createColorValue("#34C759"),
    warning: createColorValue("#FF9500"),
    error: createColorValue("#FF3B30"),
    info: createColorValue("#007AFF"),

    background: createColorValue("#F5F5F7"),
    backgroundElevated: createColorValue("#FFFFFF"),
    backgroundSurface: createColorValue("#F2F2F7"),

    foreground: createColorValue("#1C1C1E"),
    foregroundMuted: createColorValue("#8E8E93"),
    foregroundDisabled: createColorValue("#C7C7CC"),

    border: createColorValue("#E5E5EA"),
    borderHover: createColorValue("#D1D1D6"),
    borderFocus: createColorValue("#007AFF"),

    card: createColorValue("#FFFFFF"),
    cardForeground: createColorValue("#1C1C1E"),
    popover: createColorValue("#FFFFFF"),
    popoverForeground: createColorValue("#1C1C1E"),
    muted: createColorValue("#F2F2F7"),
    mutedForeground: createColorValue("#8E8E93"),

    chart1: createColorValue("#007AFF"),
    chart2: createColorValue("#34C759"),
    chart3: createColorValue("#FF9500"),
    chart4: createColorValue("#5856D6"),
    chart5: createColorValue("#FF3B30"),
  },

  defectColors: {
    crack: createColorValue("#FF3B30"),
    inclusion: createColorValue("#FF9500"),
    scratch: createColorValue("#FFCC00"),
    pit: createColorValue("#34C759"),
    dent: createColorValue("#5856D6"),
    rollMark: createColorValue("#007AFF"),
    scale: createColorValue("#AF52DE"),
    other: createColorValue("#8E8E93"),

    levelA: createColorValue("#34C759"),
    levelB: createColorValue("#007AFF"),
    levelC: createColorValue("#FF9500"),
    levelD: createColorValue("#FF3B30"),
  },

  shadows: {
    shadowSm: "0 2px 8px rgba(0, 0, 0, 0.04)",
    shadowMd: "0 4px 16px rgba(0, 0, 0, 0.08)",
    shadowLg: "0 8px 32px rgba(0, 0, 0, 0.1)",
    shadowXl: "0 16px 48px rgba(0, 0, 0, 0.12)",
    shadow2Xl: "0 32px 64px rgba(0, 0, 0, 0.15)",
    shadowInner: "inset 0 2px 8px rgba(0, 0, 0, 0.04)",
    shadowGlow: "0 0 30px rgba(0, 122, 255, 0.15)",
    shadowInset: "inset 0 2px 8px rgba(0, 0, 0, 0.03)",
  },

  customCSSVars: {
    "--glass-bg": "rgba(255, 255, 255, 0.7)",
    "--glass-border": "rgba(0, 0, 0, 0.08)",
    "--glass-shadow": "0 8px 32px rgba(0, 0, 0, 0.08)",
    "--gradient-primary": "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
    "--gradient-accent": "linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)",
    "--glow-primary": "0 0 20px rgba(0, 122, 255, 0.15)",
    "--grid-color": "rgba(0, 0, 0, 0.03)",
    "--grid-size": "40px",
  },
};

// 导出所有现代风格预设
export const modernPresets: StylePreset[] = [
  modernDeepSpace,
  modernCyberpunk,
  modernIndustrial,
  modernGlassLight,
];
