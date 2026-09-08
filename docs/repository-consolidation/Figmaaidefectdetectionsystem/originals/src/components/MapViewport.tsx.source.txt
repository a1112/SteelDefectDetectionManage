import React, { useMemo, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export interface MapViewportProps {
  worldWidth: number;
  worldHeight: number;
}

export const MapViewport: React.FC<MapViewportProps> = ({ worldWidth, worldHeight }) => {
  const handleZoomIn = useCallback(() => {
    // zoomIn is provided by TransformWrapper's render prop
  }, []);

  const handleZoomOut = useCallback(() => {
    // zoomOut is provided by TransformWrapper's render prop
  }, []);

  const handleResetTransform = useCallback(() => {
    // resetTransform is provided by TransformWrapper's render prop
  }, []);

  const gridElements = useMemo(() => renderGrid(worldWidth, worldHeight), [worldWidth, worldHeight]);

  return (
    <div className="w-full h-full bg-black/80 border border-border overflow-hidden relative">
      <TransformWrapper
        minScale={0.1}
        maxScale={4}
        wheel={{ step: 0.1 }}
        limitToBounds={false}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <button
                onClick={() => zoomIn()}
                className="px-2 py-1 text-[10px] bg-white/10 text-white rounded border border-white/20"
              >
                +
              </button>
              <button
                onClick={() => zoomOut()}
                className="px-2 py-1 text-[10px] bg-white/10 text-white rounded border border-white/20"
              >
                -
              </button>
              <button
                onClick={() => resetTransform()}
                className="px-2 py-1 text-[10px] bg-white/10 text-white rounded border border-white/20"
              >
                重置
              </button>
            </div>

            <TransformComponent>
              <div
                style={{
                  position: 'relative',
                  width: worldWidth,
                  height: worldHeight,
                  background: '#111',
                }}
              >
                {gridElements}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

function renderGrid(worldWidth: number, worldHeight: number) {
  const tileSize = 200;
  const tiles: JSX.Element[] = [];

  const tilesX = Math.ceil(worldWidth / tileSize);
  const tilesY = Math.ceil(worldHeight / tileSize);

  for (let ty = 0; ty < tilesY; ty += 1) {
    for (let tx = 0; tx < tilesX; tx += 1) {
      const left = tx * tileSize;
      const top = ty * tileSize;
      const width = Math.min(tileSize, worldWidth - left);
      const height = Math.min(tileSize, worldHeight - top);

      tiles.push(
        <div
          key={`${tx}-${ty}`}
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            border: '1px dashed rgba(255,255,255,0.3)',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.7)',
              padding: 2,
              pointerEvents: 'none',
            }}
          >
            [{tx},{ty}]
          </span>
        </div>,
      );
    }
  }

  return tiles;
}

