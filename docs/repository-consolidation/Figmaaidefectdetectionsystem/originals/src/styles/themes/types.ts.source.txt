/**
 * 风格系统类型定义
 * 基于以下设计规范整合：
 * 1. 系统设计与开发技术规范.pdf - 工业互联网平台UI设计规范
 * 2. 衡钢特大口径无缝钢管智能制造平台 - 现代化工业科技风
 */

/**
 * 应用模式类型
 */
export type AppMode = "traditional" | "modern";

/**
 * 主题模式类型
 */
export type ThemeMode = "light" | "dark" | "auto";

/**
 * 颜色格式
 */
export interface ColorValue {
  hex: string;
  hsl: string; // 格式: "h s% l%" 或 "h s% l% / a%"
  rgb?: string;
}

/**
 * 语义化颜色系统
 */
export interface SemanticColors {
  // 主色调
  primary: ColorValue;
  primaryHover: ColorValue;
  primaryActive: ColorValue;
  primaryForeground: ColorValue;

  // 次要色
  secondary: ColorValue;
  secondaryHover: ColorValue;
  secondaryForeground: ColorValue;

  // 强调色
  accent: ColorValue;
  accentHover: ColorValue;
  accentForeground: ColorValue;

  // 成功/警告/错误
  success: ColorValue;
  warning: ColorValue;
  error: ColorValue;
  info: ColorValue;

  // 背景色系
  background: ColorValue;
  backgroundElevated: ColorValue;
  backgroundSurface: ColorValue;

  // 前景色系
  foreground: ColorValue;
  foregroundMuted: ColorValue;
  foregroundDisabled: ColorValue;

  // 边框色系
  border: ColorValue;
  borderHover: ColorValue;
  borderFocus: ColorValue;

  // 组件特定
  card: ColorValue;
  cardForeground: ColorValue;
  popover: ColorValue;
  popoverForeground: ColorValue;
  muted: ColorValue;
  mutedForeground: ColorValue;

  // 图表色系
  chart1: ColorValue;
  chart2: ColorValue;
  chart3: ColorValue;
  chart4: ColorValue;
  chart5: ColorValue;
}

/**
 * 缺陷类型颜色映射
 */
export interface DefectColors {
  // 常见缺陷类型颜色
  crack: ColorValue;          // 裂纹
  inclusion: ColorValue;       // 夹杂
  scratch: ColorValue;         // 划伤
  pit: ColorValue;             // 麻点
  dent: ColorValue;            // 凹陷
  rollMark: ColorValue;        // 轧痕
  scale: ColorValue;           // 氧化皮
  other: ColorValue;           // 其他

  // 等级颜色
  levelA: ColorValue;          // A级 - 优
  levelB: ColorValue;          // B级 - 良
  levelC: ColorValue;          // C级 - 合格
  levelD: ColorValue;          // D级 - 不合格
}

/**
 * 字体系统
 */
export interface FontSystem {
  // 字体家族
  fontFamilyBase: string[];
  fontFamilyMono: string[];
  fontFamilyDisplay: string[];

  // 字体大小
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2Xl: string;
  fontSize3Xl: string;
  fontSize4Xl: string;

  // 字重
  fontWeightLight: number;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightSemiBold: number;
  fontWeightBold: number;

  // 行高
  lineHeightTight: number;
  lineHeightBase: number;
  lineHeightRelaxed: number;
}

/**
 * 间距系统
 */
export interface SpacingSystem {
  // 基础间距单位
  unit: number;

  // 预设间距
  spacingXs: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  spacingXl: string;
  spacing2Xl: string;
  spacing3Xl: string;
  spacing4Xl: string;
}

/**
 * 圆角系统
 */
export interface RadiusSystem {
  radiusNone: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radiusFull: string;
}

/**
 * 阴影系统
 */
export interface ShadowSystem {
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  shadow2Xl: string;
  shadowInner: string;

  // 特殊效果阴影
  shadowGlow: string;      // 发光效果
  shadowInset: string;     // 内阴影
}

/**
 * 动画系统
 */
export interface AnimationSystem {
  // 缓动函数
  easeDefault: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  easeBounce: string;

  // 持续时间
  durationFast: string;
  durationBase: string;
  durationSlow: string;

  // 动画预设
  transitionBase: string;
  transitionColors: string;
  transitionTransform: string;
}

/**
 * 边框系统
 */
export interface BorderSystem {
  borderWidth: {
    thin: string;
    base: string;
    thick: string;
  };

  borderStyle: {
    solid: string;
    dashed: string;
    dotted: string;
  };
}

/**
 * 组件特定样式
 */
export interface ComponentStyles {
  // 按钮
  button: {
    paddingX: string;
    paddingY: string;
    height: {
      sm: string;
      md: string;
      lg: string;
    };
    radius: string;
  };

  // 输入框
  input: {
    paddingX: string;
    paddingY: string;
    height: string;
    radius: string;
  };

  // 卡片
  card: {
    padding: string;
    radius: string;
    spacing: string;
  };

  // 表格
  table: {
    cellPadding: string;
    headerHeight: string;
    rowHeight: string;
    borderColor: string;
  };

  // 导航栏
  navbar: {
    height: string;
    paddingX: string;
    background: string;
  };

  // 侧边栏
  sidebar: {
    width: string;
    collapsedWidth: string;
    padding: string;
  };
}

/**
 * Z-index 层级系统
 */
export interface ZIndexSystem {
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
  notification: number;
}

/**
 * 完整风格配置
 */
export interface StylePreset {
  // 基础信息
  id: string;
  name: string;
  description: string;
  category: "traditional" | "modern" | "custom";
  version: string;

  // 适用模式
  mode: AppMode;
  theme: ThemeMode;

  // 颜色系统
  colors: SemanticColors;
  defectColors: DefectColors;

  // 字体系统
  fonts: FontSystem;

  // 间距系统
  spacing: SpacingSystem;

  // 圆角系统
  radius: RadiusSystem;

  // 阴影系统
  shadows: ShadowSystem;

  // 动画系统
  animations: AnimationSystem;

  // 边框系统
  borders: BorderSystem;

  // 组件样式
  components: ComponentStyles;

  // Z-index
  zIndex: ZIndexSystem;

  // 自定义 CSS 变量
  customCSSVars?: Record<string, string>;

  // 额外的全局样式
  globalStyles?: string;

  // 预览图片（可选）
  previewImage?: string;
}

/**
 * 风格预设存储
 */
export interface StylePresetStorage {
  presets: StylePreset[];
  activePresetId: string;
  userPresets: StylePreset[];
}

/**
 * 风格系统上下文类型
 */
export interface StyleSystemContextType {
  // 当前激活的风格
  activePreset: StylePreset;

  // 所有可用风格
  presets: StylePreset[];

  // 传统模式风格
  traditionalPresets: StylePreset[];

  // 现代模式风格
  modernPresets: StylePreset[];

  // 应用风格
  applyPreset: (presetId: string) => void;

  // 保存自定义风格
  savePreset: (preset: StylePreset) => void;

  // 删除自定义风格
  deletePreset: (presetId: string) => void;

  // 导出风格配置
  exportPreset: (presetId: string) => string;

  // 导入风格配置
  importPreset: (config: string) => boolean;

  // 重置为默认风格
  resetToDefault: () => void;
}
