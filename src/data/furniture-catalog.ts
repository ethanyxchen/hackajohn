import type { RoomType } from "@/types/floorplan";
import type { FurniturePaletteItem, FurnitureType, Orientation, Rotation } from "@/types/furniture";

export const ROTATION_TO_ORIENTATION: Record<Rotation, Orientation> = {
    0: "SE",
    90: "SW",
    180: "NW",
    270: "NE",
};

export const ORIENTATIONS: Orientation[] = ["SE", "SW", "NW", "NE"];

export const FURNITURE_CATALOG: Record<FurnitureType, FurniturePaletteItem> = {
    sofa: {
        label: "Sofa",
        w: 5,
        h: 2,
        height: 24,
        top: "#e4b49f",
        side: "#c78672",
        front: "#b0705d",
        swatch: "#d59d88",
    },
    bed: {
        label: "Bed",
        w: 6,
        h: 4,
        height: 28,
        top: "#eadfcd",
        side: "#cbbda6",
        front: "#b6a58c",
        swatch: "#d8cbb6",
    },
    table: {
        label: "Table",
        w: 4,
        h: 3,
        height: 18,
        top: "#d6c08f",
        side: "#b59e6c",
        front: "#a38a5b",
        swatch: "#c9b27c",
    },
    chair: {
        label: "Chair",
        w: 2,
        h: 2,
        height: 16,
        top: "#e8a84c",
        side: "#c78432",
        front: "#b07228",
        swatch: "#e89830",
    },
    plant: {
        label: "Plant",
        w: 2,
        h: 2,
        height: 22,
        top: "#9ccc75",
        side: "#7faa5b",
        front: "#6f914e",
        swatch: "#86b764",
    },
    bookshelf: {
        label: "Bookshelf",
        w: 3,
        h: 1,
        height: 30,
        top: "#e8a84c",
        side: "#c78432",
        front: "#a06828",
        swatch: "#d49038",
    },
    lamp: {
        label: "Lamp",
        w: 1,
        h: 1,
        height: 26,
        top: "#d4c878",
        side: "#b0a45c",
        front: "#988c4c",
        swatch: "#c8bc68",
    },
    nightstand: {
        label: "Side Table",
        w: 2,
        h: 1,
        height: 16,
        top: "#e8a84c",
        side: "#c78432",
        front: "#a06828",
        swatch: "#d49038",
    },
    stove: {
        label: "Stove",
        w: 2,
        h: 2,
        height: 22,
        top: "#e8e0d0",
        side: "#b09080",
        front: "#e8e0d0",
        swatch: "#c8b8a8",
    },
    television: {
        label: "Television",
        w: 2,
        h: 1,
        height: 20,
        top: "#c8c8c8",
        side: "#888888",
        front: "#a8a8a8",
        swatch: "#999999",
    },
};

export const ROOM_COLORS: Record<RoomType, { fill: string; label: string }> = {
    bedroom: { fill: "rgba(86, 140, 214, 0.65)", label: "rgba(86, 140, 214, 0.9)" },
    living_room: { fill: "rgba(120, 201, 172, 0.6)", label: "rgba(120, 201, 172, 0.9)" },
    kitchen: { fill: "rgba(242, 192, 107, 0.7)", label: "rgba(242, 192, 107, 0.95)" },
    bathroom: { fill: "rgba(109, 178, 207, 0.65)", label: "rgba(109, 178, 207, 0.95)" },
    hallway: { fill: "rgba(195, 164, 122, 0.6)", label: "rgba(195, 164, 122, 0.9)" },
    office: { fill: "rgba(135, 206, 125, 0.6)", label: "rgba(135, 206, 125, 0.9)" },
};

// Kenney sprite base tile is 208px wide; our TILE_WIDTH is 64
export const KENNEY_TILE_PX = 208;

export type SpriteBaseInfo = {
    baseName: string;
    scale?: number;
};

export const SPRITE_BASE_MAP: Partial<Record<FurnitureType, SpriteBaseInfo>> = {
    sofa: { baseName: "loungeSofa" },
    bed: { baseName: "bedDouble", scale: 0.75 },
    table: { baseName: "table" },
    chair: { baseName: "chair" },
    plant: { baseName: "pottedPlant" },
    bookshelf: { baseName: "bookcaseOpen" },
    lamp: { baseName: "lampRoundFloor" },
    nightstand: { baseName: "sideTable" },
    stove: { baseName: "kitchenStove" },
    television: { baseName: "televisionModern" },
};

export const ROOM_FURNITURE: Record<RoomType, FurnitureType[]> = {
    bedroom: ["bed", "nightstand", "lamp"],
    living_room: ["sofa", "table", "television", "plant"],
    kitchen: ["stove", "table", "chair"],
    bathroom: [],
    hallway: ["plant"],
    office: ["table", "chair", "bookshelf", "lamp"],
};

export const DEFAULT_WIDTH = 12;
export const DEFAULT_HEIGHT = 8;
export const MAX_COLS = 96;
export const MAX_ROWS = 72;
export const GRANULARITY_TARGET = 4;
export const WALL_HEIGHT_TILES = 5.5;
