import type { Surface } from "../api/types";

export type DefectSelectionIdentity = {
  id: string;
  surface: Surface;
};

export function getDefectSelectionKey(defect: DefectSelectionIdentity): string {
  return `${defect.surface}:${defect.id}`;
}

export function isSameDefectSelection(
  left: DefectSelectionIdentity | null | undefined,
  right: DefectSelectionIdentity | null | undefined,
): boolean {
  if (!left || !right) return false;
  return left.id === right.id && left.surface === right.surface;
}

