import { useCallback, useEffect, useState } from "react";
import type { DistributionScaleMode } from "../types/app.types";

export interface GlobalUiSettings {
  showDistributionImages: boolean;
  showTileBorders: boolean;
  distributionScaleMode: DistributionScaleMode;
  defectHoverCardWidth: number;
  defectHoverImageStretch: boolean;
  plateHoverEnabled: boolean;
  defectListHoverDefaultVisible: boolean;
  defectListHoverMaxCategories: number;
  defectListHoverMaxItems: number;
  defectListHoverItemSize: number;
}

const STORAGE_KEY = "global_ui_settings_v1";

export const defaultGlobalUiSettings: GlobalUiSettings = {
  showDistributionImages: true,
  showTileBorders: false,
  distributionScaleMode: "fit",
  defectHoverCardWidth: 220,
  defectHoverImageStretch: false,
  plateHoverEnabled: true,
  defectListHoverDefaultVisible: true,
  defectListHoverMaxCategories: 6,
  defectListHoverMaxItems: 5,
  defectListHoverItemSize: 32,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const readNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeSettings = (
  input?: Partial<GlobalUiSettings>,
): GlobalUiSettings => {
  const merged = { ...defaultGlobalUiSettings, ...(input ?? {}) };
  return {
    ...merged,
    showDistributionImages: readBool(
      merged.showDistributionImages,
      defaultGlobalUiSettings.showDistributionImages,
    ),
    showTileBorders: readBool(
      merged.showTileBorders,
      defaultGlobalUiSettings.showTileBorders,
    ),
    distributionScaleMode:
      merged.distributionScaleMode === "stretch" ? "stretch" : "fit",
    defectHoverCardWidth: clampNumber(
      readNumber(
        merged.defectHoverCardWidth,
        defaultGlobalUiSettings.defectHoverCardWidth,
      ),
      160,
      320,
    ),
    defectHoverImageStretch: readBool(
      merged.defectHoverImageStretch,
      defaultGlobalUiSettings.defectHoverImageStretch,
    ),
    plateHoverEnabled: readBool(
      merged.plateHoverEnabled,
      defaultGlobalUiSettings.plateHoverEnabled,
    ),
    defectListHoverDefaultVisible: readBool(
      merged.defectListHoverDefaultVisible,
      defaultGlobalUiSettings.defectListHoverDefaultVisible,
    ),
    defectListHoverMaxCategories: clampNumber(
      readNumber(
        merged.defectListHoverMaxCategories,
        defaultGlobalUiSettings.defectListHoverMaxCategories,
      ),
      1,
      12,
    ),
    defectListHoverMaxItems: clampNumber(
      readNumber(
        merged.defectListHoverMaxItems,
        defaultGlobalUiSettings.defectListHoverMaxItems,
      ),
      1,
      12,
    ),
    defectListHoverItemSize: clampNumber(
      readNumber(
        merged.defectListHoverItemSize,
        defaultGlobalUiSettings.defectListHoverItemSize,
      ),
      24,
      64,
    ),
  };
};

const loadSettings = () => {
  if (typeof window === "undefined") {
    return defaultGlobalUiSettings;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultGlobalUiSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<GlobalUiSettings>;
    return normalizeSettings(parsed);
  } catch {
    return defaultGlobalUiSettings;
  }
};

export function useGlobalUiSettings() {
  const [settings, setSettings] = useState<GlobalUiSettings>(() =>
    loadSettings(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof GlobalUiSettings>(
      key: K,
      value: GlobalUiSettings[K],
    ) => {
      setSettings((prev) => normalizeSettings({ ...prev, [key]: value }));
    },
    [],
  );

  return { settings, setSettings, updateSetting };
}
