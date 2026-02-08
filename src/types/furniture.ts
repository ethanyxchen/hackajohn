export type FurnitureType =
    | "sofa"
    | "bed"
    | "table"
    | "chair"
    | "plant"
    | "bookshelf"
    | "lamp"
    | "nightstand"
    | "stove"
    | "television";

export type Orientation = "SE" | "SW" | "NW" | "NE";
export type Rotation = 0 | 90 | 180 | 270;

export type FurnitureItem = {
    id: string;
    type: FurnitureType;
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: Rotation;
};

export type ViewRotation = 0 | 90 | 180 | 270;

export type FurniturePaletteItem = {
    label: string;
    w: number;
    h: number;
    height: number;
    top: string;
    side: string;
    front: string;
    swatch: string;
};
