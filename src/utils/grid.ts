import type { Room } from "@/types/floorplan";

export function createFloor(width: number, height: number): boolean[][] {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => true));
}

export function resampleGrid(
    baseGrid: boolean[][],
    targetCols: number,
    targetRows: number,
): boolean[][] {
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

export function scaleRooms(
    rooms: Room[],
    srcCols: number,
    srcRows: number,
    targetCols: number,
    targetRows: number,
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

export function isFloorTile(grid: boolean[][], x: number, y: number): boolean {
    return grid[y]?.[x] ?? false;
}

export function findRoomAt(rooms: Room[], x: number, y: number): Room | null {
    for (const room of rooms) {
        if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
            return room;
        }
    }
    return null;
}
