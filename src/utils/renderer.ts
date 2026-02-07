import type { Grid, PlacedFurniture } from '../types';
import { gridToIso, TILE_WIDTH, TILE_HEIGHT } from './isometric';

interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  grid: Grid;
  offsetX: number;
  offsetY: number;
  hoverTile: { x: number; y: number } | null;
  backgroundImage: HTMLImageElement | null;
  spriteSheet: HTMLImageElement | null;
}

function drawTilePath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number
) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
}

function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isHover: boolean
) {
  drawTilePath(ctx, cx, cy);
  ctx.fillStyle = isHover ? '#b8d4e3' : '#d4e6f1';
  ctx.fill();
  ctx.strokeStyle = '#85a5b5';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawEmptyTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isHover: boolean
) {
  drawTilePath(ctx, cx, cy);
  ctx.fillStyle = isHover ? '#e8e8e8' : '#f0f0f0';
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawWallTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isHover: boolean
) {
  const wallHeight = 20;
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  drawTilePath(ctx, cx, cy - wallHeight);
  ctx.fillStyle = isHover ? '#7a8a9a' : '#8899aa';
  ctx.fill();
  ctx.strokeStyle = '#556677';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - wallHeight);
  ctx.lineTo(cx, cy + hh - wallHeight);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = isHover ? '#5a6a7a' : '#667788';
  ctx.fill();
  ctx.strokeStyle = '#556677';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - wallHeight);
  ctx.lineTo(cx, cy + hh - wallHeight);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx + hw, cy);
  ctx.closePath();
  ctx.fillStyle = isHover ? '#4a5a6a' : '#556677';
  ctx.fill();
  ctx.strokeStyle = '#445566';
  ctx.stroke();
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  placed: PlacedFurniture,
  offsetX: number,
  offsetY: number,
  spriteSheet: HTMLImageElement | null
) {
  const { item, gridX, gridY } = placed;
  const iso = gridToIso(gridX, gridY);
  const cx = iso.x + offsetX;
  const cy = iso.y + offsetY;

  if (spriteSheet && item.sprite) {
    const { x: sx, y: sy, w: sw, h: sh } = item.sprite;
    const maxW = TILE_WIDTH * 1.1;
    const scale = maxW / sw;
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(
      spriteSheet,
      sx, sy, sw, sh,
      cx - dw / 2,
      cy - dh + TILE_HEIGHT / 2,
      dw,
      dh
    );
    return;
  }

  const furnitureHeight = 24;
  const hw = (TILE_WIDTH / 2) * Math.min(item.width, 1);
  const hh = (TILE_HEIGHT / 2) * Math.min(item.height, 1);

  ctx.beginPath();
  ctx.moveTo(cx, cy - hh - furnitureHeight);
  ctx.lineTo(cx + hw, cy - furnitureHeight);
  ctx.lineTo(cx, cy + hh - furnitureHeight);
  ctx.lineTo(cx - hw, cy - furnitureHeight);
  ctx.closePath();
  ctx.fillStyle = item.color;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - furnitureHeight);
  ctx.lineTo(cx, cy + hh - furnitureHeight);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = darkenColor(item.color, 0.8);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - furnitureHeight);
  ctx.lineTo(cx, cy + hh - furnitureHeight);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx + hw, cy);
  ctx.closePath();
  ctx.fillStyle = darkenColor(item.color, 0.6);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.name, cx, cy - furnitureHeight - hh / 2);
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
}

export function renderGrid(options: RenderOptions) {
  const { ctx, grid, offsetX, offsetY, hoverTile, backgroundImage, spriteSheet } = options;
  const canvas = ctx.canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (backgroundImage) {
    ctx.globalAlpha = 0.3;
    const scale = Math.min(
      canvas.width / backgroundImage.width,
      canvas.height / backgroundImage.height
    ) * 0.8;
    const imgW = backgroundImage.width * scale;
    const imgH = backgroundImage.height * scale;
    ctx.drawImage(
      backgroundImage,
      (canvas.width - imgW) / 2,
      (canvas.height - imgH) / 2,
      imgW,
      imgH
    );
    ctx.globalAlpha = 1;
  }

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const furnitureList: PlacedFurniture[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const iso = gridToIso(x, y);
      const cx = iso.x + offsetX;
      const cy = iso.y + offsetY;
      const isHover = hoverTile !== null && hoverTile.x === x && hoverTile.y === y;

      switch (cell.type) {
        case 'floor':
          drawFloorTile(ctx, cx, cy, isHover);
          break;
        case 'wall':
          drawWallTile(ctx, cx, cy, isHover);
          break;
        case 'empty':
        default:
          drawEmptyTile(ctx, cx, cy, isHover);
          break;
      }

      if (cell.furniture) {
        furnitureList.push(cell.furniture);
      }
    }
  }

  for (const placed of furnitureList) {
    drawFurniture(ctx, placed, offsetX, offsetY, spriteSheet);
  }
}
