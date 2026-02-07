export type TileType = 'empty' | 'floor' | 'wall';

export interface SpriteRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FurnitureItem {
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;
  sprite?: SpriteRegion;
}

export interface PlacedFurniture {
  item: FurnitureItem;
  gridX: number;
  gridY: number;
}

export interface Cell {
  type: TileType;
  furniture: PlacedFurniture | null;
}

export type Grid = Cell[][];

export interface GridState {
  grid: Grid;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}
