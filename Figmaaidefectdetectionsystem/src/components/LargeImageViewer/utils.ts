export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export const MAX_TILE_LEVEL = 16;
export const MIN_COMPRESSED_TILE_SIZE = 128;

export interface Tile {
  level: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const computeCompressedTileMaxLevel = (
  tileSize: number,
  minCompressedSize = MIN_COMPRESSED_TILE_SIZE,
): number => {
  const safeTileSize = Math.max(1, tileSize || 0);
  const safeMinSize = Math.max(1, minCompressedSize || MIN_COMPRESSED_TILE_SIZE);
  if (safeTileSize <= safeMinSize) {
    return 0;
  }
  return Math.min(
    MAX_TILE_LEVEL,
    Math.max(0, Math.floor(Math.log2(safeTileSize / safeMinSize))),
  );
};

export const computeTileLevelForScale = (
  scale: number,
  maxLevel: number,
): number => {
  const safeScale = Math.max(scale || 0, 1e-6);
  const rawLevel = Math.log2(1 / safeScale);
  if (!Number.isFinite(rawLevel) || rawLevel <= 0) {
    return 0;
  }
  return clamp(Math.floor(rawLevel), 0, Math.max(0, Math.floor(maxLevel)));
};

export const getVisibleTiles = (
  viewRect: Rect,
  tileSize: number,
  imageSize: Size,
  currentScale: number,
  forcedLevel?: number,
  maxLevelOverride?: number,
): Tile[] => {
  const computedMaxLevel = computeCompressedTileMaxLevel(tileSize);
  const maxLevel =
    typeof maxLevelOverride === 'number'
      ? Math.max(0, Math.floor(maxLevelOverride))
      : computedMaxLevel;
  let level: number;
  if (typeof forcedLevel === 'number') {
    level = Math.min(Math.max(forcedLevel, 0), maxLevel);
  } else {
    level = computeTileLevelForScale(currentScale, maxLevel);
  }

  const virtualTileSize = tileSize * Math.pow(2, level);

  const startCol = Math.floor(Math.max(0, viewRect.x) / virtualTileSize);
  const startRow = Math.floor(Math.max(0, viewRect.y) / virtualTileSize);

  const maxCols = Math.ceil(imageSize.width / virtualTileSize);
  const maxRows = Math.ceil(imageSize.height / virtualTileSize);

  const viewEndCol = Math.floor((viewRect.x + viewRect.width) / virtualTileSize);
  const viewEndRow = Math.floor((viewRect.y + viewRect.height) / virtualTileSize);

  const endCol = Math.min(maxCols - 1, viewEndCol);
  const endRow = Math.min(maxRows - 1, viewEndRow);

  const tiles: Tile[] = [];
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * virtualTileSize;
      const y = row * virtualTileSize;

      const width = col === maxCols - 1 ? imageSize.width - x : virtualTileSize;
      const height = row === maxRows - 1 ? imageSize.height - y : virtualTileSize;

      tiles.push({
        level,
        row,
        col,
        x,
        y,
        width,
        height,
      });
    }
  }
  return tiles;
};
