import { useState, useEffect, useCallback } from "react";
import { env } from "../config/env";
import { listSteels } from "../api/client";
import type { SteelItem } from "../api/types";
import type {
  DetectionRecord,
  SteelPlate,
} from "../types/app.types";
import { generateRandomDefects } from "../utils/defects";

/**
 * 钢板数据管理 Hook
 */
export const useSteelPlates = (
  selectedPlateId: string | null,
  setSelectedPlateId: (id: string | null) => void,
  history: DetectionRecord[],
  setHistory: (history: DetectionRecord[]) => void,
) => {
  const [steelPlates, setSteelPlates] = useState<SteelPlate[]>(
    [],
  );
  const [isLoadingSteels, setIsLoadingSteels] = useState(false);
  const [steelsLoadError, setSteelsLoadError] = useState<
    string | null
  >(null);

  // 加载钢板列表的函数（提取出来以便重用）
  const loadSteelPlates = useCallback(async () => {
    setIsLoadingSteels(true);
    setSteelsLoadError(null);

    try {
      const items: SteelItem[] = await listSteels(50);

      // 将 API 返回的 SteelItem 转换为 SteelPlate 格式
      const mapped: SteelPlate[] = items.map((item) => ({
        serialNumber: item.serialNumber,
        plateId: item.plateId,
        steelGrade: item.steelGrade,
        dimensions: item.dimensions,
        timestamp: item.timestamp,
        level: item.level,
        defectCount: item.defectCount,
      }));

      setSteelPlates(mapped);
      console.log(
        `✅ 成功加载 ${mapped.length} 条钢板记录 (${env.getMode()} 模式)`,
      );

      // 🔧 开发模式：自动选择第一个钢板并初始化历史记录
      if (
        env.isDevelopment() &&
        mapped.length > 0 &&
        !selectedPlateId
      ) {
        const firstPlate = mapped[0];
        setSelectedPlateId(firstPlate.serialNumber);
        console.log(
          `🎯 开发模式：自动选择钢板 ${firstPlate.plateId}`,
        );

        // 如果 history 为空，为前几个钢板创建模拟历史记录
        if (history.length === 0) {
          const mockHistory = mapped
            .slice(0, 5)
            .map((plate, index) => {
              const defects = generateRandomDefects();
              const status =
                defects.length === 0
                  ? "pass"
                  : defects.some((d) => d.severity === "high")
                    ? "fail"
                    : "warning";

              return {
                id: `${plate.plateId}-${Date.now() - index * 1000}`,
                defectImageUrl: `https://images.unsplash.com/photo-1755377205509-866d6e727ee6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400`,
                fullImageUrl: `https://images.unsplash.com/photo-1755377205509-866d6e727ee6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200`,
                timestamp: new Date(
                  Date.now() - index * 3600000,
                ),
                defects,
                status,
              } as DetectionRecord;
            });

          setHistory(mockHistory);
          console.log(
            `🎨 开发模式：初始化 ${mockHistory.length} 条模拟历史记录`,
          );
        }
      }
    } catch (error) {
      console.error("❌ 加载钢板列表失败:", error);
      setSteelsLoadError(
        error instanceof Error ? error.message : "加载失败",
      );

      // 生产模式失败时使用空数组，开发模式已经在 mock 层处理
      if (env.isProduction()) {
        setSteelPlates([]);
      }
    } finally {
      setIsLoadingSteels(false);
    }
  }, [selectedPlateId, setSelectedPlateId, history, setHistory]);

  // 初始加载钢板列表
  useEffect(() => {
    loadSteelPlates();

    // 监听模式切换事件，重新加载数据
    const handleModeChange = () => {
      console.log("🔄 检测到模式切换，重新加载钢板列表...");
      loadSteelPlates();
    };

    window.addEventListener(
      "app_mode_change",
      handleModeChange,
    );
    return () =>
      window.removeEventListener(
        "app_mode_change",
        handleModeChange,
      );
  }, [loadSteelPlates]);

  return {
    steelPlates,
    isLoadingSteels,
    steelsLoadError,
    loadSteelPlates,
  };
};