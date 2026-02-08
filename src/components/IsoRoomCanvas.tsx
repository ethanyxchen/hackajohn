import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gridToScreen, screenToGrid } from "@isocity/components/game/utils";
import { TILE_HEIGHT, TILE_WIDTH } from "@isocity/components/game/types";
import type { Room } from "@/types/floorplan";
import type { FurnitureItem, ViewRotation } from "@/types/furniture";
import {
    FURNITURE_CATALOG,
    KENNEY_TILE_PX,
    ROOM_COLORS,
    ROTATION_TO_ORIENTATION,
    SPRITE_BASE_MAP,
    WALL_HEIGHT_TILES,
} from "@/data/furniture-catalog";
import { findRoomAt, isFloorTile } from "@/utils/grid";
import { canPlaceItem, findItemAt } from "@/utils/furniture";
import { clamp, getRotatedDims, rotateItem, toOriginal, toRotated } from "@/utils/rotation";

export type IsoRoomCanvasProps = {
    grid: boolean[][];
    baseGrid: boolean[][] | null;
    rooms: Room[];
    items: FurnitureItem[];
    spriteImages: Record<string, HTMLImageElement>;
    viewRotation: ViewRotation;
    onMoveItem: (id: string, x: number, y: number) => void;
    onPlaceItem: (x: number, y: number) => void;
    selectedItemId: string | null;
    onSelectItem: (id: string | null) => void;
};

export function IsoRoomCanvas({
    grid,
    baseGrid,
    rooms,
    items,
    spriteImages,
    viewRotation,
    onMoveItem,
    onPlaceItem,
    selectedItemId,
    onSelectItem,
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
    const { width: viewWidth, height: viewHeight } = getRotatedDims(
        gridWidth,
        gridHeight,
        viewRotation,
    );
    const viewItems = useMemo(
        () => items.map((item) => rotateItem(item, gridWidth, gridHeight, viewRotation)),
        [gridHeight, gridWidth, items, viewRotation],
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
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        const wallHeight = Math.round(TILE_HEIGHT * WALL_HEIGHT_TILES);
        const baseScale =
            viewRotation === 90 || viewRotation === 270
                ? baseRows > 0 && gridHeight > 0
                    ? baseRows / gridHeight
                    : 1
                : baseCols > 0 && gridWidth > 0
                  ? baseCols / gridWidth
                  : 1;
        const scale = baseScale * zoom;

        ctx.scale(scale, scale);
        ctx.translate(pan.x / scale, pan.y / scale);

        const corners = [
            gridToScreen(0, 0, 0, 0),
            gridToScreen(viewWidth - 1, 0, 0, 0),
            gridToScreen(0, viewHeight - 1, 0, 0),
            gridToScreen(viewWidth - 1, viewHeight - 1, 0, 0),
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
            ctx.fillStyle = "#0b0f14";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
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
            ctx.fillStyle = "rgba(222, 205, 178, 0.9)";
            ctx.fill();
            ctx.strokeStyle = "rgba(108, 95, 80, 0.5)";
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
            ctx.fillStyle = "rgba(198, 180, 152, 0.9)";
            ctx.fill();
            ctx.strokeStyle = "rgba(96, 84, 70, 0.5)";
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
            const bottomPoint = {
                x: bottom.screenX + TILE_WIDTH / 2,
                y: bottom.screenY - height,
            };
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
            const topCorner = gridToScreen(item.x, item.y, offsetX, offsetY);
            const rightCorner = gridToScreen(item.x + item.w, item.y, offsetX, offsetY);
            const bottomCorner = gridToScreen(item.x + item.w, item.y + item.h, offsetX, offsetY);
            const leftCorner = gridToScreen(item.x, item.y + item.h, offsetX, offsetY);

            const minX = Math.min(
                topCorner.screenX,
                rightCorner.screenX,
                bottomCorner.screenX,
                leftCorner.screenX,
            );
            const maxX =
                Math.max(
                    topCorner.screenX,
                    rightCorner.screenX,
                    bottomCorner.screenX,
                    leftCorner.screenX,
                ) + TILE_WIDTH;
            const footprintWidth = Math.max(1, maxX - minX);

            // Scale from Kenney pixel space to our footprint size
            const spriteScale = SPRITE_BASE_MAP[item.type]?.scale ?? 1;
            const scale = (footprintWidth / KENNEY_TILE_PX) * spriteScale;
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;

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
            ctx.fillStyle = "rgba(242, 161, 84, 0.2)";
            ctx.fill();
            ctx.strokeStyle = "rgba(242, 161, 84, 0.95)";
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        for (let y = 0; y < viewHeight; y += 1) {
            for (let x = 0; x < viewWidth; x += 1) {
                const original = toOriginal(x, y, gridWidth, gridHeight, viewRotation);
                if (!isFloorTile(grid, original.x, original.y)) continue;
                const room = findRoomAt(rooms, original.x, original.y);
                const { screenX, screenY } = gridToScreen(x, y, offsetX, offsetY);
                const fill = room ? ROOM_COLORS[room.type].fill : "rgba(55, 77, 95, 0.75)";
                drawDiamond(screenX, screenY, fill, "rgba(36, 55, 70, 0.8)");
            }
        }

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

        if (rooms.length > 0) {
            for (const room of rooms) {
                const centerX = room.x + room.w / 2;
                const centerY = room.y + room.h / 2;
                const viewCenter = toRotated(centerX, centerY, gridWidth, gridHeight, viewRotation);
                const { screenX, screenY } = gridToScreen(
                    viewCenter.x,
                    viewCenter.y,
                    offsetX,
                    offsetY,
                );
                const labelX = screenX + TILE_WIDTH / 2;
                const labelY = screenY + TILE_HEIGHT / 2 - 18;
                drawLabelPill(labelX, labelY, room.label, ROOM_COLORS[room.type].label);
            }
        }

        // Draw furniture items sorted by depth
        const sortedItems = [...viewItems].sort((a, b) => a.x + a.y - (b.x + b.y));
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
        zoom,
    ]);

    useEffect(() => {
        drawScene();
    }, [drawScene]);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (event.currentTarget.setPointerCapture) {
                event.currentTarget.setPointerCapture(event.pointerId);
            }
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const baseScale =
                viewRotation === 90 || viewRotation === 270
                    ? baseRows > 0 && gridHeight > 0
                        ? baseRows / gridHeight
                        : 1
                    : baseCols > 0 && gridWidth > 0
                      ? baseCols / gridWidth
                      : 1;
            const scale = baseScale * zoom;
            const localX = (x - pan.x) / scale;
            const localY = (y - pan.y) / scale;
            const { gridX, gridY } = screenToGrid(
                localX,
                localY,
                offsetRef.current.x,
                offsetRef.current.y,
            );
            const original = toOriginal(gridX, gridY, gridWidth, gridHeight, viewRotation);

            const isPanGesture =
                event.button !== 0 ||
                event.shiftKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey;

            if (isPanGesture) {
                onSelectItem(null);
                setIsPanning(true);
                panStartRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                    panX: pan.x,
                    panY: pan.y,
                };
                return;
            }

            const item = findItemAt(items, original.x, original.y);
            if (item) {
                dragRef.current = {
                    id: item.id,
                    offsetX: original.x - item.x,
                    offsetY: original.y - item.y,
                };
                onSelectItem(item.id);
                return;
            }

            onSelectItem(null);
            onPlaceItem(original.x, original.y);
        },
        [
            baseCols,
            baseRows,
            gridHeight,
            gridWidth,
            items,
            onPlaceItem,
            onSelectItem,
            pan.x,
            pan.y,
            viewRotation,
            zoom,
        ],
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
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
                    ? baseRows > 0 && gridHeight > 0
                        ? baseRows / gridHeight
                        : 1
                    : baseCols > 0 && gridWidth > 0
                      ? baseCols / gridWidth
                      : 1;
            const scale = baseScale * zoom;
            const localX = (x - pan.x) / scale;
            const localY = (y - pan.y) / scale;
            const { gridX, gridY } = screenToGrid(
                localX,
                localY,
                offsetRef.current.x,
                offsetRef.current.y,
            );
            const original = toOriginal(gridX, gridY, gridWidth, gridHeight, viewRotation);
            const active = items.find((item) => item.id === dragRef.current?.id);
            if (!active) return;

            const nextX = clamp(original.x - dragRef.current.offsetX, 0, gridWidth - active.w);
            const nextY = clamp(original.y - dragRef.current.offsetY, 0, gridHeight - active.h);
            const candidate = { ...active, x: nextX, y: nextY };
            if (canPlaceItem(grid, items, candidate, active.id)) {
                onMoveItem(active.id, nextX, nextY);
            }
        },
        [
            baseCols,
            baseRows,
            grid,
            gridHeight,
            gridWidth,
            isPanning,
            items,
            onMoveItem,
            pan.x,
            pan.y,
            viewRotation,
            zoom,
        ],
    );

    const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        setIsPanning(false);
        panStartRef.current = null;
    }, []);

    const handleWheel = useCallback(
        (event: WheelEvent) => {
            event.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const baseScale =
                viewRotation === 90 || viewRotation === 270
                    ? baseRows > 0 && gridHeight > 0
                        ? baseRows / gridHeight
                        : 1
                    : baseCols > 0 && gridWidth > 0
                      ? baseCols / gridWidth
                      : 1;
            const scale = baseScale * zoom;
            const worldX = (x - pan.x) / scale;
            const worldY = (y - pan.y) / scale;

            const nextZoom = Math.min(4, Math.max(0.4, zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
            const nextScale = baseScale * nextZoom;
            const nextPanX = x - worldX * nextScale;
            const nextPanY = y - worldY * nextScale;
            setZoom(nextZoom);
            setPan({ x: nextPanX, y: nextPanY });
        },
        [baseCols, baseRows, gridHeight, gridWidth, pan.x, pan.y, viewRotation, zoom],
    );

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
    }, []);

    // Attach wheel listener as non-passive so preventDefault() actually works
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener("wheel", handleWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    useEffect(() => {
        if (gridWidth === 0 || gridHeight === 0) return;
        const wallHeight = Math.round(TILE_HEIGHT * WALL_HEIGHT_TILES);
        const corners = [
            gridToScreen(0, 0, 0, 0),
            gridToScreen(viewWidth - 1, 0, 0, 0),
            gridToScreen(0, viewHeight - 1, 0, 0),
            gridToScreen(viewWidth - 1, viewHeight - 1, 0, 0),
        ];
        const minX = Math.min(...corners.map((c) => c.screenX));
        const maxX = Math.max(...corners.map((c) => c.screenX + TILE_WIDTH));
        const minY = Math.min(...corners.map((c) => c.screenY));
        const maxY = Math.max(...corners.map((c) => c.screenY + TILE_HEIGHT + wallHeight));
        const roomWidth = maxX - minX;
        const roomHeight = maxY - minY;

        const baseScale =
            viewRotation === 90 || viewRotation === 270
                ? baseRows > 0 && gridHeight > 0
                    ? baseRows / gridHeight
                    : 1
                : baseCols > 0 && gridWidth > 0
                  ? baseCols / gridWidth
                  : 1;
        const fitZoom = Math.min(
            (canvasSize.width - 32) / (roomWidth * baseScale),
            (canvasSize.height - 32) / (roomHeight * baseScale),
        );
        const clamped = Math.min(4, Math.max(0.4, fitZoom));
        setZoom(clamped);
        setPan({ x: 0, y: 0 });
    }, [
        baseCols,
        baseRows,
        canvasSize.height,
        canvasSize.width,
        gridHeight,
        gridWidth,
        viewHeight,
        viewRotation,
        viewWidth,
    ]);

    return (
        <div className="canvas-wrap" ref={containerRef}>
            <canvas
                ref={canvasRef}
                onContextMenu={handleContextMenu}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />
        </div>
    );
}
