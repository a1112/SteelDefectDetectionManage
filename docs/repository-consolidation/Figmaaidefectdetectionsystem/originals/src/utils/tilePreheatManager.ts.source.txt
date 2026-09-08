import { preheatTiles, preheatAdjacentTiles } from '../api/client';
import type { Surface } from '../api/types';

export interface TileInfo {
  level: number;
  tileX: number;
  tileY: number;
  tileSize?: number;
}

export interface PreheatRequest {
  surface: Surface;
  seqNo: number;
  tiles: TileInfo[];
  view?: string;
  priority?: 'low' | 'normal' | 'high';
  timestamp: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export interface UserAction {
  type: 'pan' | 'zoom' | 'drag' | 'idle';
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  timestamp: number;
  velocity?: {
    x: number;
    y: number;
  };
}

/**
 * 智能瓦片预热管理器
 * 基于用户行为预测和预加载瓦片
 */
export class TilePreheatManager {
  private preheatQueue: PreheatRequest[] = [];
  private userActionHistory: UserAction[] = [];
  private preheatCache = new Map<string, boolean>(); // 避免重复预热
  private isProcessing = false;
  private processingTimer: number | null = null;
  private lastPreheatTime = 0;
  private preheatThrottle = 200; // 200ms 节流

  // 配置参数
  private readonly maxHistorySize = 10;
  private readonly preheatRadius = 2; // 预热半径
  private readonly maxBatchSize = 50; // 最大批量预热数量
  private readonly predictionThreshold = 0.7; // 预测置信度阈值

  constructor(private options: {
    enabled?: boolean;
    debug?: boolean;
    maxConcurrentRequests?: number;
  } = {}) {
    this.options = {
      enabled: true,
      debug: false,
      maxConcurrentRequests: 3,
      ...options
    };

    // 定期清理过期的预热缓存
    setInterval(() => {
      this.cleanupPreheatCache();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 记录用户行为
   */
  recordUserAction(action: UserAction): void {
    if (!this.options.enabled) return;

    // 添加到历史记录
    this.userActionHistory.push(action);

    // 保持历史记录大小
    if (this.userActionHistory.length > this.maxHistorySize) {
      this.userActionHistory.shift();
    }

    this.logDebug(`User action: ${action.type}, scale: ${action.viewport.scale}`);

    // 根据用户行为触发预热
    this.triggerPreheatBasedOnAction(action);
  }

  /**
   * 基于当前可见瓦片触发预热
   */
  async preheatFromVisibleTiles(params: {
    surface: Surface;
    seqNo: number;
    visibleTiles: TileInfo[];
    view?: string;
    immediate?: boolean;
  }): Promise<void> {
    if (!this.options.enabled || visibleTiles.length === 0) return;

    const { surface, seqNo, visibleTiles, view, immediate = false } = params;

    // 节流控制
    const now = Date.now();
    if (!immediate && now - this.lastPreheatTime < this.preheatThrottle) {
      return;
    }

    this.lastPreheatTime = now;

    try {
      this.logDebug(`Preheating ${visibleTiles.length} visible tiles`);

      // 预热相邻瓦片
      const result = await preheatAdjacentTiles({
        surface,
        seqNo,
        currentTiles: visibleTiles,
        view,
        radius: this.preheatRadius,
        includeCrossLevel: true,
      });

      this.logDebug(`Preheat result: ${result.preheated} tiles preheated`);
    } catch (error) {
      this.logDebug(`Preheat error:`, error);
    }
  }

  /**
   * 基于用户行为预测和预热
   */
  private triggerPreheatBasedOnAction(action: UserAction): void {
    if (action.type === 'idle') return;

    // 分析用户行为模式
    const prediction = this.predictNextViewport(action);
    
    if (prediction.confidence < this.predictionThreshold) {
      return;
    }

    this.logDebug(`Prediction confidence: ${prediction.confidence}, triggering preheat`);

    // 根据预测的视口预热瓦片
    // 这里需要结合当前的surface和seqNo信息
    // 实际实现中需要从外部传入这些信息
  }

  /**
   * 预测下一个视口位置
   */
  private predictNextViewport(action: UserAction): {
    viewport: UserAction['viewport'];
    confidence: number;
  } {
    if (this.userActionHistory.length < 2) {
      return {
        viewport: action.viewport,
        confidence: 0
      };
    }

    const recent = this.userActionHistory.slice(-3); // 最近3个动作
    const lastAction = recent[recent.length - 2]; // 倒数第二个动作
    const currentAction = recent[recent.length - 1]; // 当前动作

    // 计算移动速度和方向
    const deltaX = currentAction.viewport.x - lastAction.viewport.x;
    const deltaY = currentAction.viewport.y - lastAction.viewport.y;
    const deltaScale = currentAction.viewport.scale - lastAction.viewport.scale;
    
    const deltaTime = currentAction.timestamp - lastAction.timestamp;
    
    if (deltaTime === 0) {
      return {
        viewport: currentAction.viewport,
        confidence: 0
      };
    }

    // 预测下一个位置（简单的线性预测）
    const timeFactor = 1.5; // 预测1.5倍时间后的位置
    const predictedX = currentAction.viewport.x + (deltaX / deltaTime) * timeFactor;
    const predictedY = currentAction.viewport.y + (deltaY / deltaTime) * timeFactor;
    const predictedScale = currentAction.viewport.scale + (deltaScale / deltaTime) * timeFactor;

    // 计算置信度（基于动作的一致性）
    let confidence = 0.5;
    
    if (currentAction.type === 'pan' || currentAction.type === 'drag') {
      // 拖拽行为通常有明确的方向
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
      confidence = Math.min(0.9, 0.5 + velocity / 1000);
    } else if (currentAction.type === 'zoom') {
      // 缩放行为
      confidence = Math.min(0.8, 0.5 + Math.abs(deltaScale) / 0.5);
    }

    return {
      viewport: {
        x: predictedX,
        y: predictedY,
        width: currentAction.viewport.width,
        height: currentAction.viewport.height,
        scale: Math.max(0.1, Math.min(10, predictedScale)),
      },
      confidence
    };
  }

  /**
   * 批量处理预热请求
   */
  private async processBatch(requests: PreheatRequest[]): Promise<void> {
    if (requests.length === 0) return;

    // 合并相同surface和seqNo的请求
    const groupedRequests = new Map<string, PreheatRequest[]>();
    
    for (const request of requests) {
      const key = `${request.surface}-${request.seqNo}-${request.view || 'default'}`;
      if (!groupedRequests.has(key)) {
        groupedRequests.set(key, []);
      }
      groupedRequests.get(key)!.push(request);
    }

    // 处理每个分组
    const promises = Array.from(groupedRequests.entries()).map(async ([key, group]) => {
      try {
        // 合并所有瓦片
        const allTiles = group.flatMap(req => req.tiles);
        const uniqueTiles = this.deduplicateTiles(allTiles);
        
        // 限制批量大小
        const batchTiles = uniqueTiles.slice(0, this.maxBatchSize);
        
        const request = group[0]; // 使用第一个请求的参数
        const result = await preheatTiles({
          surface: request.surface,
          seqNo: request.seqNo,
          tiles: batchTiles,
          view: request.view,
          priority: request.priority,
        });

        // 解析所有promise
        group.forEach(req => req.resolve(result));
        
        this.logDebug(`Batch preheat: ${key}, ${result.preheated} tiles`);
      } catch (error) {
        // 拒绝所有promise
        group.forEach(req => req.reject(error));
        this.logDebug(`Batch preheat error: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 去重瓦片列表
   */
  private deduplicateTiles(tiles: TileInfo[]): TileInfo[] {
    const unique = new Map<string, TileInfo>();
    
    for (const tile of tiles) {
      const key = `${tile.level}-${tile.tileX}-${tile.tileY}-${tile.tileSize || 256}`;
      unique.set(key, tile);
    }
    
    return Array.from(unique.values());
  }

  /**
   * 清理过期的预热缓存
   */
  private cleanupPreheatCache(): void {
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5分钟过期

    for (const [key] of this.preheatCache) {
      const [_, timestamp] = key.split('|');
      if (now - parseInt(timestamp) > expireTime) {
        this.preheatCache.delete(key);
      }
    }
  }

  /**
   * 添加预热请求到队列
   */
  private addToQueue(request: PreheatRequest): void {
    this.preheatQueue.push(request);
    
    if (!this.isProcessing) {
      this.scheduleProcessing();
    }
  }

  /**
   * 调度处理队列
   */
  private scheduleProcessing(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    this.processingTimer = setTimeout(() => {
      this.processQueue();
    }, 50); // 50ms延迟批量处理
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preheatQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.preheatQueue.splice(0, this.options.maxConcurrentRequests || 3);

    try {
      await this.processBatch(batch);
    } catch (error) {
      this.logDebug('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      
      // 如果还有队列，继续处理
      if (this.preheatQueue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  /**
   * 调试日志
   */
  private logDebug(...args: any[]): void {
    if (this.options.debug) {
      console.log('[TilePreheatManager]', ...args);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      queueLength: this.preheatQueue.length,
      isProcessing: this.isProcessing,
      userActionHistory: this.userActionHistory.length,
      preheatCacheSize: this.preheatCache.size,
    };
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.preheatQueue = [];
    this.userActionHistory = [];
    this.preheatCache.clear();
    this.isProcessing = false;
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }
}

// 全局预热管理器实例
export const globalPreheatManager = new TilePreheatManager({
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
  maxConcurrentRequests: 3,
});