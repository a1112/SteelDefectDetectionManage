import { useState, useEffect, useCallback } from 'react';
import { env } from '../config/env';
import { getDefects } from '../api/client';
import type { DefectItem } from '../api/types';
import type { Defect, SteelPlate } from '../types/app.types';

/**
 * 缺陷数据管理 Hook
 */
export const useDefects = (selectedPlateId: string | null, steelPlates: SteelPlate[]) => {
  const [plateDefects, setPlateDefects] = useState<Defect[]>([]);
  const [isLoadingDefects, setIsLoadingDefects] = useState(false);

  // 使用 useCallback 包装加载函数，仅依赖 selectedPlateId
  // 注意：不依赖 steelPlates，避免钢板列表更新时重复请求
  const loadPlateDefects = useCallback(async () => {
    if (!selectedPlateId) {
      setPlateDefects([]);
      return;
    }

    setIsLoadingDefects(true);

    try {
      // 直接使用 seq_no（钢板编号作为序列号）
      const seqNo = parseInt(selectedPlateId, 10);
      console.log(`🔍 加载钢板 ${selectedPlateId} (seq_no: ${seqNo}) 的缺陷数据...`);

      const defectItems: DefectItem[] = await getDefects(seqNo);

      // 将 DefectItem 转换为 Defect 格式
      const mapped: Defect[] = defectItems.map(item => ({
        id: item.id,
        type: item.type,
        severity: item.severity,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        confidence: item.confidence,
        surface: item.surface,
        imageIndex: item.imageIndex,
      }));

      setPlateDefects(mapped);
      console.log(`✅ 成功加载 ${mapped.length} 个缺陷 (${env.getMode()} 模式)`);
    } catch (error) {
      console.error('❌ 加载缺陷数据失败:', error);
      setPlateDefects([]);
    } finally {
      setIsLoadingDefects(false);
    }
  }, [selectedPlateId]);

  // 当选中钢板或钢板列表变化时，加载该钢板的缺陷数据
  useEffect(() => {
    loadPlateDefects();
  }, [loadPlateDefects]);

  return {
    plateDefects,
    isLoadingDefects
  };
};