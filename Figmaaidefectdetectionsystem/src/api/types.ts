/**
 * API 数据类型定义
 * 前端使用 camelCase，与后端 snake_case 进行映射
 */

// ==================== 钢板相关类型 ====================

/**
 * 钢板项（后端返回）
 */
export interface SteelItemRaw {
  seq_no: number; // 流水号
  steel_no: string; // 钢板号
  steel_type: string; // 钢种
  length: number; // 长度 (mm)
  width: number; // 宽度 (mm)
  thickness: number; // 厚度 (mm)
  timestamp: string; // ISO 时间戳
  level: "A" | "B" | "C" | "D"; // 质量等级
  defect_count: number; // 缺陷数量
}

/**
 * 钢板项（前端使用）
 */
export interface SteelItem {
  serialNumber: string; // 流水号
  plateId: string; // 钢板号
  steelGrade: string; // 钢种
  dimensions: {
    length: number;
    width: number;
    thickness: number;
  };
  timestamp: Date;
  level: "A" | "B" | "C" | "D";
  defectCount: number;
}

/**
 * 钢板列表响应
 */
export interface SteelListResponse {
  steels: SteelItemRaw[];
  total: number;
}

// ==================== API 节点列表 ====================

export interface ApiNode {
  key: string;
  name: string;
  mode?: string;
  path?: string;
  profile?: string;
  port?: number;
  ip?: string;
  online?: boolean;
  latest_timestamp?: string;
  latest_age_seconds?: number;
}

export interface ApiListResponse {
  items: ApiNode[];
}

// ==================== 缺陷相关类型 ====================

/**
 * 缺陷类型枚举（基于 TestData/meta.json 真实数据）
 */
export const DEFECT_TYPES = [
  "纵向裂纹",
  "横向裂纹",
  "异物压入",
  "划伤",
  "凹坑",
  "压痕",
  "夹杂",
  "氧化铁皮",
  "结疤",
  "起皮",
  "边裂",
] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];

/**
 * 表面类型
 */
export type Surface = "top" | "bottom";

/**
 * 严重程度
 */
export type Severity = "low" | "medium" | "high";

/**
 * 按表面统计的图像元信息
 */
export interface SurfaceImageInfo {
  surface: Surface;
  frame_count: number; // 该表面可用帧数量
  image_width: number; // 单帧宽度（像素）
  image_height: number; // 单帧高度（像素）
}

/**
 * 缺陷项（后端返回）
 */
export interface DefectItemRaw {
  defect_id: string;
  defect_type: string;
  severity: Severity;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  surface: Surface;
  image_index: number; // 关联的图像索引
  class_id?: number | null;
  class_name?: string | null;
  // 物理坐标（mm），来自后端 bbox_object / leftInObj 等，可选
  x_mm?: number;
  y_mm?: number;
  width_mm?: number;
  height_mm?: number;
}

/**
 * 缺陷项（前端使用）
 */
export interface DefectItem {
  id: string;
  type: DefectType;
  severity: Severity;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  surface: Surface;
  imageIndex: number;
  // 物理坐标（mm）
  xMm?: number;
  yMm?: number;
  widthMm?: number;
  heightMm?: number;
}

/**
 * 缺陷响应
 */
export interface DefectResponse {
  seq_no: number;
  defects: DefectItemRaw[];
  total_count: number;
  surface_images?: SurfaceImageInfo[];
}

/**
 * 钢板图像元信息响应
 */
export interface SteelMetaResponse {
  seq_no: number;
  surface_images: SurfaceImageInfo[];
}

// ==================== 缺陷字典类型 ====================

export interface DefectClassColor {
  red: number;
  green: number;
  blue: number;
}

export interface DefectClassItem {
  class: number;
  name: string;
  tag: string;
  color: DefectClassColor;
  desc: string;
  parent: number[];
  severity?: number;
}

export interface DefectClassesResponse {
  num: number;
  items: DefectClassItem[];
}

export type DefectClassMap = Record<number, DefectClassItem>;

// ==================== 缺陷标注相关类型 ====================
export interface AnnotationBBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DefectAnnotationItem {
  id: number;
  line_key: string;
  seq_no: number;
  surface: "top" | "bottom";
  view: string;
  user?: string | null;
  method: string;
  bbox: AnnotationBBox;
  class_id?: number | null;
  class_name?: string | null;
  mark?: string | null;
  export_payload?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DefectAnnotationCreate {
  line_key: string;
  seq_no: number;
  surface: "top" | "bottom";
  view: string;
  user?: string | null;
  method: string;
  bbox: AnnotationBBox;
  class_id?: number | null;
  class_name?: string | null;
  mark?: string | null;
  export_payload?: Record<string, unknown> | null;
  extra?: string | null;
}

export interface DefectAnnotationListResponse {
  items: DefectAnnotationItem[];
}

// ==================== 图像相关类型 ====================

/**
 * 图像查询参数
 */
export interface FrameImageParams {
  surface: Surface;
  seq_no: number;
  image_index: number;
}

// ==================== 健康检查 ====================

/**
 * 健康检查响应
 */
export interface HealthResponse {
  status: "healthy" | "unhealthy" | "ok";
  timestamp: string;
  version?: string;
  database?: {
    connected: boolean;
    latency_ms?: number;
  };
}

// ==================== 工具函数 ====================

/**
 * 将后端钢板数据转换为前端格式
 */
export function mapSteelItem(raw: SteelItemRaw): SteelItem {
  return {
    serialNumber: raw.seq_no.toString(),
    plateId: raw.steel_no,
    steelGrade: raw.steel_type,
    dimensions: {
      length: raw.length,
      width: raw.width,
      thickness: raw.thickness,
    },
    timestamp: new Date(raw.timestamp),
    level: raw.level,
    defectCount: raw.defect_count,
  };
}

/**
 * 将后端缺陷数据转换为前端格式
 */
export function mapDefectItem(raw: DefectItemRaw): DefectItem {
  return {
    id: raw.defect_id,
    type: raw.defect_type as DefectType,
    severity: raw.severity,
    x: raw.x,
    y: raw.y,
    width: raw.width,
    height: raw.height,
    confidence: raw.confidence,
    surface: raw.surface,
    imageIndex: raw.image_index,
    xMm: raw.x_mm,
    yMm: raw.y_mm,
    widthMm: raw.width_mm,
    heightMm: raw.height_mm,
  };
}
