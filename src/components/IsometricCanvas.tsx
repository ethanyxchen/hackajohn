import { useRef, useEffect, useState, useCallback } from 'react';
import type { Grid, FurnitureItem } from '../types';
import { useIsometric } from '../hooks/useIsometric';
import { renderGrid } from '../utils/renderer';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 16;

interface Props {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  onFurniturePlace: (x: number, y: number) => void;
  onFurnitureRemove: (x: number, y: number) => void;
  drawMode: 'tile' | 'furniture';
  selectedFurniture: FurnitureItem | null;
  backgroundImage: HTMLImageElement | null;
  spriteSheet: HTMLImageElement | null;
}

export default function IsometricCanvas({
  grid,
  onTileClick,
  onFurniturePlace,
  onFurnitureRemove,
  drawMode,
  selectedFurniture,
  backgroundImage,
  spriteSheet,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);
  const { offset, screenToGrid } = useIsometric(GRID_SIZE, GRID_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderGrid({
      ctx,
      grid,
      offsetX: offset.x,
      offsetY: offset.y,
      hoverTile,
      backgroundImage,
      spriteSheet,
    });
  }, [grid, offset, hoverTile, backgroundImage, spriteSheet]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const gridPos = screenToGrid(x, y);
      setHoverTile(gridPos);
    },
    [screenToGrid]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverTile(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const gridPos = screenToGrid(x, y);
      if (!gridPos) return;

      if (drawMode === 'tile') {
        onTileClick(gridPos.x, gridPos.y);
      } else if (drawMode === 'furniture') {
        const cell = grid[gridPos.y]?.[gridPos.x];
        if (!cell) return;

        if (cell.furniture) {
          onFurnitureRemove(gridPos.x, gridPos.y);
        } else if (selectedFurniture && cell.type === 'floor') {
          onFurniturePlace(gridPos.x, gridPos.y);
        }
      }
    },
    [drawMode, grid, screenToGrid, selectedFurniture, onTileClick, onFurniturePlace, onFurnitureRemove]
  );

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: hoverTile ? 'pointer' : 'default' }}
      />
      {hoverTile && (
        <div className="tile-info">
          Tile: ({hoverTile.x}, {hoverTile.y})
        </div>
      )}
    </div>
  );
}
