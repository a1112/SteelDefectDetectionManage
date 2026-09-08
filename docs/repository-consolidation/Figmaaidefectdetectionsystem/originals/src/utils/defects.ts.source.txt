// 缺陷相关工具函数

import type { Defect } from "../types/app.types";
import { DEFECT_TYPES } from "../api/types";
import { generateMockDefects } from "../api/mock";

// 缺陷类型列表（统一从 API 类型导出）
export const defectTypes = [...DEFECT_TYPES];

// 缺陷类型对应的强调色（用于复选框等组件，基于真实数据颜色）
export const defectAccentColors: Record<string, string> = {
  纵向裂纹: "#ae0000", // red: 174, green: 0, blue: 0
  横向裂纹: "#804040", // red: 128, green: 64, blue: 64
  异物压入: "#800080", // red: 128, green: 0, blue: 128
  划伤: "#ff8040", // red: 255, green: 128, blue: 64
  凹坑: "#c9a536", // red: 201, green: 165, blue: 54
  压痕: "#c65539", // red: 198, green: 85, blue: 57
  夹杂: "#2e4fd1", // red: 46, green: 79, blue: 209
  氧化铁皮: "#38c772", // red: 56, green: 199, blue: 114
  结疤: "#2b33d5", // red: 43, green: 51, blue: 213
  起皮: "#af5091", // red: 175, green: 80, blue: 145
  边裂: "#36c966", // red: 54, green: 201, blue: 102
};

// 缺陷类型颜色映射
export const defectColors: {
  [key: string]: {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
  };
} = {
  纵向裂纹: {
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-400",
    activeBg: "bg-red-500",
    activeBorder: "border-red-500",
    activeText: "text-white",
  },
  横向裂纹: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    text: "text-orange-400",
    activeBg: "bg-orange-500",
    activeBorder: "border-orange-500",
    activeText: "text-white",
  },
  异物压入: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/40",
    text: "text-purple-400",
    activeBg: "bg-purple-500",
    activeBorder: "border-purple-500",
    activeText: "text-white",
  },
  划伤: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/40",
    text: "text-pink-400",
    activeBg: "bg-pink-500",
    activeBorder: "border-pink-500",
    activeText: "text-white",
  },
  凹坑: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    text: "text-amber-400",
    activeBg: "bg-amber-500",
    activeBorder: "border-amber-500",
    activeText: "text-white",
  },
  压痕: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/40",
    text: "text-rose-400",
    activeBg: "bg-rose-500",
    activeBorder: "border-rose-500",
    activeText: "text-white",
  },
  夹杂: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/40",
    text: "text-indigo-400",
    activeBg: "bg-indigo-500",
    activeBorder: "border-indigo-500",
    activeText: "text-white",
  },
  氧化铁皮: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    activeBg: "bg-emerald-500",
    activeBorder: "border-emerald-500",
    activeText: "text-white",
  },
  结疤: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
    text: "text-blue-400",
    activeBg: "bg-blue-500",
    activeBorder: "border-blue-500",
    activeText: "text-white",
  },
  起皮: {
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/40",
    text: "text-fuchsia-400",
    activeBg: "bg-fuchsia-500",
    activeBorder: "border-fuchsia-500",
    activeText: "text-white",
  },
  边裂: {
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    text: "text-green-400",
    activeBg: "bg-green-500",
    activeBorder: "border-green-500",
    activeText: "text-white",
  },
};

// 生成随机缺陷数据（用于开发模式）
export const generateRandomDefects = (): Defect[] => {
  // 使用 API 层的 mock 生成逻辑，确保字段与接口保持一致
  return generateMockDefects(Date.now()).map((defect) => ({
    ...defect,
    imageIndex: defect.imageIndex ?? 0,
  }));
};