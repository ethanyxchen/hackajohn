export type RoomType =
  | 'bedroom'
  | 'living_room'
  | 'kitchen'
  | 'bathroom'
  | 'hallway'
  | 'office';

export type Room = {
  type: RoomType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FloorPlanData = {
  grid: boolean[][];
  rooms: Room[];
};
