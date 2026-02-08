import type { Room } from "@/types/floorplan";
import type { FurnitureItem, FurnitureType, Rotation } from "@/types/furniture";
import { FURNITURE_CATALOG, ROOM_FURNITURE } from "@/data/furniture-catalog";
import { isFloorTile } from "@/utils/grid";

export function createId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildItem(
    type: FurnitureType,
    x: number,
    y: number,
    rotation: Rotation,
): FurnitureItem {
    const base = FURNITURE_CATALOG[type];
    const swapped = rotation === 90 || rotation === 270;
    const w = swapped ? base.h : base.w;
    const h = swapped ? base.w : base.h;
    return { id: createId(), type, x, y, w, h, rotation };
}

export function itemCells(item: FurnitureItem): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    for (let dy = 0; dy < item.h; dy += 1) {
        for (let dx = 0; dx < item.w; dx += 1) {
            cells.push({ x: item.x + dx, y: item.y + dy });
        }
    }
    return cells;
}

export function canPlaceItem(
    grid: boolean[][],
    items: FurnitureItem[],
    candidate: FurnitureItem,
    ignoreId?: string,
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

export function findItemAt(
    items: FurnitureItem[],
    gridX: number,
    gridY: number,
): FurnitureItem | null {
    const sorted = [...items].sort((a, b) => a.x + a.y - (b.x + b.y));
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const item = sorted[i];
        if (
            gridX >= item.x &&
            gridX < item.x + item.w &&
            gridY >= item.y &&
            gridY < item.y + item.h
        ) {
            return item;
        }
    }
    return null;
}

export function sanitizeItems(grid: boolean[][], items: FurnitureItem[]): FurnitureItem[] {
    return items.filter((item) => {
        for (const cell of itemCells(item)) {
            if (!isFloorTile(grid, cell.x, cell.y)) return false;
        }
        return true;
    });
}

export function autoFurnish(grid: boolean[][], rooms: Room[]): FurnitureItem[] {
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
