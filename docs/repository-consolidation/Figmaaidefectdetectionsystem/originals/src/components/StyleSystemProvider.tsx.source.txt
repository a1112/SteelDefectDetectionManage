/**
 * StyleSystemProvider - 风格系统提供者
 * 管理应用的整体风格系统
 */

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import type { StylePreset, AppMode, StyleSystemContextType } from "@/styles/themes/types";
import {
  allPresets,
  traditionalPresets,
  modernPresets,
  getPresetsByMode,
  getPresetById,
  getDefaultTraditionalPreset,
  getDefaultModernPreset,
  applyPresetToCSS,
  getSavedPresetId,
  savePresetId,
  getUserPresets,
  saveUserPreset as saveUserPresetToStorage,
  deleteUserPreset as deleteUserPresetFromStorage,
} from "@/styles/themes";

const MODE_KEY = "app_mode"; // traditional | modern

/**
 * 应用模式管理 Hook
 */
export function useAppMode(): {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isModern: boolean;
  isTraditional: boolean;
} {
  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      return saved === "modern" || saved === "traditional" ? saved : "traditional";
    } catch {
      return "traditional";
    }
  });

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(MODE_KEY, newMode);
    } catch (e) {
      console.warn("Failed to save mode:", e);
    }
  }, []);

  return {
    mode,
    setMode,
    isModern: mode === "modern",
    isTraditional: mode === "traditional",
  };
}

const STORAGE_KEY = "style_system_preset";

/**
 * 风格系统上下文
 */
const StyleSystemContext = createContext<StyleSystemContextType | undefined>(undefined);

/**
 * 使用风格系统
 */
export function useStyleSystem(): StyleSystemContextType {
  const context = useContext(StyleSystemContext);
  if (!context) {
    throw new Error("useStyleSystem must be used within StyleSystemProvider");
  }
  return context;
}

/**
 * 风格系统提供者
 */
export function StyleSystemProvider({ children }: { children: ReactNode }) {
  const { mode } = useAppMode();
  const [userPresets, setUserPresets] = useState<StylePreset[]>(() => getUserPresets());

  // 当前激活的风格预设
  const [activePreset, setActivePreset] = useState<StylePreset>(() => {
    const savedId = getSavedPresetId();
    if (savedId) {
      const saved = getPresetById(savedId);
      if (saved) return saved;
    }
    return mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
  });

  // 合并内置预设和用户预设
  const presets = [...allPresets, ...userPresets];

  // 按模式分类的预设
  const traditionalPresetsList = traditionalPresets.concat(
    userPresets.filter((p) => p.mode === "traditional")
  );
  const modernPresetsList = modernPresets.concat(
    userPresets.filter((p) => p.mode === "modern")
  );

  // 应用风格预设
  const applyPreset = (presetId: string) => {
    const preset = getPresetById(presetId) || userPresets.find((p) => p.id === presetId);
    if (preset) {
      setActivePreset(preset);
      savePresetId(presetId);
      applyPresetToCSS(preset);
      console.log(`[StyleSystem] 应用风格: ${preset.name} (${preset.id})`);
    }
  };

  // 保存自定义风格预设
  const savePreset = (preset: StylePreset) => {
    saveUserPresetToStorage(preset);
    setUserPresets(getUserPresets());
    console.log(`[StyleSystem] 保存自定义风格: ${preset.name}`);
  };

  // 删除自定义风格预设
  const deletePreset = (presetId: string) => {
    deleteUserPresetFromStorage(presetId);
    setUserPresets(getUserPresets());
    // 如果删除的是当前预设，切换到默认预设
    if (activePreset.id === presetId) {
      const defaultPreset = mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
      applyPreset(defaultPreset.id);
    }
  };

  // 导出风格配置
  const exportPreset = (presetId: string): string => {
    const preset = getPresetById(presetId) || userPresets.find((p) => p.id === presetId);
    if (!preset) {
      throw new Error(`未找到预设: ${presetId}`);
    }
    return JSON.stringify(preset, null, 2);
  };

  // 导入风格配置
  const importPreset = (config: string): boolean => {
    try {
      const preset = JSON.parse(config) as StylePreset;
      // 验证必要字段
      if (!preset.id || !preset.name || !preset.colors) {
        throw new Error("无效的风格配置");
      }
      // 生成唯一ID（如果冲突）
      const existingPreset = getPresetById(preset.id);
      const finalPreset: StylePreset = {
        ...preset,
        id: existingPreset ? `${preset.id}-${Date.now()}` : preset.id,
        category: "custom",
      };
      savePreset(finalPreset);
      console.log(`[StyleSystem] 导入风格: ${finalPreset.name}`);
      return true;
    } catch (e) {
      console.error("[StyleSystem] 导入失败:", e);
      return false;
    }
  };

  // 重置为默认风格
  const resetToDefault = () => {
    const defaultPreset = mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
    applyPreset(defaultPreset.id);
  };

  // 初始化时应用当前预设
  useEffect(() => {
    applyPresetToCSS(activePreset);
  }, [activePreset]);

  // 监听模式变化，自动切换对应风格的预设
  useEffect(() => {
    const currentPresetInMode = getPresetsByMode(mode).find((p) => p.id === activePreset.id);
    if (!currentPresetInMode) {
      // 当前预设不支持新模式，切换到默认预设
      const defaultPreset = mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
      applyPreset(defaultPreset.id);
    }
  }, [mode]);

  return (
    <StyleSystemContext.Provider
      value={{
        activePreset,
        presets,
        traditionalPresets: traditionalPresetsList,
        modernPresets: modernPresetsList,
        applyPreset,
        savePreset,
        deletePreset,
        exportPreset,
        importPreset,
        resetToDefault,
      }}
    >
      {children}
    </StyleSystemContext.Provider>
  );
}

/**
 * 导出钩子用于组件内部使用
 */
export type { StylePreset, AppMode } from "@/styles/themes/types";
