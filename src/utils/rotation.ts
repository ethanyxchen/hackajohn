import type { FurnitureItem, ViewRotation } from "@/types/furniture";
import { itemCells } from "@/utils/furniture";

export function getRotatedDims(width: number, height: number, rotation: ViewRotation) {
    if (rotation === 90 || rotation === 270) {
        return { width: height, height: width };
    }
    return { width, height };
}

export function toRotated(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: ViewRotation,
) {
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

export function toOriginal(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: ViewRotation,
) {
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

export function rotateItem(
    item: FurnitureItem,
    width: number,
    height: number,
    rotation: ViewRotation,
) {
    const cells = itemCells(item).map((cell) => toRotated(cell.x, cell.y, width, height, rotation));
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { ...item, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
