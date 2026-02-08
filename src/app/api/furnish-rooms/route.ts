import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Room } from "@/types/floorplan";

const FURNITURE_TYPES = [
    "sofa",
    "bed",
    "table",
    "chair",
    "plant",
    "bookshelf",
    "lamp",
    "nightstand",
    "stove",
    "television",
] as const;

type FurnitureType = (typeof FURNITURE_TYPES)[number];

/** Compact visual representation of the grid for the prompt */
function gridToCompact(grid: boolean[][]): string {
    return grid.map((row) => row.map((cell) => (cell ? "." : "#")).join("")).join("\n");
}

function buildFurnishPrompt(grid: boolean[][], rooms: Room[]): string {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const compact = gridToCompact(grid);

    const roomList = rooms
        .map(
            (r) => `  • ${r.label} (${r.type}): top-left col=${r.x} row=${r.y}, size ${r.w}×${r.h}`,
        )
        .join("\n");

    return `You are an expert interior designer. Given a floor plan, place furniture to create a beautiful, realistic, livable space.

FLOOR PLAN (${cols} cols × ${rows} rows — '.' = walkable floor, '#' = wall / outside):
${compact}

ROOMS:
${roomList}

AVAILABLE FURNITURE (each piece occupies exactly 1 tile):
sofa, bed, table, chair, plant, bookshelf, lamp, nightstand, stove, television

DESIGN GUIDELINES:
1. Place items ONLY on '.' tiles that fall INSIDE a room's bounds.
2. No two items may share the same tile.
3. Prefer placing large furniture (bed, sofa, bookshelf, stove, television) AGAINST A WALL — i.e. at least one of the four neighbouring cells is '#'.
4. Create realistic, functional groupings per room type:
   • bedroom  → 1 bed against wall, 1-2 nightstands beside the bed, 1 lamp, optionally a plant or bookshelf. Aim for 3-5 items.
   • living_room → 1-2 sofas against wall, 1 table in front of sofa, 1 television opposite sofa, 1-2 plants in corners, 1 lamp. Aim for 5-7 items.
   • kitchen → 1 stove against wall, 1 table, 2-3 chairs near table. Aim for 4-5 items.
   • office → 1 table (desk) against wall, 1 chair at desk, 1 bookshelf against wall, 1 lamp, optionally a plant. Aim for 4-5 items.
   • hallway → 0-1 plant or lamp.
   • bathroom → leave empty (0 items).
5. Leave walking paths — don't fill more than ~50% of a room's floor tiles.
6. Think about aesthetics: symmetry where appropriate, plants in corners, lamps near seating.

Return a JSON array of placements. Each element: { "type": "<furniture_type>", "x": <column>, "y": <row> }
x = 0-indexed column, y = 0-indexed row. Every (x, y) must be a '.' cell.

Return ONLY the JSON array. No markdown, no code fences, no explanation.`;
}

type RawPlacement = { type: string; x: number; y: number };

function validatePlacements(
    raw: unknown,
    grid: boolean[][],
): Array<{ type: FurnitureType; x: number; y: number }> {
    if (!Array.isArray(raw)) return [];

    const cols = grid[0]?.length ?? 0;
    const rows = grid.length;
    const validTypes = new Set<string>(FURNITURE_TYPES);
    const occupied = new Set<string>();
    const result: Array<{ type: FurnitureType; x: number; y: number }> = [];

    for (const item of raw as RawPlacement[]) {
        if (!item || typeof item !== "object") continue;
        const t = String(item.type);
        const x = Number(item.x);
        const y = Number(item.y);

        if (!validTypes.has(t)) continue;
        if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        if (!grid[y]?.[x]) continue;

        const key = `${x},${y}`;
        if (occupied.has(key)) continue;
        occupied.add(key);

        result.push({ type: t as FurnitureType, x, y });
    }

    return result;
}

function extractJsonFromText(text: string): string {
    const trimmed = text.trim();
    const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
    if (codeBlock) return codeBlock[1].trim();
    return trimmed;
}

export async function POST(request: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your-key-here") {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        const body = await request.json();
        const grid = body?.grid;
        const rooms = body?.rooms;

        if (!Array.isArray(grid) || !Array.isArray(rooms)) {
            return NextResponse.json(
                { error: "Missing grid or rooms in request body" },
                { status: 400 },
            );
        }

        const normalizedGrid: boolean[][] = grid.map((row: unknown) =>
            Array.isArray(row) ? row.map((cell: unknown) => Boolean(cell)) : [],
        );

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = buildFurnishPrompt(normalizedGrid, rooms as Room[]);

        const result = await model.generateContent([{ text: prompt }]);
        const response = result.response;
        if (!response) {
            return NextResponse.json({ error: "No response from model" }, { status: 502 });
        }

        const rawText = response.text();
        if (!rawText) {
            return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
        }

        const jsonStr = extractJsonFromText(rawText);
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            return NextResponse.json(
                { error: "Model did not return valid JSON", details: jsonStr.slice(0, 300) },
                { status: 502 },
            );
        }

        const placements = validatePlacements(parsed, normalizedGrid);

        if (placements.length === 0) {
            return NextResponse.json(
                { error: "Model returned no valid furniture placements" },
                { status: 502 },
            );
        }

        return NextResponse.json({ furniture: placements });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Furnishing failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
