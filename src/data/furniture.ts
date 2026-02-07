import type { FurnitureItem } from '../types';

export const SPRITE_SHEET = '/FurnitureSheet4x.png';

export const furnitureCatalog: FurnitureItem[] = [
  { id: 'bed', name: 'Bed', width: 1, height: 1, color: '#e74c3c', sprite: { x: 832, y: 192, w: 240, h: 236 } },
  { id: 'table', name: 'Table', width: 1, height: 1, color: '#8b6914', sprite: { x: 388, y: 388, w: 184, h: 152 } },
  { id: 'sofa', name: 'Sofa', width: 1, height: 1, color: '#c0392b', sprite: { x: 1600, y: 0, w: 256, h: 180 } },
  { id: 'nightstand', name: 'Nightstand', width: 1, height: 1, color: '#8b6914', sprite: { x: 400, y: 580, w: 160, h: 152 } },
  { id: 'lamp', name: 'Lamp', width: 1, height: 1, color: '#f1c40f', sprite: { x: 776, y: 212, w: 48, h: 164 } },
  { id: 'bookshelf', name: 'Bookshelf', width: 1, height: 1, color: '#8b4513', sprite: { x: 0, y: 0, w: 260, h: 168 } },
  { id: 'stove', name: 'Stove', width: 1, height: 1, color: '#555', sprite: { x: 1304, y: 1228, w: 148, h: 164 } },
  { id: 'fridge', name: 'Fridge', width: 1, height: 1, color: '#bdc3c7', sprite: { x: 1088, y: 1408, w: 172, h: 192 } },
];
