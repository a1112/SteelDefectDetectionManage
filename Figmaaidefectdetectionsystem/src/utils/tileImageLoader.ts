type TileImageCacheLike = {
  get(key: string): HTMLImageElement | undefined;
  set(key: string, value: HTMLImageElement): void;
};

type TileImagePriority = "high" | "low" | "auto";

export type TileImageLoadTask = {
  cacheKey: string;
  url: string;
  cache: TileImageCacheLike;
  loading: Set<string>;
  scope?: string;
  priority?: TileImagePriority;
  onLoad?: (image: HTMLImageElement) => void;
  onError?: () => void;
};

const MAX_CONCURRENT_TILE_IMAGE_LOADS = 6;
const MAX_PENDING_TILE_IMAGE_LOADS = 400;
const TILE_IMAGE_LOAD_TIMEOUT_MS = 15000;

let activeLoads = 0;
const pendingTasks: TileImageLoadTask[] = [];
const pendingKeys = new Set<string>();

const priorityRank = (priority?: TileImagePriority): number => {
  switch (priority) {
    case "high":
      return 0;
    case "low":
      return 2;
    default:
      return 1;
  }
};

const enqueuePendingTask = (task: TileImageLoadTask) => {
  const rank = priorityRank(task.priority);
  const insertAt = pendingTasks.findIndex(
    (item) => priorityRank(item.priority) > rank,
  );
  if (insertAt >= 0) {
    pendingTasks.splice(insertAt, 0, task);
  } else {
    pendingTasks.push(task);
  }
};

const promotePendingTask = (task: TileImageLoadTask): boolean => {
  const existingIndex = pendingTasks.findIndex(
    (item) => item.cacheKey === task.cacheKey,
  );
  if (existingIndex < 0) {
    return false;
  }

  const existingTask = pendingTasks[existingIndex];
  if (priorityRank(task.priority) >= priorityRank(existingTask.priority)) {
    return true;
  }

  pendingTasks.splice(existingIndex, 1);
  enqueuePendingTask({
    ...existingTask,
    ...task,
  });
  return true;
};

const dropLowestPriorityPendingTask = () => {
  let dropRank = -1;
  let dropIndex = -1;
  for (let index = 0; index < pendingTasks.length; index += 1) {
    const rank = priorityRank(pendingTasks[index].priority);
    if (rank > dropRank) {
      dropRank = rank;
      dropIndex = index;
    }
  }
  if (dropIndex < 0) {
    return;
  }
  const dropped = pendingTasks.splice(dropIndex, 1)[0];
  if (dropped) {
    pendingKeys.delete(dropped.cacheKey);
    dropped.loading.delete(dropped.cacheKey);
  }
};

const schedulePump = () => {
  if (typeof window === "undefined") {
    pumpTileImageLoads();
    return;
  }
  window.setTimeout(pumpTileImageLoads, 0);
};

const finishTask = (
  task: TileImageLoadTask,
  image: HTMLImageElement | null,
) => {
  if (image) {
    task.cache.set(task.cacheKey, image);
    task.onLoad?.(image);
  } else {
    task.onError?.();
  }
  task.loading.delete(task.cacheKey);
  activeLoads = Math.max(0, activeLoads - 1);
  schedulePump();
};

const clearImageHandlers = (image: HTMLImageElement) => {
  image.onload = null;
  image.onerror = null;
};

function pumpTileImageLoads() {
  while (
    activeLoads < MAX_CONCURRENT_TILE_IMAGE_LOADS &&
    pendingTasks.length > 0
  ) {
    const task = pendingTasks.shift();
    if (!task) return;
    pendingKeys.delete(task.cacheKey);

    const cached = task.cache.get(task.cacheKey);
    if (cached?.complete) {
      task.loading.delete(task.cacheKey);
      continue;
    }

    activeLoads += 1;
    const image = new Image();
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const settle = (loadedImage: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      clearImageHandlers(image);
      finishTask(task, loadedImage);
    };
    image.decoding = "async";
    (image as HTMLImageElement & { fetchPriority?: TileImagePriority }).fetchPriority =
      task.priority ?? "auto";
    image.onload = () => settle(image);
    image.onerror = () => settle(null);
    timeoutId = setTimeout(() => {
      image.src = "";
      settle(null);
    }, TILE_IMAGE_LOAD_TIMEOUT_MS);
    image.src = task.url;
  }
}

export function queueTileImageLoad(task: TileImageLoadTask): void {
  const cached = task.cache.get(task.cacheKey);
  if (cached?.complete || task.loading.has(task.cacheKey) || pendingKeys.has(task.cacheKey)) {
    if (pendingKeys.has(task.cacheKey)) {
      promotePendingTask(task);
    }
    return;
  }

  task.loading.add(task.cacheKey);
  pendingKeys.add(task.cacheKey);
  enqueuePendingTask(task);

  if (pendingTasks.length > MAX_PENDING_TILE_IMAGE_LOADS) {
    dropLowestPriorityPendingTask();
  }

  schedulePump();
}

export function cancelPendingTileImageLoads(
  predicate?: (task: TileImageLoadTask) => boolean,
): number {
  let canceled = 0;
  for (let index = pendingTasks.length - 1; index >= 0; index -= 1) {
    const task = pendingTasks[index];
    if (predicate && !predicate(task)) {
      continue;
    }
    pendingTasks.splice(index, 1);
    pendingKeys.delete(task.cacheKey);
    task.loading.delete(task.cacheKey);
    canceled += 1;
  }
  return canceled;
}
