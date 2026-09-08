/**
 * 风格系统 Hook
 * 提供风格的切换、保存、导入导出功能
 */

import { useState, useEffect, useCallback } from "react";
import type {
  StylePreset,
  AppMode,
  StyleSystemContextType,
} from "@/styles/themes/types";
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

/**
 * 风格系统 Hook
 */
export function useStyleSystem(mode: AppMode = "traditional"): StyleSystemContextType {
  const [activePreset, setActivePreset] = useState<StylePreset>(() => {
    // 尝试从 localStorage 获取保存的预设
    const savedId = getSavedPresetId();
    if (savedId) {
      const savedPreset = getPresetById(savedId);
      if (savedPreset) return savedPreset;
    }
    // 默认使用对应模式的第一个预设
    return mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
  });

  const [userPresets, setUserPresets] = useState<StylePreset[]>([]);

  // 加载用户自定义预设
  useEffect(() => {
    setUserPresets(getUserPresets());
  }, []);

  // 合并内置预设和用户预设
  const presets = [...allPresets, ...userPresets];

  // 按模式分类的预设
  const traditionalPresetsList = traditionalPresets.concat(
    userPresets.filter(p => p.mode === "traditional")
  );
  const modernPresetsList = modernPresets.concat(
    userPresets.filter(p => p.mode === "modern")
  );

  // 应用风格预设
  const applyPreset = useCallback((presetId: string) => {
    const preset = getPresetById(presetId) || userPresets.find(p => p.id === presetId);
    if (preset) {
      setActivePreset(preset);
      savePresetId(presetId);
      applyPresetToCSS(preset);
      console.log(`[StyleSystem] 应用风格: ${preset.name} (${preset.id})`);
    }
  }, [userPresets]);

  // 初始化时应用当前预设
  useEffect(() => {
    applyPresetToCSS(activePreset);
  }, [activePreset]);

  // 保存自定义风格预设
  const savePreset = useCallback((preset: StylePreset) => {
    saveUserPresetToStorage(preset);
    setUserPresets(getUserPresets());
    console.log(`[StyleSystem] 保存自定义风格: ${preset.name}`);
  }, []);

  // 删除自定义风格预设
  const deletePreset = useCallback((presetId: string) => {
    deleteUserPresetFromStorage(presetId);
    setUserPresets(getUserPresets());
    // 如果删除的是当前预设，切换到默认预设
    if (activePreset.id === presetId) {
      const defaultPreset = mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
      applyPreset(defaultPreset.id);
    }
  }, [activePreset, mode, applyPreset]);

  // 导出风格配置
  const exportPreset = useCallback((presetId: string): string => {
    const preset = getPresetById(presetId) || userPresets.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`未找到预设: ${presetId}`);
    }
    return JSON.stringify(preset, null, 2);
  }, [userPresets]);

  // 导入风格配置
  const importPreset = useCallback((config: string): boolean => {
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
  }, [savePreset]);

  // 重置为默认风格
  const resetToDefault = useCallback(() => {
    const defaultPreset = mode === "modern" ? getDefaultModernPreset() : getDefaultTraditionalPreset();
    applyPreset(defaultPreset.id);
  }, [mode, applyPreset]);

  return {
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
  };
}

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

/**
 * 风格预设选择器 Hook
 * 用于组件中获取当前模式的可用预设
 */
export function useAvailablePresets(mode: AppMode = "traditional") {
  const { activePreset, applyPreset } = useStyleSystem(mode);
  const availablePresets = getPresetsByMode(mode);

  return {
    activePreset,
    presets: availablePresets,
    applyPreset,
  };
}

// 重新导出 useAppMode 从 StyleSystemProvider
export { useAppMode } from "@/components/StyleSystemProvider";
