'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gridToScreen, screenToGrid } from '@isocity/components/game/utils';
import { TILE_HEIGHT, TILE_WIDTH } from '@isocity/components/game/types';
import type { FloorPlanData, Room, RoomType } from '@/types/floorplan';

type Tool = 'floor' | 'erase' | 'furniture';

type FurnitureType = 'sofa' | 'bed' | 'table' | 'chair' | 'plant' | 'bookshelf' | 'lamp' | 'nightstand' | 'stove' | 'television';

type Orientation = 'SE' | 'SW' | 'NW' | 'NE';
type Rotation = 0 | 90 | 180 | 270;

const ROTATION_TO_ORIENTATION: Record<Rotation, Orientation> = {
  0: 'SE',
  90: 'SW',
  180: 'NW',
  270: 'NE',
};

const ORIENTATIONS: Orientation[] = ['SE', 'SW', 'NW', 'NE'];

type FurnitureItem = {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: Rotation;
};

type ViewRotation = 0 | 90 | 180 | 270;

type FurniturePaletteItem = {
  label: string;
  w: number;
  h: number;
  height: number;
  top: string;
  side: string;
  front: string;
  swatch: string;
};

const FURNITURE_CATALOG: Record<FurnitureType, FurniturePaletteItem> = {
  sofa: {
    label: 'Sofa',
    w: 1,
    h: 1,
    height: 18,
    top: '#e4b49f',
    side: '#c78672',
    front: '#b0705d',
    swatch: '#d59d88'
  },
  bed: {
    label: 'Bed',
    w: 1,
    h: 1,
    height: 22,
    top: '#eadfcd',
    side: '#cbbda6',
    front: '#b6a58c',
    swatch: '#d8cbb6'
  },
  table: {
    label: 'Table',
    w: 1,
    h: 1,
    height: 14,
    top: '#d6c08f',
    side: '#b59e6c',
    front: '#a38a5b',
    swatch: '#c9b27c'
  },
  chair: {
    label: 'Chair',
    w: 1,
    h: 1,
    height: 14,
    top: '#e8a84c',
    side: '#c78432',
    front: '#b07228',
    swatch: '#e89830'
  },
  plant: {
    label: 'Plant',
    w: 1,
    h: 1,
    height: 20,
    top: '#9ccc75',
    side: '#7faa5b',
    front: '#6f914e',
    swatch: '#86b764'
  },
  bookshelf: {
    label: 'Bookshelf',
    w: 1,
    h: 1,
    height: 28,
    top: '#e8a84c',
    side: '#c78432',
    front: '#a06828',
    swatch: '#d49038'
  },
  lamp: {
    label: 'Lamp',
    w: 1,
    h: 1,
    height: 24,
    top: '#d4c878',
    side: '#b0a45c',
    front: '#988c4c',
    swatch: '#c8bc68'
  },
  nightstand: {
    label: 'Side Table',
    w: 1,
    h: 1,
    height: 14,
    top: '#e8a84c',
    side: '#c78432',
    front: '#a06828',
    swatch: '#d49038'
  },
  stove: {
    label: 'Stove',
    w: 1,
    h: 1,
    height: 20,
    top: '#e8e0d0',
    side: '#b09080',
    front: '#e8e0d0',
    swatch: '#c8b8a8'
  },
  television: {
    label: 'Television',
    w: 1,
    h: 1,
    height: 22,
    top: '#c8c8c8',
    side: '#888888',
    front: '#a8a8a8',
    swatch: '#999999'
  }
};

const ROOM_COLORS: Record<RoomType, { fill: string; label: string }> = {
  bedroom: { fill: 'rgba(86, 140, 214, 0.65)', label: 'rgba(86, 140, 214, 0.9)' },
  living_room: { fill: 'rgba(120, 201, 172, 0.6)', label: 'rgba(120, 201, 172, 0.9)' },
  kitchen: { fill: 'rgba(242, 192, 107, 0.7)', label: 'rgba(242, 192, 107, 0.95)' },
  bathroom: { fill: 'rgba(109, 178, 207, 0.65)', label: 'rgba(109, 178, 207, 0.95)' },
  hallway: { fill: 'rgba(195, 164, 122, 0.6)', label: 'rgba(195, 164, 122, 0.9)' },
  office: { fill: 'rgba(135, 206, 125, 0.6)', label: 'rgba(135, 206, 125, 0.9)' }
};

// Kenney sprite base tile is 208px wide; our TILE_WIDTH is 64
const KENNEY_TILE_PX = 208;

type SpriteBaseInfo = {
  baseName: string;
};

const SPRITE_BASE_MAP: Partial<Record<FurnitureType, SpriteBaseInfo>> = {
  sofa: { baseName: 'loungeSofa' },
  bed: { baseName: 'bedDouble' },
  table: { baseName: 'table' },
  chair: { baseName: 'chair' },
  plant: { baseName: 'pottedPlant' },
  bookshelf: { baseName: 'bookcaseOpen' },
  lamp: { baseName: 'lampRoundFloor' },
  nightstand: { baseName: 'sideTable' },
  stove: { baseName: 'kitchenStove' },
  television: { baseName: 'televisionModern' },
};

function useSpriteImages(spriteBaseMap: Partial<Record<FurnitureType, SpriteBaseInfo>>): Record<string, HTMLImageElement> {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const entries = Object.entries(spriteBaseMap) as [FurnitureType, SpriteBaseInfo][];
    let cancelled = false;
    const loaded: Record<string, HTMLImageElement> = {};
    let remaining = entries.length * ORIENTATIONS.length;

    for (const [type, info] of entries) {
      for (const orient of ORIENTATIONS) {
        const key = `${type}_${orient}`;
        const img = new Image();
        img.onload = () => {
          loaded[key] = img;
          remaining -= 1;
          if (remaining === 0 && !cancelled) {
            setImages({ ...loaded });
          }
        };
        img.onerror = () => {
          remaining -= 1;
          if (remaining === 0 && !cancelled) {
            setImages({ ...loaded });
          }
        };
        img.src = `/sprites/kenney/${info.baseName}_${orient}.png`;
      }
    }

    return () => { cancelled = true; };
  }, [spriteBaseMap]);

  return images;
}

const DEFAULT_WIDTH = 12;
const DEFAULT_HEIGHT = 8;
const MAX_COLS = 96;
const MAX_ROWS = 72;

function createFloor(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => true));
}

function resampleGrid(baseGrid: boolean[][], targetCols: number, targetRows: number): boolean[][] {
  const srcRows = baseGrid.length;
  const srcCols = baseGrid[0]?.length ?? 0;
  if (srcRows === 0 || srcCols === 0) return [];

  return Array.from({ length: targetRows }, (_, y) => {
    const y0 = Math.floor((y * srcRows) / targetRows);
    const y1 = Math.max(y0, Math.floor(((y + 1) * srcRows) / targetRows) - 1);
    return Array.from({ length: targetCols }, (_, x) => {
      const x0 = Math.floor((x * srcCols) / targetCols);
      const x1 = Math.max(x0, Math.floor(((x + 1) * srcCols) / targetCols) - 1);
      let total = 0;
      let on = 0;
      for (let sy = y0; sy <= y1; sy += 1) {
        for (let sx = x0; sx <= x1; sx += 1) {
          total += 1;
          if (baseGrid[sy]?.[sx]) on += 1;
        }
      }
      if (total === 0) {
        const sx = Math.min(srcCols - 1, Math.floor((x * srcCols) / targetCols));
        const sy = Math.min(srcRows - 1, Math.floor((y * srcRows) / targetRows));
        return Boolean(baseGrid[sy]?.[sx]);
      }
      return on / total >= 0.5;
    });
  });
}

function scaleRooms(
  rooms: Room[],
  srcCols: number,
  srcRows: number,
  targetCols: number,
  targetRows: number
): Room[] {
  if (srcCols === 0 || srcRows === 0) return [];
  const scaleX = targetCols / srcCols;
  const scaleY = targetRows / srcRows;
  return rooms.map((room) => {
    let x = Math.round(room.x * scaleX);
    let y = Math.round(room.y * scaleY);
    let w = Math.max(1, Math.round(room.w * scaleX));
    let h = Math.max(1, Math.round(room.h * scaleY));
    x = Math.max(0, Math.min(targetCols - 1, x));
    y = Math.max(0, Math.min(targetRows - 1, y));
    if (x + w > targetCols) w = Math.max(1, targetCols - x);
    if (y + h > targetRows) h = Math.max(1, targetRows - y);
    return { ...room, x, y, w, h };
  });
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildItem(type: FurnitureType, x: number, y: number, rotation: Rotation): FurnitureItem {
  const base = FURNITURE_CATALOG[type];
  const swapped = rotation === 90 || rotation === 270;
  const w = swapped ? base.h : base.w;
  const h = swapped ? base.w : base.h;
  return { id: createId(), type, x, y, w, h, rotation };
}

function itemCells(item: FurnitureItem): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let dy = 0; dy < item.h; dy += 1) {
    for (let dx = 0; dx < item.w; dx += 1) {
      cells.push({ x: item.x + dx, y: item.y + dy });
    }
  }
  return cells;
}

function getRotatedDims(width: number, height: number, rotation: ViewRotation) {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

function toRotated(x: number, y: number, width: number, height: number, rotation: ViewRotation) {
  switch (rotation) {
    case 90:
      return { x: height - 1 - y, y: x };
    case 180:
      return { x: width - 1 - x, y: height - 1 - y };
    case 270:
      return { x: y, y: width - 1 - x };
    default:
      return { x, y };
  }
}

function toOriginal(x: number, y: number, width: number, height: number, rotation: ViewRotation) {
  switch (rotation) {
    case 90:
      return { x: y, y: height - 1 - x };
    case 180:
      return { x: width - 1 - x, y: height - 1 - y };
    case 270:
      return { x: width - 1 - y, y: x };
    default:
      return { x, y };
  }
}

function rotateItem(item: FurnitureItem, width: number, height: number, rotation: ViewRotation) {
  const cells = itemCells(item).map((cell) => toRotated(cell.x, cell.y, width, height, rotation));
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { ...item, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function isFloorTile(grid: boolean[][], x: number, y: number): boolean {
  return grid[y]?.[x] ?? false;
}

function findRoomAt(rooms: Room[], x: number, y: number): Room | null {
  for (const room of rooms) {
    if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
      return room;
    }
  }
  return null;
}

function canPlaceItem(
  grid: boolean[][],
  items: FurnitureItem[],
  candidate: FurnitureItem,
  ignoreId?: string
): boolean {
  for (const cell of itemCells(candidate)) {
    if (!isFloorTile(grid, cell.x, cell.y)) return false;
    if (cell.x < 0 || cell.y < 0) return false;
  }
  for (const item of items) {
    if (ignoreId && item.id === ignoreId) continue;
    for (const cell of itemCells(item)) {
      if (
        cell.x >= candidate.x &&
        cell.x < candidate.x + candidate.w &&
        cell.y >= candidate.y &&
        cell.y < candidate.y + candidate.h
      ) {
        return false;
      }
    }
  }
  return true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function findItemAt(items: FurnitureItem[], gridX: number, gridY: number): FurnitureItem | null {
  const sorted = [...items].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const item = sorted[i];
    if (gridX >= item.x && gridX < item.x + item.w && gridY >= item.y && gridY < item.y + item.h) {
      return item;
    }
  }
  return null;
}

function sanitizeItems(grid: boolean[][], items: FurnitureItem[]): FurnitureItem[] {
  return items.filter((item) => {
    for (const cell of itemCells(item)) {
      if (!isFloorTile(grid, cell.x, cell.y)) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Auto-furnish: place appropriate furniture in detected rooms         */
/* ------------------------------------------------------------------ */

const ROOM_FURNITURE: Record<RoomType, FurnitureType[]> = {
  bedroom: ['bed', 'nightstand', 'lamp'],
  living_room: ['sofa', 'table', 'television', 'plant'],
  kitchen: ['stove', 'table', 'chair'],
  bathroom: [],
  hallway: ['plant'],
  office: ['table', 'chair', 'bookshelf', 'lamp'],
};

function autoFurnish(grid: boolean[][], rooms: Room[]): FurnitureItem[] {
  const placed: FurnitureItem[] = [];

  for (const room of rooms) {
    const types = ROOM_FURNITURE[room.type] ?? [];

    for (const ftype of types) {
      const cat = FURNITURE_CATALOG[ftype];
      let didPlace = false;

      // Try positions inside the room, with a 1-cell margin from edges when possible
      const margin = Math.min(1, Math.floor(Math.min(room.w, room.h) / 3));
      for (let dy = margin; dy <= room.h - cat.h - margin && !didPlace; dy++) {
        for (let dx = margin; dx <= room.w - cat.w - margin && !didPlace; dx++) {
          const candidate = buildItem(ftype, room.x + dx, room.y + dy, 0);
          if (canPlaceItem(grid, placed, candidate)) {
            placed.push(candidate);
            didPlace = true;
          }
        }
      }

      // Fallback: try without margin
      if (!didPlace) {
        for (let dy = 0; dy <= room.h - cat.h && !didPlace; dy++) {
          for (let dx = 0; dx <= room.w - cat.w && !didPlace; dx++) {
            const candidate = buildItem(ftype, room.x + dx, room.y + dy, 0);
            if (canPlaceItem(grid, placed, candidate)) {
              placed.push(candidate);
              didPlace = true;
            }
          }
        }
      }
    }
  }

  return placed;
}

/* ------------------------------------------------------------------ */
/* Sample floor plan presets                                           */
/* ------------------------------------------------------------------ */

type SamplePreset = { name: string; data: FloorPlanData };

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    name: 'Studio Apartment',
    data: {
      grid: [
        [false,false,false,false,false,false,false,false,false,false],
        [false, true, true, true, true, true, true, true, true,false],
        [false, true, true, true, true, true, true, true, true,false],
        [false, true, true, true,false, true, true, true, true,false],
        [false, true, true, true,false, true, true, true, true,false],
        [false, true, true, true,false,false, true, true, true,false],
        [false, true, true, true, true, true, true, true, true,false],
        [false,false,false,false,false,false,false,false,false,false],
      ],
      rooms: [
        { type: 'living_room', label: 'Living Area', x: 1, y: 1, w: 3, h: 5 },
        { type: 'bedroom',     label: 'Sleeping Nook', x: 5, y: 1, w: 4, h: 3 },
        { type: 'kitchen',     label: 'Kitchen', x: 6, y: 5, w: 3, h: 2 },
        { type: 'bathroom',    label: 'Bathroom', x: 5, y: 5, w: 1, h: 1 },
      ],
    },
  },
  {
    name: 'One-Bedroom',
    data: {
      grid: [
        [false,false,false,false,false,false,false,false,false,false,false,false,false,false],
        [false, true, true, true, true, true,false, true, true, true, true, true, true,false],
        [false, true, true, true, true, true,false, true, true, true, true, true, true,false],
        [false, true, true, true, true, true,false, true, true, true, true, true, true,false],
        [false, true, true, true, true, true, true, true, true, true, true, true, true,false],
        [false, true, true, true, true, true, true, true, true, true, true, true, true,false],
        [false,false,false, true, true, true, true, true,false,false,false,false,false,false],
        [false, true, true, true, true, true, true, true,false, true, true, true, true,false],
        [false, true, true, true, true, true, true, true,false, true, true, true, true,false],
        [false,false,false,false,false,false,false,false,false,false,false,false,false,false],
      ],
      rooms: [
        { type: 'living_room', label: 'Living Room',  x: 1, y: 1, w: 5, h: 5 },
        { type: 'bedroom',     label: 'Bedroom',      x: 7, y: 1, w: 6, h: 5 },
        { type: 'hallway',     label: 'Hall',          x: 3, y: 6, w: 5, h: 1 },
        { type: 'kitchen',     label: 'Kitchen',       x: 1, y: 7, w: 7, h: 2 },
        { type: 'bathroom',    label: 'Bathroom',      x: 9, y: 7, w: 4, h: 2 },
      ],
    },
  },
  {
    name: 'L-Shaped House',
    data: {
      grid: [
        [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],
        [false, true, true, true, true, true,false, true, true, true, true,false,false,false,false,false],
        [false, true, true, true, true, true,false, true, true, true, true,false,false,false,false,false],
        [false, true, true, true, true, true,false, true, true, true, true,false,false,false,false,false],
        [false, true, true, true, true, true, true, true, true, true, true,false,false,false,false,false],
        [false, true, true, true, true, true, true, true, true, true, true,false,false,false,false,false],
        [false, true, true, true, true, true,false,false,false,false,false,false,false,false,false,false],
        [false, true, true, true, true, true,false, true, true, true, true, true, true, true, true,false],
        [false, true, true, true, true, true,false, true, true, true, true, true, true, true, true,false],
        [false, true, true, true, true, true,false, true, true, true, true, true, true, true, true,false],
        [false, true, true, true, true, true, true, true, true, true, true, true, true, true, true,false],
        [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],
      ],
      rooms: [
        { type: 'living_room', label: 'Living Room',   x: 1, y: 1, w: 5, h: 5 },
        { type: 'bedroom',     label: 'Bedroom',       x: 7, y: 1, w: 4, h: 5 },
        { type: 'kitchen',     label: 'Kitchen',       x: 1, y: 6, w: 5, h: 5 },
        { type: 'office',      label: 'Office',        x: 7, y: 7, w: 8, h: 4 },
      ],
    },
  },
];

function SpritePreview({ type, images, rotation }: { type: FurnitureType; images: Record<string, HTMLImageElement>; rotation: Rotation }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orient = ROTATION_TO_ORIENTATION[rotation];
  const img = images[`${type}_${orient}`] ?? images[`${type}_SE`];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = 80;
    const ch = 60;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * 0.85;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
  }, [img, rotation]);

  if (!img) {
    return <div className="furniture-swatch" style={{ background: FURNITURE_CATALOG[type].swatch }} />;
  }

  return <canvas ref={canvasRef} className="furniture-preview" />;
}

export default function RoomPlanner() {
  const [grid, setGrid] = useState<boolean[][]>(() => createFloor(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [items, setItems] = useState<FurnitureItem[]>(() => [
    buildItem('sofa', 2, 2, 0),
    buildItem('table', 5, 3, 0),
    buildItem('bed', 7, 2, 0),
    buildItem('plant', 1, 5, 0)
  ]);
  const [tool, setTool] = useState<Tool>('furniture');
  const [activeFurniture, setActiveFurniture] = useState<FurnitureType>('sofa');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [viewRotation, setViewRotation] = useState<ViewRotation>(0);
  const [status, setStatus] = useState<string>('Drag furniture in the isometric view to move it.');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [baseGrid, setBaseGrid] = useState<boolean[][] | null>(() => createFloor(DEFAULT_WIDTH, DEFAULT_HEIGHT));
  const [baseRooms, setBaseRooms] = useState<Room[]>([]);
  const [granularity, setGranularity] = useState(1);

  // Upload state
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const spriteImages = useSpriteImages(SPRITE_BASE_MAP);

  const gridWidth = grid[0]?.length ?? 0;
  const gridHeight = grid.length;

  const occupancy = useMemo(() => {
    const map = new Map<string, FurnitureType>();
    for (const item of items) {
      for (const cell of itemCells(item)) {
        map.set(`${cell.x},${cell.y}`, item.type);
      }
    }
    return map;
  }, [items]);

  // --- Upload handlers ---
  const onFloorPlanParsed = useCallback((data: FloorPlanData, furnish = true) => {
    setGrid(data.grid);
    setRooms(data.rooms);
    setBaseGrid(data.grid);
    setBaseRooms(data.rooms);
    setGranularity(1);
    setSelectedItemId(null);

    if (furnish && data.rooms.length > 0) {
      const furnished = autoFurnish(data.grid, data.rooms);
      setItems(furnished);
      setStatus(`Floor plan loaded with ${data.rooms.length} rooms and ${furnished.length} furniture items!`);
    } else {
      setItems([]);
      setStatus('Floor plan loaded! Use Auto-Furnish or drop furniture manually.');
    }
  }, []);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadPreview(dataUrl);
      setUploadError(null);
    } catch {
      setUploadError('Failed to read image file.');
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!uploadPreview) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/parse-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadPreview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Analysis failed.');
        return;
      }
      onFloorPlanParsed(data as FloorPlanData);
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [uploadPreview, onFloorPlanParsed]);

  const handleTryAgain = useCallback(() => {
    setUploadError(null);
    if (uploadPreview) {
      handleAnalyze();
    }
  }, [uploadPreview, handleAnalyze]);

  const handleAutoFurnish = useCallback(() => {
    if (rooms.length === 0) {
      setStatus('No rooms detected. Upload a floor plan or load a sample first.');
      return;
    }
    const furnished = autoFurnish(grid, rooms);
    setItems(furnished);
    setSelectedItemId(null);
    setStatus(`Auto-furnished ${furnished.length} items across ${rooms.length} rooms.`);
  }, [grid, rooms]);

  const handleLoadPreset = useCallback((preset: SamplePreset) => {
    onFloorPlanParsed(preset.data, true);
    setUploadPreview(null);
    setUploadError(null);
    setStatus(`Loaded "${preset.name}" with auto-furnished rooms.`);
  }, [onFloorPlanParsed]);

  const handleCellClick = useCallback((x: number, y: number) => {
    const candidate = buildItem(activeFurniture, x, y, rotation);
    if (canPlaceItem(grid, items, candidate)) {
      setItems((prev) => [...prev, candidate]);
      setSelectedItemId(candidate.id);
      setStatus('Placed furniture. Drag to move.');
    } else {
      setStatus('Cannot place there. Try another tile.');
    }
  }, [activeFurniture, grid, items, rotation, tool]);

  const resetScene = useCallback(() => {
    const nextGrid = createFloor(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    setGrid(nextGrid);
    setBaseGrid(nextGrid);
    setBaseRooms([]);
    setGranularity(1);
    setItems([
      buildItem('sofa', 2, 2, 0),
      buildItem('table', 5, 3, 0),
      buildItem('bed', 7, 2, 0),
      buildItem('plant', 1, 5, 0)
    ]);
    setStatus('Reset to a clean, playable scene.');
  }, []);

  const clearFurniture = useCallback(() => {
    setItems([]);
    setSelectedItemId(null);
    setStatus('Cleared all furniture.');
  }, []);

  const maxGranularity = useMemo(() => {
    if (!baseGrid || baseGrid.length === 0 || baseGrid[0]?.length === 0) return 1;
    const baseCols = baseGrid[0].length;
    const baseRows = baseGrid.length;
    return Math.max(1, Math.min(Math.floor(MAX_COLS / baseCols), Math.floor(MAX_ROWS / baseRows)));
  }, [baseGrid]);

  const prevGranRef = useRef(granularity);
  useEffect(() => {
    if (!baseGrid || baseGrid.length === 0 || baseGrid[0]?.length === 0) return;
    const baseCols = baseGrid[0].length;
    const baseRows = baseGrid.length;
    const factor = Math.max(1, Math.min(granularity, maxGranularity));
    const targetCols = baseCols * factor;
    const targetRows = baseRows * factor;

    // Skip if nothing actually changed (avoids clearing items on mount)
    if (factor === prevGranRef.current && grid.length === targetRows && (grid[0]?.length ?? 0) === targetCols) {
      return;
    }
    prevGranRef.current = factor;

    setGrid(resampleGrid(baseGrid, targetCols, targetRows));
    setRooms(scaleRooms(baseRooms, baseCols, baseRows, targetCols, targetRows));
    setItems([]);
    setSelectedItemId(null);
  }, [baseGrid, baseRooms, granularity, maxGranularity, grid]);

  return (
    <>
      <header className="header">
        <h1>Iso Room Planner</h1>
        <p>Sketch a floor plan, then watch it snap into a cozy isometric room. Drop furniture on the plan or drag it around in the 3D view.</p>
      </header>

      <section className="main">
        <div className="panel">
          <h2>Floor Plan</h2>

          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="upload-input"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploadPreview ? (
              <div className="upload-preview">
                <img src={uploadPreview} alt="Floor plan preview" />
                <div className="upload-actions">
                  <button
                    type="button"
                    className="action-button primary"
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner" /> Analyzing…
                      </>
                    ) : (
                      'Analyze Floor Plan'
                    )}
                  </button>
                  <button
                    type="button"
                    className="tool-button"
                    onClick={(e) => { e.stopPropagation(); setUploadPreview(null); setUploadError(null); }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <p>Drop a floor plan image here or click to browse</p>
            )}
          </div>
          {uploadError && (
            <div className="upload-error">
              <span>{uploadError}</span>
              <button type="button" className="tool-button" onClick={handleTryAgain}>Try Again</button>
            </div>
          )}

          <div className="preset-row">
            <span className="preset-label">Quick start:</span>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="tool-button"
                onClick={() => handleLoadPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="tool-row">
            <button
              className={`tool-button ${tool === 'furniture' ? 'active' : ''}`}
              onClick={() => setTool('furniture')}
              type="button"
            >
              Place Furniture
            </button>
          </div>

          <div className="furniture-list">
            {Object.entries(FURNITURE_CATALOG).map(([key, data]) => (
              <button
                key={key}
                type="button"
                className={`furniture-card ${activeFurniture === key ? 'active' : ''}`}
                onClick={() => {
                  setActiveFurniture(key as FurnitureType);
                  setTool('furniture');
                }}
              >
                <SpritePreview type={key as FurnitureType} images={spriteImages} rotation={activeFurniture === key ? rotation : 0} />
                <strong>{data.label}</strong>
                <div className="note">{data.w}x{data.h} tiles</div>
              </button>
            ))}
          </div>

          <div className="tool-row">
            <button
              className="tool-button"
              onClick={() => setRotation((prev) => ((prev + 90) % 360) as Rotation)}
              type="button"
            >
              Rotate {rotation}° ({ROTATION_TO_ORIENTATION[rotation]})
            </button>
          </div>

          <div className="granularity-row">
            <label>Granularity</label>
            <div className="granularity-controls">
              <input
                type="range"
                min={1}
                max={maxGranularity}
                value={granularity}
                onChange={(e) => setGranularity(Number(e.target.value))}
                disabled={maxGranularity <= 1}
              />
              <span className="granularity-value">{granularity}x</span>
            </div>
            <span className="granularity-note">
              {gridWidth}x{gridHeight} tiles &mdash; slide to change detail
            </span>
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${gridWidth}, ${Math.max(12, Math.floor(336 / gridWidth))}px)` }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const key = `${x},${y}`;
                const itemType = occupancy.get(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`grid-cell ${cell ? 'floor' : 'blocked'}`}
                    onClick={() => handleCellClick(x, y)}
                    title={cell ? 'Floor' : 'Empty'}
                    style={{
                      width: Math.max(12, Math.floor(336 / gridWidth)),
                      height: Math.max(12, Math.floor(336 / gridWidth)),
                      fontSize: gridWidth > 24 ? '0.4rem' : '0.65rem',
                      ...(itemType
                        ? { background: FURNITURE_CATALOG[itemType].swatch, color: '#0b0f14' }
                        : {}),
                    }}
                  >
                    {itemType ? itemType[0].toUpperCase() : ''}
                  </button>
                );
              })
            )}
          </div>

          <div className="legend">
            <span><i style={{ background: 'rgba(108, 212, 197, 0.6)' }} /> Floor</span>
            <span><i style={{ background: 'rgba(224, 122, 95, 0.5)' }} /> Empty</span>
            <span><i style={{ background: 'var(--accent)' }} /> Furniture</span>
          </div>

          <div className="actions">
            <button className="action-button primary" onClick={resetScene} type="button">Reset Scene</button>
            <button className="action-button" onClick={handleAutoFurnish} type="button">Auto-Furnish</button>
            <button className="action-button" onClick={clearFurniture} type="button">Clear Furniture</button>
          </div>
          <p className="note">Tip: click any tile while in Place Furniture mode to drop items. Drag items around in the isometric view.</p>
        </div>

        <div className="panel">
          <h2>Isometric Room</h2>
          <div className="tool-row">
            <button
              className="tool-button"
              onClick={() =>
                setViewRotation((prev) => ((prev + 90) % 360) as ViewRotation)
              }
              type="button"
            >
              Rotate View {viewRotation}°
            </button>
          </div>
          <IsoRoomCanvas
            grid={grid}
            baseGrid={baseGrid}
            rooms={rooms}
            items={items}
            spriteImages={spriteImages}
            viewRotation={viewRotation}
            onMoveItem={(id, nextX, nextY) => {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === id
                    ? { ...item, x: nextX, y: nextY }
                    : item
                )
              );
            }}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
          />
          <div className="status">{status} Drag empty space to pan, scroll to zoom.</div>
        </div>
      </section>
    </>
  );
}

type IsoRoomCanvasProps = {
  grid: boolean[][];
  baseGrid: boolean[][] | null;
  rooms: Room[];
  items: FurnitureItem[];
  spriteImages: Record<string, HTMLImageElement>;
  viewRotation: ViewRotation;
  onMoveItem: (id: string, x: number, y: number) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
};

function IsoRoomCanvas({
  grid,
  baseGrid,
  rooms,
  items,
  spriteImages,
  viewRotation,
  onMoveItem,
  selectedItemId,
  onSelectItem
}: IsoRoomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 520 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const gridWidth = grid[0]?.length ?? 0;
  const gridHeight = grid.length;
  const baseCols = baseGrid?.[0]?.length ?? gridWidth;
  const baseRows = baseGrid?.length ?? gridHeight;
  const { width: viewWidth, height: viewHeight } = getRotatedDims(gridWidth, gridHeight, viewRotation);
  const viewItems = useMemo(
    () => items.map((item) => rotateItem(item, gridWidth, gridHeight, viewRotation)),
    [gridHeight, gridWidth, items, viewRotation]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const wallHeight = 42;
    const baseScale =
      viewRotation === 90 || viewRotation === 270
        ? (baseRows > 0 && gridHeight > 0 ? baseRows / gridHeight : 1)
        : (baseCols > 0 && gridWidth > 0 ? baseCols / gridWidth : 1);
    const scale = baseScale * zoom;

    ctx.scale(scale, scale);
    ctx.translate(pan.x / scale, pan.y / scale);

    const corners = [
      gridToScreen(0, 0, 0, 0),
      gridToScreen(viewWidth - 1, 0, 0, 0),
      gridToScreen(0, viewHeight - 1, 0, 0),
      gridToScreen(viewWidth - 1, viewHeight - 1, 0, 0)
    ];

    const minX = Math.min(...corners.map((c) => c.screenX));
    const maxX = Math.max(...corners.map((c) => c.screenX + TILE_WIDTH));
    const minY = Math.min(...corners.map((c) => c.screenY));
    const maxY = Math.max(...corners.map((c) => c.screenY + TILE_HEIGHT + wallHeight));

    const roomWidth = maxX - minX;
    const roomHeight = maxY - minY;

    const viewportWidth = canvasSize.width / scale;
    const viewportHeight = canvasSize.height / scale;
    const offsetX = (viewportWidth - roomWidth) / 2 - minX;
    const offsetY = (viewportHeight - roomHeight) / 2 - minY + 24;
    offsetRef.current = { x: offsetX, y: offsetY };

    const drawDiamond = (x: number, y: number, fill: string, stroke?: string) => {
      ctx.beginPath();
      ctx.moveTo(x + TILE_WIDTH / 2, y);
      ctx.lineTo(x + TILE_WIDTH, y + TILE_HEIGHT / 2);
      ctx.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT);
      ctx.lineTo(x, y + TILE_HEIGHT / 2);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawLabelPill = (lx: number, ly: number, text: string, color: string) => {
      ctx.save();
      ctx.font = '600 12px "Space Grotesk", system-ui';
      const px = 10;
      const py = 6;
      const metrics = ctx.measureText(text);
      const w = metrics.width + px * 2;
      const h = 20 + py;
      const r = 10;
      const left = lx - w / 2;
      const top = ly - h / 2;
      ctx.beginPath();
      ctx.moveTo(left + r, top);
      ctx.lineTo(left + w - r, top);
      ctx.quadraticCurveTo(left + w, top, left + w, top + r);
      ctx.lineTo(left + w, top + h - r);
      ctx.quadraticCurveTo(left + w, top + h, left + w - r, top + h);
      ctx.lineTo(left + r, top + h);
      ctx.quadraticCurveTo(left, top + h, left, top + h - r);
      ctx.lineTo(left, top + r);
      ctx.quadraticCurveTo(left, top, left + r, top);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#0b0f14';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, lx, ly + 1);
      ctx.restore();
    };

    const drawNorthWall = (x: number, y: number) => {
      const baseLeft = { x: x + TILE_WIDTH / 2, y };
      const baseRight = { x: x + TILE_WIDTH, y: y + TILE_HEIGHT / 2 };
      ctx.beginPath();
      ctx.moveTo(baseLeft.x, baseLeft.y);
      ctx.lineTo(baseRight.x, baseRight.y);
      ctx.lineTo(baseRight.x, baseRight.y - wallHeight);
      ctx.lineTo(baseLeft.x, baseLeft.y - wallHeight);
      ctx.closePath();
      ctx.fillStyle = 'rgba(222, 205, 178, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(108, 95, 80, 0.5)';
      ctx.stroke();
    };

    const drawWestWall = (x: number, y: number) => {
      const baseLeft = { x, y: y + TILE_HEIGHT / 2 };
      const baseRight = { x: x + TILE_WIDTH / 2, y };
      ctx.beginPath();
      ctx.moveTo(baseLeft.x, baseLeft.y);
      ctx.lineTo(baseRight.x, baseRight.y);
      ctx.lineTo(baseRight.x, baseRight.y - wallHeight);
      ctx.lineTo(baseLeft.x, baseLeft.y - wallHeight);
      ctx.closePath();
      ctx.fillStyle = 'rgba(198, 180, 152, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(96, 84, 70, 0.5)';
      ctx.stroke();
    };

    const drawCuboid = (item: FurnitureItem) => {
      const palette = FURNITURE_CATALOG[item.type];
      const height = palette.height;

      const top = gridToScreen(item.x, item.y, offsetX, offsetY);
      const right = gridToScreen(item.x + item.w, item.y, offsetX, offsetY);
      const bottom = gridToScreen(item.x + item.w, item.y + item.h, offsetX, offsetY);
      const left = gridToScreen(item.x, item.y + item.h, offsetX, offsetY);

      const topPoint = { x: top.screenX + TILE_WIDTH / 2, y: top.screenY - height };
      const rightPoint = { x: right.screenX + TILE_WIDTH / 2, y: right.screenY - height };
      const bottomPoint = { x: bottom.screenX + TILE_WIDTH / 2, y: bottom.screenY - height };
      const leftPoint = { x: left.screenX + TILE_WIDTH / 2, y: left.screenY - height };

      ctx.beginPath();
      ctx.moveTo(topPoint.x, topPoint.y);
      ctx.lineTo(rightPoint.x, rightPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y);
      ctx.lineTo(leftPoint.x, leftPoint.y);
      ctx.closePath();
      ctx.fillStyle = palette.top;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(leftPoint.x, leftPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y + height);
      ctx.lineTo(leftPoint.x, leftPoint.y + height);
      ctx.closePath();
      ctx.fillStyle = palette.front;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(rightPoint.x, rightPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y + height);
      ctx.lineTo(rightPoint.x, rightPoint.y + height);
      ctx.closePath();
      ctx.fillStyle = palette.side;
      ctx.fill();
    };

    const drawSprite = (item: FurnitureItem, img: HTMLImageElement) => {
      // Scale from kenney pixel space to our tile grid
      const scale = TILE_WIDTH / KENNEY_TILE_PX;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;

      // The footprint diamond center in screen coords
      const topCorner = gridToScreen(item.x, item.y, offsetX, offsetY);
      const bottomCorner = gridToScreen(item.x + item.w, item.y + item.h, offsetX, offsetY);

      // Center of the footprint diamond
      const centerX = (topCorner.screenX + bottomCorner.screenX) / 2 + TILE_WIDTH / 2;
      // Bottom of the footprint diamond (where the sprite's ground level should be)
      const footprintBottomY = bottomCorner.screenY;

      // Position sprite: centered horizontally, bottom-aligned to footprint bottom
      const dx = centerX - dw / 2;
      const dy = footprintBottomY - dh;

      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const drawSelectionHighlight = (item: FurnitureItem) => {
      const top = gridToScreen(item.x, item.y, offsetX, offsetY);
      const right = gridToScreen(item.x + item.w, item.y, offsetX, offsetY);
      const bottom = gridToScreen(item.x + item.w, item.y + item.h, offsetX, offsetY);
      const left = gridToScreen(item.x, item.y + item.h, offsetX, offsetY);

      const topPoint = { x: top.screenX + TILE_WIDTH / 2, y: top.screenY };
      const rightPoint = { x: right.screenX + TILE_WIDTH / 2, y: right.screenY };
      const bottomPoint = { x: bottom.screenX + TILE_WIDTH / 2, y: bottom.screenY };
      const leftPoint = { x: left.screenX + TILE_WIDTH / 2, y: left.screenY };

      ctx.beginPath();
      ctx.moveTo(topPoint.x, topPoint.y);
      ctx.lineTo(rightPoint.x, rightPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y);
      ctx.lineTo(leftPoint.x, leftPoint.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(242, 161, 84, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(242, 161, 84, 0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Draw floor tiles (color-coded by room type)
    for (let y = 0; y < viewHeight; y += 1) {
      for (let x = 0; x < viewWidth; x += 1) {
        const original = toOriginal(x, y, gridWidth, gridHeight, viewRotation);
        if (!isFloorTile(grid, original.x, original.y)) continue;
        const room = findRoomAt(rooms, original.x, original.y);
        const { screenX, screenY } = gridToScreen(x, y, offsetX, offsetY);
        const fill = room ? ROOM_COLORS[room.type].fill : 'rgba(55, 77, 95, 0.75)';
        drawDiamond(screenX, screenY, fill, 'rgba(36, 55, 70, 0.8)');
      }
    }

    // Draw walls
    for (let y = 0; y < viewHeight; y += 1) {
      for (let x = 0; x < viewWidth; x += 1) {
        const original = toOriginal(x, y, gridWidth, gridHeight, viewRotation);
        if (!isFloorTile(grid, original.x, original.y)) continue;
        const { screenX, screenY } = gridToScreen(x, y, offsetX, offsetY);
        const originalNorth = toOriginal(x, y - 1, gridWidth, gridHeight, viewRotation);
        const originalWest = toOriginal(x - 1, y, gridWidth, gridHeight, viewRotation);
        if (!isFloorTile(grid, originalNorth.x, originalNorth.y)) {
          drawNorthWall(screenX, screenY);
        }
        if (!isFloorTile(grid, originalWest.x, originalWest.y)) {
          drawWestWall(screenX, screenY);
        }
      }
    }

    // Draw room labels
    if (rooms.length > 0) {
      for (const room of rooms) {
        const centerX = room.x + room.w / 2;
        const centerY = room.y + room.h / 2;
        const viewCenter = toRotated(centerX, centerY, gridWidth, gridHeight, viewRotation);
        const { screenX, screenY } = gridToScreen(viewCenter.x, viewCenter.y, offsetX, offsetY);
        const labelX = screenX + TILE_WIDTH / 2;
        const labelY = screenY + TILE_HEIGHT / 2 - 18;
        drawLabelPill(labelX, labelY, room.label, ROOM_COLORS[room.type].label);
      }
    }

    // Draw furniture items sorted by depth
    const sortedItems = [...viewItems].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const viewItem of sortedItems) {
      const orient = ROTATION_TO_ORIENTATION[viewItem.rotation];
      const spriteKey = `${viewItem.type}_${orient}`;
      const img = spriteImages[spriteKey] ?? spriteImages[`${viewItem.type}_SE`];
      if (img && SPRITE_BASE_MAP[viewItem.type]) {
        drawSprite(viewItem, img);
      } else {
        drawCuboid(viewItem);
      }

      if (viewItem.id === selectedItemId) {
        drawSelectionHighlight(viewItem);
      }
    }
  }, [
    baseCols,
    baseRows,
    canvasSize,
    grid,
    gridHeight,
    gridWidth,
    pan.x,
    pan.y,
    rooms,
    selectedItemId,
    spriteImages,
    viewHeight,
    viewItems,
    viewRotation,
    viewWidth,
    zoom
  ]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const baseScale =
      viewRotation === 90 || viewRotation === 270
        ? (baseRows > 0 && gridHeight > 0 ? baseRows / gridHeight : 1)
        : (baseCols > 0 && gridWidth > 0 ? baseCols / gridWidth : 1);
    const scale = baseScale * zoom;
    const localX = (x - pan.x) / scale;
    const localY = (y - pan.y) / scale;
    const { gridX, gridY } = screenToGrid(localX, localY, offsetRef.current.x, offsetRef.current.y);
    const original = toOriginal(gridX, gridY, gridWidth, gridHeight, viewRotation);

    const item = findItemAt(items, original.x, original.y);
    if (item) {
      dragRef.current = { id: item.id, offsetX: original.x - item.x, offsetY: original.y - item.y };
      onSelectItem(item.id);
      return;
    }

    onSelectItem(null);
    // If clicking empty space, start panning with left-click too.
    if (event.button === 0 || event.button === 1 || event.button === 2 || event.shiftKey) {
      setIsPanning(true);
      panStartRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    }
  }, [baseCols, baseRows, gridHeight, gridWidth, items, onSelectItem, pan.x, pan.y, viewRotation, zoom]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning && panStartRef.current) {
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      return;
    }
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const baseScale =
      viewRotation === 90 || viewRotation === 270
        ? (baseRows > 0 && gridHeight > 0 ? baseRows / gridHeight : 1)
        : (baseCols > 0 && gridWidth > 0 ? baseCols / gridWidth : 1);
    const scale = baseScale * zoom;
    const localX = (x - pan.x) / scale;
    const localY = (y - pan.y) / scale;
    const { gridX, gridY } = screenToGrid(localX, localY, offsetRef.current.x, offsetRef.current.y);
    const original = toOriginal(gridX, gridY, gridWidth, gridHeight, viewRotation);
    const active = items.find((item) => item.id === dragRef.current?.id);
    if (!active) return;

    const nextX = clamp(original.x - dragRef.current.offsetX, 0, gridWidth - active.w);
    const nextY = clamp(original.y - dragRef.current.offsetY, 0, gridHeight - active.h);
    const candidate = { ...active, x: nextX, y: nextY };
    if (canPlaceItem(grid, items, candidate, active.id)) {
      onMoveItem(active.id, nextX, nextY);
    }
  }, [baseCols, baseRows, grid, gridHeight, gridWidth, isPanning, items, onMoveItem, pan.x, pan.y, viewRotation, zoom]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const baseScale =
      viewRotation === 90 || viewRotation === 270
        ? (baseRows > 0 && gridHeight > 0 ? baseRows / gridHeight : 1)
        : (baseCols > 0 && gridWidth > 0 ? baseCols / gridWidth : 1);
    const scale = baseScale * zoom;
    const worldX = (x - pan.x) / scale;
    const worldY = (y - pan.y) / scale;

    const nextZoom = Math.min(4, Math.max(0.4, zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
    const nextScale = baseScale * nextZoom;
    const nextPanX = x - worldX * nextScale;
    const nextPanY = y - worldY * nextScale;
    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }, [baseCols, baseRows, gridHeight, gridWidth, pan.x, pan.y, viewRotation, zoom]);

  // Attach wheel listener as non-passive so preventDefault() actually works
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (gridWidth === 0 || gridHeight === 0) return;
    const wallHeight = 42;
    const corners = [
      gridToScreen(0, 0, 0, 0),
      gridToScreen(viewWidth - 1, 0, 0, 0),
      gridToScreen(0, viewHeight - 1, 0, 0),
      gridToScreen(viewWidth - 1, viewHeight - 1, 0, 0)
    ];
    const minX = Math.min(...corners.map((c) => c.screenX));
    const maxX = Math.max(...corners.map((c) => c.screenX + TILE_WIDTH));
    const minY = Math.min(...corners.map((c) => c.screenY));
    const maxY = Math.max(...corners.map((c) => c.screenY + TILE_HEIGHT + wallHeight));
    const roomWidth = maxX - minX;
    const roomHeight = maxY - minY;

    const baseScale =
      viewRotation === 90 || viewRotation === 270
        ? (baseRows > 0 && gridHeight > 0 ? baseRows / gridHeight : 1)
        : (baseCols > 0 && gridWidth > 0 ? baseCols / gridWidth : 1);
    const fitZoom = Math.min(
      (canvasSize.width - 32) / (roomWidth * baseScale),
      (canvasSize.height - 32) / (roomHeight * baseScale)
    );
    const clamped = Math.min(4, Math.max(0.4, fitZoom));
    setZoom(clamped);
    setPan({ x: 0, y: 0 });
  }, [baseCols, baseRows, canvasSize.height, canvasSize.width, gridHeight, gridWidth, viewHeight, viewRotation, viewWidth]);

  return (
    <div className="canvas-wrap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
