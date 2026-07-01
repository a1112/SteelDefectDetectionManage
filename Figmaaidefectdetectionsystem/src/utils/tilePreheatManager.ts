import { preheatTiles } from '../api/client';
import type { Surface } from '../api/types';

export interface TileInfo {
  level: number;
  tileX: number;
  tileY: number;
  tileSize?: number;
}

interface TileBounds {
  imageWidth?: number;
  imageHeight?: number;
}

export interface PreheatRequest extends TileBounds {
  surface: Surface;
  seqNo: number;
  tiles: TileInfo[];
  view?: string;
  orientation?: "horizontal" | "vertical";
  maxLevel?: number;
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

export class TilePreheatManager {
  private preheatQueue: PreheatRequest[] = [];
  private userActionHistory: UserAction[] = [];
  private preheatCache = new Map<string, number>();
  private isProcessing = false;
  private processingTimer: number | null = null;
  private lastPreheatTime = 0;
  private preheatThrottle = 200;

  private readonly maxHistorySize = 10;
  private readonly preheatRadius = 2;
  private readonly maxBatchSize = 50;
  private readonly maxQueueSize = 12;
  private readonly preheatCacheTtl = 5 * 60 * 1000;
  private readonly predictionThreshold = 0.7;

  constructor(private options: {
    enabled?: boolean;
    debug?: boolean;
    maxConcurrentRequests?: number;
  } = {}) {
    this.options = {
      enabled: true,
      debug: false,
      maxConcurrentRequests: 3,
      ...options,
    };

    setInterval(() => {
      this.cleanupPreheatCache();
    }, 60000);
  }

  recordUserAction(action: UserAction): void {
    if (!this.options.enabled) return;

    this.userActionHistory.push(action);
    if (this.userActionHistory.length > this.maxHistorySize) {
      this.userActionHistory.shift();
    }

    this.logDebug(`User action: ${action.type}, scale: ${action.viewport.scale}`);
    this.triggerPreheatBasedOnAction(action);
  }

  async preheatFromVisibleTiles(params: {
    surface: Surface;
    seqNo: number;
    visibleTiles: TileInfo[];
    view?: string;
    orientation?: "horizontal" | "vertical";
    maxLevel?: number;
    imageWidth?: number;
    imageHeight?: number;
    immediate?: boolean;
  }): Promise<void> {
    const {
      surface,
      seqNo,
      visibleTiles,
      view,
      orientation,
      maxLevel,
      imageWidth,
      imageHeight,
      immediate = false,
    } = params;
    if (!this.options.enabled || visibleTiles.length === 0) return;

    const now = Date.now();
    if (!immediate && now - this.lastPreheatTime < this.preheatThrottle) {
      return;
    }
    this.lastPreheatTime = now;

    const candidateTiles = this.buildAdjacentTiles({
      visibleTiles,
      maxLevel,
      imageWidth,
      imageHeight,
    });
    if (candidateTiles.length === 0) return;

    return new Promise((resolve, reject) => {
      this.addToQueue({
        surface,
        seqNo,
        tiles: candidateTiles,
        view,
        orientation,
        maxLevel,
        imageWidth,
        imageHeight,
        priority: immediate ? 'high' : 'normal',
        timestamp: now,
        resolve,
        reject,
      });
    });
  }

  private triggerPreheatBasedOnAction(action: UserAction): void {
    if (action.type === 'idle') return;

    const prediction = this.predictNextViewport(action);
    if (prediction.confidence < this.predictionThreshold) {
      return;
    }

    this.logDebug(`Prediction confidence: ${prediction.confidence}`);
  }

  private predictNextViewport(action: UserAction): {
    viewport: UserAction['viewport'];
    confidence: number;
  } {
    if (this.userActionHistory.length < 2) {
      return {
        viewport: action.viewport,
        confidence: 0,
      };
    }

    const recent = this.userActionHistory.slice(-3);
    const lastAction = recent[recent.length - 2];
    const currentAction = recent[recent.length - 1];
    const deltaX = currentAction.viewport.x - lastAction.viewport.x;
    const deltaY = currentAction.viewport.y - lastAction.viewport.y;
    const deltaScale = currentAction.viewport.scale - lastAction.viewport.scale;
    const deltaTime = currentAction.timestamp - lastAction.timestamp;

    if (deltaTime === 0) {
      return {
        viewport: currentAction.viewport,
        confidence: 0,
      };
    }

    const timeFactor = 1.5;
    const predictedX = currentAction.viewport.x + (deltaX / deltaTime) * timeFactor;
    const predictedY = currentAction.viewport.y + (deltaY / deltaTime) * timeFactor;
    const predictedScale = currentAction.viewport.scale + (deltaScale / deltaTime) * timeFactor;
    let confidence = 0.5;

    if (currentAction.type === 'pan' || currentAction.type === 'drag') {
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
      confidence = Math.min(0.9, 0.5 + velocity / 1000);
    } else if (currentAction.type === 'zoom') {
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
      confidence,
    };
  }

  private async processBatch(requests: PreheatRequest[]): Promise<void> {
    if (requests.length === 0) return;

    const groupedRequests = new Map<string, PreheatRequest[]>();
    for (const request of requests) {
      const key = [
        request.surface,
        request.seqNo,
        request.view || 'default',
        request.orientation || 'vertical',
      ].join('|');
      if (!groupedRequests.has(key)) {
        groupedRequests.set(key, []);
      }
      groupedRequests.get(key)!.push(request);
    }

    const promises = Array.from(groupedRequests.entries()).map(async ([key, group]) => {
      try {
        const request = group[0];
        const allTiles = group.flatMap((item) => item.tiles);
        const batchTiles = this.takeFreshTiles({
          surface: request.surface,
          seqNo: request.seqNo,
          view: request.view,
          orientation: request.orientation,
          maxLevel: request.maxLevel,
          imageWidth: request.imageWidth,
          imageHeight: request.imageHeight,
          tiles: allTiles,
        });

        if (batchTiles.length === 0) {
          const skipped = { success: true, preheated: 0, message: 'No fresh tiles to preheat' };
          group.forEach((item) => item.resolve(skipped));
          return;
        }

        const result = await preheatTiles({
          surface: request.surface,
          seqNo: request.seqNo,
          tiles: batchTiles,
          view: request.view,
          orientation: request.orientation,
          priority: request.priority,
        });

        group.forEach((item) => item.resolve(result));
        this.logDebug(`Batch preheat: ${key}, ${result.preheated} tiles`);
      } catch (error) {
        group.forEach((item) => item.reject(error));
        this.logDebug(`Batch preheat error: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  private buildAdjacentTiles(params: {
    visibleTiles: TileInfo[];
    maxLevel?: number;
    imageWidth?: number;
    imageHeight?: number;
  }): TileInfo[] {
    const { visibleTiles, maxLevel, imageWidth, imageHeight } = params;
    const candidates: TileInfo[] = [];

    const pushTile = (tile: TileInfo) => {
      if (!this.isTileAllowed(tile, { maxLevel, imageWidth, imageHeight })) return;
      candidates.push(tile);
    };

    for (const tile of visibleTiles) {
      if (!this.isTileAllowed(tile, { maxLevel, imageWidth, imageHeight })) continue;
      const { level, tileX, tileY, tileSize } = tile;

      for (let dx = -this.preheatRadius; dx <= this.preheatRadius; dx += 1) {
        for (let dy = -this.preheatRadius; dy <= this.preheatRadius; dy += 1) {
          if (dx === 0 && dy === 0) continue;
          pushTile({
            level,
            tileX: tileX + dx,
            tileY: tileY + dy,
            tileSize,
          });
        }
      }

      for (const adjLevel of [level - 1, level + 1]) {
        const factor = Math.pow(2, adjLevel - level);
        pushTile({
          level: adjLevel,
          tileX: Math.floor(tileX * factor),
          tileY: Math.floor(tileY * factor),
          tileSize,
        });
      }
    }

    return this.deduplicateTiles(candidates).slice(0, this.maxBatchSize);
  }

  private isTileAllowed(tile: TileInfo, bounds: TileBounds & { maxLevel?: number }): boolean {
    if (tile.level < 0 || tile.tileX < 0 || tile.tileY < 0) return false;

    const upperLevel =
      typeof bounds.maxLevel === 'number' ? Math.max(0, Math.floor(bounds.maxLevel)) : undefined;
    if (upperLevel !== undefined && tile.level > upperLevel) return false;

    if (
      typeof bounds.imageWidth === 'number' &&
      bounds.imageWidth > 0 &&
      typeof bounds.imageHeight === 'number' &&
      bounds.imageHeight > 0
    ) {
      const tileSize = Math.max(1, tile.tileSize || 256);
      const virtualTileSize = tileSize * Math.pow(2, tile.level);
      const maxTileX = Math.max(0, Math.ceil(bounds.imageWidth / virtualTileSize) - 1);
      const maxTileY = Math.max(0, Math.ceil(bounds.imageHeight / virtualTileSize) - 1);
      if (tile.tileX > maxTileX || tile.tileY > maxTileY) return false;
    }

    return true;
  }

  private deduplicateTiles(tiles: TileInfo[]): TileInfo[] {
    const unique = new Map<string, TileInfo>();
    for (const tile of tiles) {
      const key = `${tile.level}-${tile.tileX}-${tile.tileY}-${tile.tileSize || 256}`;
      unique.set(key, tile);
    }
    return Array.from(unique.values());
  }

  private getPreheatKey(params: {
    surface: Surface;
    seqNo: number;
    view?: string;
    orientation?: "horizontal" | "vertical";
    tile: TileInfo;
  }): string {
    const { surface, seqNo, view, orientation, tile } = params;
    return [
      surface,
      seqNo,
      view || 'default',
      orientation || 'vertical',
      tile.level,
      tile.tileX,
      tile.tileY,
      tile.tileSize || 256,
    ].join('|');
  }

  private takeFreshTiles(params: {
    surface: Surface;
    seqNo: number;
    view?: string;
    orientation?: "horizontal" | "vertical";
    maxLevel?: number;
    imageWidth?: number;
    imageHeight?: number;
    tiles: TileInfo[];
  }): TileInfo[] {
    const now = Date.now();
    const freshTiles: TileInfo[] = [];

    for (const tile of this.deduplicateTiles(params.tiles)) {
      if (!this.isTileAllowed(tile, params)) continue;

      const key = this.getPreheatKey({ ...params, tile });
      const lastPreheatAt = this.preheatCache.get(key);
      if (lastPreheatAt !== undefined && now - lastPreheatAt < this.preheatCacheTtl) {
        continue;
      }

      this.preheatCache.set(key, now);
      freshTiles.push(tile);
      if (freshTiles.length >= this.maxBatchSize) break;
    }

    return freshTiles;
  }

  private cleanupPreheatCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.preheatCache) {
      if (now - timestamp > this.preheatCacheTtl) {
        this.preheatCache.delete(key);
      }
    }
  }

  private addToQueue(request: PreheatRequest): void {
    if (this.preheatQueue.length >= this.maxQueueSize) {
      const dropped = this.preheatQueue.splice(0, this.preheatQueue.length - this.maxQueueSize + 1);
      dropped.forEach((item) =>
        item.resolve({ success: true, preheated: 0, message: 'Dropped stale preheat request' }),
      );
    }

    if (request.priority === 'high') {
      const firstNormalIndex = this.preheatQueue.findIndex(
        (item) => item.priority !== 'high',
      );
      if (firstNormalIndex >= 0) {
        this.preheatQueue.splice(firstNormalIndex, 0, request);
      } else {
        this.preheatQueue.push(request);
      }
    } else {
      this.preheatQueue.push(request);
    }
    if (!this.isProcessing) {
      this.scheduleProcessing();
    }
  }

  private scheduleProcessing(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    this.processingTimer = window.setTimeout(() => {
      this.processQueue();
    }, 50);
  }

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
      if (this.preheatQueue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  private logDebug(...args: any[]): void {
    if (this.options.debug) {
      console.log('[TilePreheatManager]', ...args);
    }
  }

  getStats() {
    return {
      queueLength: this.preheatQueue.length,
      isProcessing: this.isProcessing,
      userActionHistory: this.userActionHistory.length,
      preheatCacheSize: this.preheatCache.size,
    };
  }

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

export const globalPreheatManager = new TilePreheatManager({
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
  maxConcurrentRequests: 3,
});
