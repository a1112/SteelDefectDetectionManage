import type {
  Surface,
} from "../api/types";

export type ActiveTab = "plates" | "defects" | "images" | "reports" | "settings" | "mockdata";

export type SurfaceFilter = "all" | "top" | "bottom";

export type ImageViewMode = "full" | "single";

export type ManualConfirmStatus = "unprocessed" | "ignore" | "A" | "B" | "C" | "D" | null;

export type ImageOrientation = "horizontal" | "vertical";

export type DistributionScaleMode = "fit" | "stretch";

export interface Defect {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  surface: Surface;
  imageIndex: number;
}

export interface SteelPlate {
  serialNumber: string;
  plateId: string;
  steelGrade: string;
  dimensions: {
    length: number;
    width: number;
    thickness: number;
  };
  timestamp: Date;
  level: "A" | "B" | "C" | "D";
  defectCount: number;
}

export interface DetectionRecord {
  id: string;
  defectImageUrl: string;
  fullImageUrl: string;
  timestamp: Date;
  defects: Defect[];
  status: "pass" | "fail" | "warning";
}
