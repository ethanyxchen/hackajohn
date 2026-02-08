"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { FloorPlanData, Room } from "@/types/floorplan";
import type { FurnitureItem, FurnitureType, Rotation, ViewRotation } from "@/types/furniture";
import {
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    FURNITURE_CATALOG,
    GRANULARITY_TARGET,
    MAX_COLS,
    MAX_ROWS,
    ROTATION_TO_ORIENTATION,
    SPRITE_BASE_MAP,
} from "@/data/furniture-catalog";
import { SAMPLE_PRESETS, type SamplePreset } from "@/data/sample-presets";
import { createFloor, resampleGrid, scaleRooms } from "@/utils/grid";
import { autoFurnish, buildItem, canPlaceItem } from "@/utils/furniture";
import { useSpriteImages } from "@/hooks/useSpriteImages";
import { SpritePreview } from "@/components/SpritePreview";
import { IsoRoomCanvas } from "@/components/IsoRoomCanvas";

export default function RoomPlanner() {
    const [grid, setGrid] = useState<boolean[][]>(() => createFloor(DEFAULT_WIDTH, DEFAULT_HEIGHT));
    const [items, setItems] = useState<FurnitureItem[]>(() => [
        buildItem("sofa", 2, 2, 0),
        buildItem("table", 5, 3, 0),
        buildItem("bed", 7, 2, 0),
        buildItem("plant", 1, 5, 0),
    ]);
    const [activeFurniture, setActiveFurniture] = useState<FurnitureType>("sofa");
    const [rotation, setRotation] = useState<Rotation>(0);
    const [viewRotation, setViewRotation] = useState<ViewRotation>(0);
    const [status, setStatus] = useState<string>(
        "Drag furniture in the isometric view to move it.",
    );
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [baseGrid, setBaseGrid] = useState<boolean[][] | null>(() =>
        createFloor(DEFAULT_WIDTH, DEFAULT_HEIGHT),
    );
    const [baseRooms, setBaseRooms] = useState<Room[]>([]);

    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [furnishing, setFurnishing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const spriteImages = useSpriteImages(SPRITE_BASE_MAP);

    const aiFurnish = useCallback(async (targetGrid: boolean[][], targetRooms: Room[]) => {
        if (targetRooms.length === 0) return;
        setFurnishing(true);
        setStatus("Designing interior layout with AI…");
        try {
            const res = await fetch("/api/furnish-rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grid: targetGrid, rooms: targetRooms }),
            });
            const data = await res.json();
            if (!res.ok || !Array.isArray(data.furniture) || data.furniture.length === 0) {
                // Fallback to algorithmic auto-furnish
                const fallback = autoFurnish(targetGrid, targetRooms);
                setItems(fallback);
                setStatus(
                    `AI furnish unavailable — placed ${fallback.length} items algorithmically.`,
                );
                return;
            }
            const placed: FurnitureItem[] = (
                data.furniture as Array<{ type: FurnitureType; x: number; y: number }>
            ).map((f) => buildItem(f.type, f.x, f.y, 0));
            setItems(placed);
            setSelectedItemId(null);
            setStatus(`AI designed interior with ${placed.length} furniture items!`);
        } catch {
            const fallback = autoFurnish(targetGrid, targetRooms);
            setItems(fallback);
            setStatus(`AI furnish failed — placed ${fallback.length} items algorithmically.`);
        } finally {
            setFurnishing(false);
        }
    }, []);

    const onFloorPlanParsed = useCallback(
        (data: FloorPlanData, furnish = true) => {
            setGrid(data.grid);
            setRooms(data.rooms);
            setBaseGrid(data.grid);
            setBaseRooms(data.rooms);
            setSelectedItemId(null);

            if (furnish && data.rooms.length > 0) {
                // Use simple auto-furnish immediately, then kick off AI furnish in the background
                const quick = autoFurnish(data.grid, data.rooms);
                setItems(quick);
                setStatus(`Floor plan loaded — designing interior with AI…`);
                // Fire-and-forget AI furnish (replaces items when done)
                aiFurnish(data.grid, data.rooms);
            } else {
                setItems([]);
                setStatus("Floor plan loaded! Use AI Furnish or drop furniture manually.");
            }
        },
        [aiFurnish],
    );

    const readFileAsDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
        });

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith("image/")) {
            setUploadError("Please upload an image file.");
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            setUploadPreview(dataUrl);
            setUploadError(null);
        } catch {
            setUploadError("Failed to read image file.");
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!uploadPreview) return;
        setUploading(true);
        setUploadError(null);
        try {
            const res = await fetch("/api/parse-floorplan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: uploadPreview }),
            });
            const data = await res.json();
            if (!res.ok) {
                setUploadError(data.error || "Analysis failed.");
                return;
            }
            onFloorPlanParsed(data as FloorPlanData);
        } catch {
            setUploadError("Network error. Please try again.");
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

    const handleAIFurnish = useCallback(() => {
        if (rooms.length === 0) {
            setStatus("No rooms detected. Upload a floor plan or load a sample first.");
            return;
        }
        aiFurnish(grid, rooms);
    }, [grid, rooms, aiFurnish]);

    const handleQuickFurnish = useCallback(() => {
        if (rooms.length === 0) {
            setStatus("No rooms detected. Upload a floor plan or load a sample first.");
            return;
        }
        const furnished = autoFurnish(grid, rooms);
        setItems(furnished);
        setSelectedItemId(null);
        setStatus(`Quick-furnished ${furnished.length} items across ${rooms.length} rooms.`);
    }, [grid, rooms]);

    const handleLoadPreset = useCallback(
        (preset: SamplePreset) => {
            onFloorPlanParsed(preset.data, true);
            setUploadPreview(null);
            setUploadError(null);
        },
        [onFloorPlanParsed],
    );

    const handlePlaceAt = useCallback(
        (x: number, y: number) => {
            const candidate = buildItem(activeFurniture, x, y, rotation);
            if (canPlaceItem(grid, items, candidate)) {
                setItems((prev) => [...prev, candidate]);
                setSelectedItemId(candidate.id);
                setStatus("Placed furniture. Drag to move.");
            } else {
                setStatus("Cannot place there. Try another tile.");
            }
        },
        [activeFurniture, grid, items, rotation],
    );

    const resetScene = useCallback(() => {
        const nextGrid = createFloor(DEFAULT_WIDTH, DEFAULT_HEIGHT);
        setGrid(nextGrid);
        setBaseGrid(nextGrid);
        setBaseRooms([]);
        setItems([
            buildItem("sofa", 2, 2, 0),
            buildItem("table", 5, 3, 0),
            buildItem("bed", 7, 2, 0),
            buildItem("plant", 1, 5, 0),
        ]);
        setStatus("Reset to a clean, playable scene.");
    }, []);

    const clearFurniture = useCallback(() => {
        setItems([]);
        setSelectedItemId(null);
        setStatus("Cleared all furniture.");
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles],
    );

    const handleUploadZoneClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleUploadZoneKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
        }
    }, []);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            handleFiles(e.target.files);
        },
        [handleFiles],
    );

    const handleAnalyzeClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            handleAnalyze();
        },
        [handleAnalyze],
    );

    const handleClearUpload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadPreview(null);
        setUploadError(null);
    }, []);

    const handleRotate = useCallback(() => {
        setRotation((prev) => ((prev + 90) % 360) as Rotation);
    }, []);

    const handleRotateView = useCallback(() => {
        setViewRotation((prev) => ((prev + 90) % 360) as ViewRotation);
    }, []);

    const handleMoveItem = useCallback((id: string, nextX: number, nextY: number) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, x: nextX, y: nextY } : item)),
        );
    }, []);

    const handlePresetClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            const name = e.currentTarget.dataset.preset;
            const preset = SAMPLE_PRESETS.find((p) => p.name === name);
            if (preset) handleLoadPreset(preset);
        },
        [handleLoadPreset],
    );

    const handleFurnitureCardClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const type = e.currentTarget.dataset.type as FurnitureType;
        if (type) setActiveFurniture(type);
    }, []);

    const maxGranularity = useMemo(() => {
        if (!baseGrid || baseGrid.length === 0 || baseGrid[0]?.length === 0) return 1;
        const baseCols = baseGrid[0].length;
        const baseRows = baseGrid.length;
        return Math.max(
            1,
            Math.min(Math.floor(MAX_COLS / baseCols), Math.floor(MAX_ROWS / baseRows)),
        );
    }, [baseGrid]);

    const granularity = useMemo(
        () => Math.min(GRANULARITY_TARGET, maxGranularity),
        [maxGranularity],
    );
    const prevGranRef = useRef(granularity);
    useEffect(() => {
        if (!baseGrid || baseGrid.length === 0 || baseGrid[0]?.length === 0) return;
        const baseCols = baseGrid[0].length;
        const baseRows = baseGrid.length;
        const factor = Math.max(1, Math.min(granularity, maxGranularity));
        const targetCols = baseCols * factor;
        const targetRows = baseRows * factor;

        // Skip if nothing actually changed (avoids clearing items on mount)
        if (
            factor === prevGranRef.current &&
            grid.length === targetRows &&
            (grid[0]?.length ?? 0) === targetCols
        ) {
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
                <p>
                    Sketch a floor plan, then watch it snap into a cozy isometric room. Drop
                    furniture on the plan or drag it around in the 3D view.
                </p>
            </header>

            <section className="main">
                <div className="panel">
                    <h2>Floor Plan</h2>

                    <div
                        tabIndex={0}
                        className={`upload-zone ${dragOver ? "dragover" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleUploadZoneClick}
                        onKeyDown={handleUploadZoneKeyDown}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="upload-input"
                            onChange={handleFileInputChange}
                        />
                        {uploadPreview ? (
                            <div className="upload-preview">
                                <Image
                                    src={uploadPreview}
                                    alt="Floor plan preview"
                                    width={400}
                                    height={300}
                                    unoptimized
                                />
                                <div className="upload-actions">
                                    <button
                                        type="button"
                                        className="action-button primary"
                                        onClick={handleAnalyzeClick}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <>
                                                <span className="spinner" /> Analyzing…
                                            </>
                                        ) : (
                                            "Analyze Floor Plan"
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="tool-button"
                                        onClick={handleClearUpload}
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
                            <button type="button" className="tool-button" onClick={handleTryAgain}>
                                Try Again
                            </button>
                        </div>
                    )}

                    <div className="preset-row">
                        <span className="preset-label">Quick start:</span>
                        {SAMPLE_PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                className="tool-button"
                                data-preset={preset.name}
                                onClick={handlePresetClick}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>

                    <div className="furniture-list">
                        {Object.entries(FURNITURE_CATALOG).map(([key, data]) => (
                            <button
                                key={key}
                                type="button"
                                className={`furniture-card ${activeFurniture === key ? "active" : ""}`}
                                data-type={key}
                                onClick={handleFurnitureCardClick}
                            >
                                <SpritePreview
                                    type={key as FurnitureType}
                                    images={spriteImages}
                                    rotation={activeFurniture === key ? rotation : 0}
                                />
                                <strong>{data.label}</strong>
                                <div className="note">
                                    {data.w}x{data.h} tiles
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="tool-row">
                        <button className="tool-button" onClick={handleRotate} type="button">
                            Rotate {rotation}° ({ROTATION_TO_ORIENTATION[rotation]})
                        </button>
                    </div>

                    <div className="actions">
                        <button
                            className="action-button primary"
                            onClick={resetScene}
                            type="button"
                        >
                            Reset Scene
                        </button>
                        <button
                            className="action-button accent"
                            onClick={handleAIFurnish}
                            disabled={furnishing || rooms.length === 0}
                            type="button"
                        >
                            {furnishing ? (
                                <>
                                    <span className="spinner" /> Designing…
                                </>
                            ) : (
                                "AI Furnish"
                            )}
                        </button>
                        <button
                            className="action-button"
                            onClick={handleQuickFurnish}
                            type="button"
                        >
                            Quick Furnish
                        </button>
                        <button className="action-button" onClick={clearFurniture} type="button">
                            Clear Furniture
                        </button>
                    </div>
                    <p className="note">
                        Tip: click in the isometric view to place furniture. Drag items to move
                        them.
                    </p>
                </div>

                <div className="panel">
                    <h2>Isometric Room</h2>
                    <div className="tool-row">
                        <button className="tool-button" onClick={handleRotateView} type="button">
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
                        onMoveItem={handleMoveItem}
                        onPlaceItem={handlePlaceAt}
                        selectedItemId={selectedItemId}
                        onSelectItem={setSelectedItemId}
                    />
                    <div className="status">
                        {status} Shift-drag or right-click to pan, scroll to zoom.
                    </div>
                </div>
            </section>
        </>
    );
}
