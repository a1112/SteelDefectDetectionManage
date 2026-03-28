import { useState, useCallback, useMemo } from "react";
import type { DefectItemRaw } from "../../../api/types";

export interface AnnotationState {
  defectTypeOptions: Array<{ label: string; color: string }>;
  selectedDefectTypes: string[];
  defectSeverityByName: Record<string, number>;
  defectSeverityByClassId: Record<number, number>;
  defectClassOptions: Array<{ id: number; name: string; color?: string }>;
}

export interface AnnotationActions {
  setDefectTypeOptions: (options: Array<{ label: string; color: string }>) => void;
  setSelectedDefectTypes: (types: string[]) => void;
  setDefectSeverityByName: (severity: Record<string, number>) => void;
  setDefectSeverityByClassId: (severity: Record<number, number>) => void;
  setDefectClassOptions: (options: Array<{ id: number; name: string; color?: string }>) => void;
  buildPlatePreviewGroups: (defects: DefectItemRaw[]) => Array<{
    label: string;
    count: number;
    classId?: number | null;
    severity?: number;
    items: Array<{ id: string; surface: "top" | "bottom" }>;
  }>;
}

const DEFAULT_DEFECT_TYPES = [
  { label: "划痕", color: "#3fb950" },
  { label: "辊印", color: "#f85149" },
  { label: "头尾", color: "#d29922" },
  { label: "氧化铁皮", color: "#58a6ff" },
  { label: "异物压入", color: "#bc8cff" },
  { label: "周期性缺陷", color: "#ffffff" },
  { label: "油渍", color: "#1f6feb" },
  { label: "气泡", color: "#db61a2" },
  { label: "结疤", color: "#79c0ff" },
  { label: "折叠", color: "#fa7e7e" },
  { label: "边缘缺陷", color: "#ffa657" },
  { label: "黑点", color: "#8b949e" },
];

/**
 * 标注管理 Hook
 *
 * 负责缺陷标注相关的状态和逻辑
 */
export function useAnnotation(): [AnnotationState, AnnotationActions] {
  const [defectTypeOptions, setDefectTypeOptions] = useState(
    DEFAULT_DEFECT_TYPES
  );
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>(
    DEFAULT_DEFECT_TYPES.map((t) => t.label)
  );
  const [defectSeverityByName, setDefectSeverityByName] = useState<Record<string, number>>({});
  const [defectSeverityByClassId, setDefectSeverityByClassId] = useState<Record<number, number>>({});
  const [defectClassOptions, setDefectClassOptions] = useState<
    Array<{ id: number; name: string; color?: string }>
  >([]);

  const buildPlatePreviewGroups = useCallback((defects: DefectItemRaw[]) => {
    const groups = new Map<
      string,
      {
        label: string;
        count: number;
        classId?: number | null;
        severity?: number;
        items: Array<{ id: string; surface: "top" | "bottom" }>;
      }
    >();

    defects.forEach((defect) => {
      const label = defect.class_name || defect.defect_type || "-";
      const surface = defect.surface === "top" ? "top" : "bottom";
      const classId = typeof defect.class_id === "number" ? defect.class_id : null;
      const severity = classId != null ? defectSeverityByClassId[classId] ?? 1 : 1;
      const existing = groups.get(label);
      if (!existing) {
        groups.set(label, {
          label,
          count: 1,
          classId,
          severity,
          items: [{ id: defect.defect_id, surface }],
        });
        return;
      }
      existing.count += 1;
      existing.severity = Math.max(existing.severity ?? 1, severity);
      if (existing.items.length < 5) {
        existing.items.push({ id: defect.defect_id, surface });
      }
      if (classId !== null) {
        if (existing.classId === null || existing.classId === undefined) {
          existing.classId = classId;
        } else {
          existing.classId = Math.min(existing.classId, classId);
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aSeverity = a.severity ?? 1;
      const bSeverity = b.severity ?? 1;
      if (aSeverity !== bSeverity) return bSeverity - aSeverity;
      const aClass = a.classId;
      const bClass = b.classId;
      if (aClass != null && bClass != null && aClass !== bClass) {
        return aClass - bClass;
      }
      if (aClass != null && bClass == null) return -1;
      if (aClass == null && bClass != null) return 1;
      if (a.count !== b.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
  }, [defectSeverityByClassId]);

  const state: AnnotationState = {
    defectTypeOptions,
    selectedDefectTypes,
    defectSeverityByName,
    defectSeverityByClassId,
    defectClassOptions,
  };

  const actions: AnnotationActions = {
    setDefectTypeOptions,
    setSelectedDefectTypes,
    setDefectSeverityByName,
    setDefectSeverityByClassId,
    setDefectClassOptions,
    buildPlatePreviewGroups,
  };

  return [state, actions];
}
