/**
 * Mock 数据生成器
 * 基于 /TestData 目录中的真实测试数据结构
 * 用于开发模式，模拟后端 API 响应
 */

import type {
  SteelListResponse,
  DefectResponse,
  HealthResponse,
  DefectItemRaw,
  DefectItem,
  SteelItemRaw,
  Severity,
  Surface,
  DefectClassesResponse,
  DefectClassItem,
  SurfaceImageInfo,
  ApiNode,
} from "./types";
import { mapDefectItem } from "./types";

// 钢种列表（基于真实数据）
const steelGrades = [
  "Q235B",
  "Q345B",
  "Q420C",
  "16MnR",
  "45#钢",
];

// 缺陷类型列表（基于 TestData/meta.json）
const defectClassItems: DefectClassItem[] = [
  {
    class: 0,
    name: "noclass",
    tag: "N0",
    color: { red: 0, green: 255, blue: 64 },
    desc: "未命名",
    parent: [],
  },
  {
    class: 1,
    name: "verCrack",
    tag: "L0",
    color: { red: 174, green: 0, blue: 0 },
    desc: "纵向裂纹",
    parent: [],
  },
  {
    class: 2,
    name: "horCrack",
    tag: "L1",
    color: { red: 128, green: 64, blue: 64 },
    desc: "横向裂纹",
    parent: [],
  },
  {
    class: 3,
    name: "pressIn",
    tag: "L0",
    color: { red: 128, green: 0, blue: 128 },
    desc: "异物压入",
    parent: [],
  },
  {
    class: 4,
    name: "verScratch",
    tag: "H0",
    color: { red: 255, green: 128, blue: 64 },
    desc: "划伤",
    parent: [],
  },
  {
    class: 5,
    name: "aokeng",
    tag: "A0",
    color: { red: 201, green: 165, blue: 54 },
    desc: "凹坑",
    parent: [],
  },
  {
    class: 6,
    name: "yahen",
    tag: "Y0",
    color: { red: 198, green: 85, blue: 57 },
    desc: "压痕",
    parent: [],
  },
  {
    class: 7,
    name: "jiaza",
    tag: "Z0",
    color: { red: 46, green: 79, blue: 209 },
    desc: "夹杂",
    parent: [],
  },
  {
    class: 8,
    name: "yanghuatiepi",
    tag: "Y1",
    color: { red: 56, green: 199, blue: 114 },
    desc: "氧化铁皮",
    parent: [],
  },
  {
    class: 9,
    name: "jieba",
    tag: "J0",
    color: { red: 43, green: 51, blue: 213 },
    desc: "结疤",
    parent: [],
  },
  {
    class: 10,
    name: "qipi",
    tag: "Q0",
    color: { red: 175, green: 80, blue: 145 },
    desc: "起皮",
    parent: [],
  },
  {
    class: 11,
    name: "bianlie",
    tag: "B0",
    color: { red: 54, green: 201, blue: 102 },
    desc: "边裂",
    parent: [],
  },
];

// 提取缺陷类型描述列表
const defectTypeDescriptions = defectClassItems
  .slice(1) // 排除 "未命名"
  .map((item) => item.desc);

/**
 * 生成真实格式的钢板号（10位字符串）
 * 格式：H + 9位数字
 */
function generateSteelNo(seqNo: number): string {
  const randomPart = String(seqNo * 123456 + 411000000).slice(
    0,
    9,
  );
  return `H${randomPart}`;
}

/**
 * 生成随机钢板数据（基于真实数据格式）
 */
function generateMockSteel(seqNo: number): SteelItemRaw {
  const now = new Date();
  const timestamp = new Date(now.getTime() - seqNo * 60000);

  return {
    seq_no: seqNo,
    steel_no: generateSteelNo(seqNo),
    steel_type:
      steelGrades[
        Math.floor(Math.random() * steelGrades.length)
      ],
    length: Math.floor(Math.random() * 2000) + 6000,
    width: Math.floor(Math.random() * 1000) + 3000,
    thickness: Math.floor(Math.random() * 200) + 100,
    timestamp: timestamp.toISOString(),
    level: ["A", "B", "C", "D"][
      Math.floor(Math.random() * 4)
    ] as "A" | "B" | "C" | "D",
    defect_count: Math.floor(Math.random() * 50) + 50,
  };
}

/**
 * 生成随机缺陷数据（基于真实数据格式）
 */
export function generateMockDefect(
  seqNo: number,
  index: number,
): DefectItemRaw {
  const severities: Severity[] = ["low", "medium", "high"];
  const surfaces: Surface[] = ["top", "bottom"];
  const surface =
    surfaces[Math.floor(Math.random() * surfaces.length)];

  const frameWidth = 16384;
  const frameHeight = 1024;

  const defectType =
    defectTypeDescriptions[
      Math.floor(Math.random() * defectTypeDescriptions.length)
    ];

  const defectWidth = Math.floor(Math.random() * 600) + 200;
  const defectHeight = Math.floor(Math.random() * 200) + 50;
  const x = Math.floor(
    Math.random() * (frameWidth - defectWidth - 1000) + 500,
  );
  const y = Math.floor(
    Math.random() * (frameHeight - defectHeight - 100) + 50,
  );

  const maxFrameIndex = surface === "top" ? 19 : 21;

  return {
    defect_id: `${500 + index}`,
    defect_type: defectType,
    severity:
      severities[Math.floor(Math.random() * severities.length)],
    x: x,
    y: y,
    width: defectWidth,
    height: defectHeight,
    confidence: 1.0,
    surface: surface,
    image_index: Math.floor(Math.random() * maxFrameIndex),
  };
}

function generateMockDefectList(
  seqNo: number,
  defectCount?: number,
): DefectItemRaw[] {
  const count =
    defectCount ?? Math.floor(Math.random() * 50) + 50;
  const defects: DefectItemRaw[] = [];

  for (let i = 0; i < count; i++) {
    defects.push(generateMockDefect(seqNo, i));
  }

  return defects;
}

/**
 * 生成缺陷列表（前端映射格式）
 */
export function generateMockDefects(
  seqNo: number,
  defectCount?: number,
): DefectItem[] {
  return generateMockDefectList(seqNo, defectCount).map(
    mapDefectItem,
  );
}

/**
 * Mock: 获取钢板列表
 */
export async function mockListSteels(
  limit: number = 20,
): Promise<SteelListResponse> {
  await new Promise((resolve) =>
    setTimeout(resolve, 300 + Math.random() * 200),
  );

  const steels: SteelItemRaw[] = [];
  const startSeqNo = 1000;
  for (let i = 0; i < limit; i++) {
    steels.push(generateMockSteel(startSeqNo + i));
  }

  return {
    steels: steels.reverse(),
    total: limit,
  };
}

/**
 * Mock: 获取指定钢板的缺陷列表
 */
export async function mockGetDefects(
  seqNo: number,
): Promise<DefectResponse> {
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 150),
  );

  const defects: DefectItemRaw[] =
    generateMockDefectList(seqNo);

  const surfaceImages: SurfaceImageInfo[] = [
    {
      surface: "top",
      frame_count: 19,
      image_width: 16384,
      image_height: 1024,
    },
    {
      surface: "bottom",
      frame_count: 21,
      image_width: 16384,
      image_height: 1024,
    },
  ];

  return {
    seq_no: seqNo,
    defects,
    total_count: defects.length,
    surface_images: surfaceImages,
  };
}

/**
 * Mock: 获取缺陷图像 URL
 */
export async function mockGetFrameImage(
  surface: Surface,
  seqNo: number,
  imageIndex: number,
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const width = 800;
  const height = 600;
  const seed = `${seqNo}-${surface}-${imageIndex}`;

  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Mock: 健康检查
 */
export async function mockHealthCheck(): Promise<HealthResponse> {
  await new Promise((resolve) =>
    setTimeout(resolve, 50 + Math.random() * 50),
  );

  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0-mock",
    database: {
      connected: true,
      latency_ms: Math.random() * 10 + 5,
    },
  };
}

/**
 * Mock: 缺陷字典
 */
export async function mockGetDefectClasses(): Promise<DefectClassesResponse> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return {
    num: defectClassItems.length,
    items: defectClassItems,
  };
}

/**
 * Mock: API 节点列表
 */
export async function mockGetApiList(): Promise<ApiNode[]> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const now = new Date();
  return [
    {
      key: "mock-line-a",
      name: "模拟产线 A",
      mode: "mock",
      profile: "default",
      ip: "127.0.0.1",
      port: 8120,
      online: true,
      latest_timestamp: now.toISOString(),
      latest_age_seconds: 15,
    },
    {
      key: "mock-line-b",
      name: "模拟产线 B",
      mode: "mock",
      profile: "default",
      ip: "127.0.0.1",
      port: 8121,
      online: true,
      latest_timestamp: now.toISOString(),
      latest_age_seconds: 45,
    },
    {
      key: "mock-line-c",
      name: "模拟产线 C",
      mode: "mock",
      profile: "default",
      ip: "127.0.0.1",
      port: 8122,
      online: false,
      latest_timestamp: now.toISOString(),
      latest_age_seconds: 3600,
    },
  ];
}
