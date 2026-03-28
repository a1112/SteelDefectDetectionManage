import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

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

interface ThemeContextType {
  currentTheme: ThemePreset;
  applyTheme: (preset: ThemePreset) => void;
  applyThemeById: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// 将颜色转换为 HSL 空间组件字符串 (h s% l%)
const hexToHslComponents = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    // 从localStorage加载保存的主题
    const saved = localStorage.getItem("app_theme_preset");
    if (saved) {
      const preset = themePresets.find((p) => p.id === saved);
      if (preset) return preset;
    }
    return themePresets[0]; // 默认主题
  });

  const applyTheme = (preset: ThemePreset) => {
    setCurrentTheme(preset);
    localStorage.setItem("app_theme_preset", preset.id);

    // 应用CSS变量到根元素
    const root = document.documentElement;
    const colors = preset.colors;

    // 设置 HSL 颜色变量（适配 globals.css 的格式）
    root.style.setProperty("--primary", hexToHslComponents(colors.primary));
    root.style.setProperty("--accent", hexToHslComponents(colors.accent));
    root.style.setProperty("--background", hexToHslComponents(colors.background));
    root.style.setProperty("--foreground", hexToHslComponents(colors.foreground));
    root.style.setProperty("--muted", hexToHslComponents(colors.muted));
    root.style.setProperty("--border", hexToHslComponents(colors.border));
    
    // 同步更新 card/popover 等衍生变量
    root.style.setProperty("--card", hexToHslComponents(colors.background));
    root.style.setProperty("--card-foreground", hexToHslComponents(colors.foreground));
    root.style.setProperty("--popover", hexToHslComponents(colors.background));
    root.style.setProperty("--popover-foreground", hexToHslComponents(colors.foreground));

    // 设置额外的变量供直接使用
    root.style.setProperty("--color-primary", colors.primary);
    root.style.setProperty("--color-accent", colors.accent);
    root.style.setProperty("--color-background", colors.background);
    root.style.setProperty("--color-foreground", colors.foreground);
    root.style.setProperty("--color-muted", colors.muted);
    root.style.setProperty("--color-border", colors.border);

    // 判断是浅色还是深色主题
    const bgBrightness = parseInt(colors.background.slice(1, 3), 16);
    if (bgBrightness > 128) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }

    console.log(`🎨 应用主题: ${preset.name}`);
  };

  const applyThemeById = (id: string) => {
    const preset = themePresets.find((p) => p.id === id);
    if (preset) {
      applyTheme(preset);
    }
  };

  // 初始化时应用主题
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, applyTheme, applyThemeById }}>
      {children}
    </ThemeContext.Provider>
  );
};