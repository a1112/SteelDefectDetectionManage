/**
 * LRU (Least Recently Used) 图像缓存
 * 用于防止图像瓦片缓存无限增长导致内存泄漏
 */

export class LRUTileCache {
  private cache = new Map<string, HTMLImageElement>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): HTMLImageElement | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 重新插入以更新访问顺序（LRU）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: HTMLImageElement): void {
    // 如果键已存在，删除它以便更新位置
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 如果达到最大大小，删除最旧的条目（第一个）
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const toRemove = this.cache.get(firstKey);
        // 释放图像资源
        if (toRemove) {
          toRemove.src = '';
        }
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    // 释放所有图像资源
    this.cache.forEach((img) => {
      img.src = '';
    });
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  // 兼容 Map 接口的方法
  entries(): IterableIterator<[string, HTMLImageElement]> {
    return this.cache.entries();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  values(): IterableIterator<HTMLImageElement> {
    return this.cache.values();
  }

  forEach(callbackfn: (value: HTMLImageElement, key: string, map: Map<string, HTMLImageElement>) => void): void {
    this.cache.forEach(callbackfn);
  }
}

/**
 * 创建或获取全局 LRU 缓存实例
 */
let globalCaches: Record<string, LRUTileCache> | null = null;

export function getOrCreateLRUCache(name: string, maxSize: number = 500): LRUTileCache {
  if (!globalCaches) {
    globalCaches = {};

    // 在页面卸载时清理所有缓存
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        Object.values(globalCaches!).forEach(cache => cache.clear());
        globalCaches = null;
      });
    }
  }

  if (!globalCaches[name]) {
    globalCaches[name] = new LRUTileCache(maxSize);
  }

  return globalCaches[name];
}

/**
 * 清理指定缓存
 */
export function clearLRUCache(name: string): void {
  if (globalCaches && globalCaches[name]) {
    globalCaches[name].clear();
    delete globalCaches[name];
  }
}

/**
 * 清理所有缓存
 */
export function clearAllLRUCaches(): void {
  if (globalCaches) {
    Object.values(globalCaches).forEach(cache => cache.clear());
    globalCaches = null;
  }
}
