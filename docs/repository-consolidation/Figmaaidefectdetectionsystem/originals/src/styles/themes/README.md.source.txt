# 风格系统 (Style System)

基于设计规范文档整合的专业风格系统，支持传统模式和现代化模式切换。

## 设计规范来源

- **系统设计与开发技术规范.pdf** - 工业互联网平台UI设计规范
- **衡钢特大口径无缝钢管智能制造平台** - 现代化工业科技风
- **南钢全流程智能制造项目** - 参考设计

## 目录结构

```
src/styles/themes/
├── types.ts           # 风格系统类型定义
├── colorUtils.ts      # 颜色转换工具函数
├── index.ts           # 风格预设导出和管理
├── traditional/
│   └── index.ts       # 传统工业风格配置
├── modern/
│   └── index.ts       # 现代科技风格配置
└── README.md          # 本文档

src/components/
├── ThemeContext.tsx   # 主题上下文（兼容旧版）
├── StyleSystemProvider.tsx  # 风格系统提供者
└── StyleSelector.tsx  # 风格选择器组件

src/hooks/
└── useStyleSystem.ts  # 风格系统 Hooks
```

## 内置风格预设

### 传统模式 (Traditional)

| ID | 名称 | 描述 |
|---|---|---|
| `traditional-dark` | 传统工业深色 | 经典深色工业界面，适合长时间监控使用 |
| `traditional-light` | 传统工业浅色 | 经典浅色工业界面，适合办公环境使用 |
| `traditional-blue` | 传统蓝色专业版 | 蓝色系专业工业界面，强调数据可视化 |

### 现代化模式 (Modern)

| ID | 名称 | 描述 |
|---|---|---|
| `modern-deep-space` | 深空黑科技 | 极致深黑主题，高对比度，强调内容展示 |
| `modern-cyberpunk` | 赛博朋克 | 霓虹配色，赛博朋克风格，强烈的视觉冲击 |
| `modern-industrial` | 现代深蓝工业 | 深蓝色系，现代工业风，专业稳重 |
| `modern-glass-light` | 现代玻璃浅色 | 玻璃态浅色主题，清爽现代 |

## 使用方法

### 1. 在组件中使用风格系统

```tsx
import { useStyleSystem } from "@/components/StyleSystemProvider";

function MyComponent() {
  const {
    activePreset,
    presets,
    traditionalPresets,
    modernPresets,
    applyPreset,
  } = useStyleSystem();

  return (
    <div>
      <p>当前风格: {activePreset.name}</p>
      <button onClick={() => applyPreset("modern-deep-space")}>
        切换到深空黑科技
      </button>
    </div>
  );
}
```

### 2. 使用应用模式切换

```tsx
import { useAppMode } from "@/components/StyleSystemProvider";

function ModeSwitcher() {
  const { mode, setMode, isModern, isTraditional } = useAppMode();

  return (
    <div>
      <button onClick={() => setMode("traditional")}>传统模式</button>
      <button onClick={() => setMode("modern")}>现代化模式</button>
    </div>
  );
}
```

### 3. 使用风格选择器组件

```tsx
import { StyleSelector } from "@/components/StyleSelector";

function SettingsPage() {
  return (
    <div>
      <h2>风格设置</h2>
      <StyleSelector mode="traditional" />
    </div>
  );
}
```

### 4. 紧凑型风格选择器

```tsx
import { CompactStyleSelector } from "@/components/StyleSelector";

function QuickStyleSwitch() {
  return (
    <div>
      <h3>快速切换风格</h3>
      <CompactStyleSelector mode="modern" />
    </div>
  );
}
```

## 自定义风格

### 导出当前风格

```tsx
const { exportPreset, activePreset } = useStyleSystem();

const handleExport = () => {
  const json = exportPreset(activePreset.id);
  // 下载 JSON 文件
};
```

### 导入自定义风格

```tsx
const { importPreset } = useStyleSystem();

const handleImport = (jsonConfig: string) => {
  const success = importPreset(jsonConfig);
  if (success) {
    console.log("导入成功");
  }
};
```

### 创建自定义风格配置

```typescript
import type { StylePreset } from "@/styles/themes/types";
import { createColorValue } from "@/styles/themes/colorUtils";

const customStyle: StylePreset = {
  id: "my-custom-style",
  name: "我的自定义风格",
  description: "根据需求定制的风格",
  category: "custom",
  version: "1.0.0",
  mode: "modern",
  theme: "dark",

  colors: {
    // ... 定义所有颜色
    primary: createColorValue("#FF0000"),
    // ...
  },

  // ... 其他配置
};
```

## CSS 变量

风格系统会自动应用以下 CSS 变量：

### 基础颜色
- `--primary` - 主色调
- `--accent` - 强调色
- `--background` - 背景色
- `--foreground` - 前景色
- `--muted` - 静音色
- `--border` - 边框色

### 缺陷颜色
- `--defect-crack` - 裂纹颜色
- `--defect-inclusion` - 夹杂颜色
- `--defect-scratch` - 划伤颜色
- `--defect-pit` - 麻点颜色
- `--defect-dent` - 凹陷颜色
- `--defect-rollMark` - 轧痕颜色
- `--defect-scale` - 氧化皮颜色

### 等级颜色
- `--level-a` - A级颜色
- `--level-b` - B级颜色
- `--level-c` - C级颜色
- `--level-d` - D级颜色

### 图表颜色
- `--chart-1` ~ `--chart-5` - 图表系列颜色

## 存储与持久化

- 风格预设选择存储在 `localStorage['style_system_preset']`
- 应用模式存储在 `localStorage['app_mode']`
- 用户自定义预设存储在 `localStorage['style_system_user_presets']`

## 向后兼容

旧版 `ThemeContext` 仍然可用，但建议迁移到新的风格系统：

```tsx
// 旧版（已弃用）
import { useTheme, themePresets } from "../ThemeContext";

// 新版（推荐）
import { useStyleSystem } from "@/components/StyleSystemProvider";
```

## 技术实现

- 类型定义基于设计规范文档中的颜色、字体、间距、圆角、阴影等系统
- 颜色格式支持 HEX、HSL、RGB 互转
- CSS 变量动态应用到 `document.documentElement`
- 支持浅色/深色主题自动切换
