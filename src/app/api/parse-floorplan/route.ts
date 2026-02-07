import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { FloorPlanData, Room, RoomType } from '@/types/floorplan';

const ROOM_TYPES: RoomType[] = [
  'bedroom',
  'living_room',
  'kitchen',
  'bathroom',
  'hallway',
  'office',
];

const GRID_COLS = 16;
const GRID_ROWS = 12;

const PROMPT = `You are analyzing a floor plan image. Return ONLY valid JSON with no other text, no markdown, no code fences.

Schema:
{
  "grid": boolean[][],
  "rooms": { "type": string, "label": string, "x": number, "y": number, "w": number, "h": number }[]
}

Rules:
1. grid must be exactly ${GRID_COLS} columns and ${GRID_ROWS} rows. grid[y][x]: true = floor/walkable, false = wall or outside.
2. Map the floor plan proportionally onto this grid. Interior floor space = true, walls and exterior = false.
3. rooms: detect each distinct room. type must be one of: bedroom, living_room, kitchen, bathroom, hallway, office. label is a short name like "Master Bedroom" or "Kitchen". x,y = top-left cell of the room in grid coords (0-indexed). w,h = width and height in cells. Every room must fit inside the grid and only cover cells where grid[y][x] is true.
4. Return only the JSON object, no explanation.`;

function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (codeBlock) return codeBlock[1].trim();
  return trimmed;
}

function validateRoom(room: unknown, grid: boolean[][]): room is Room {
  if (!room || typeof room !== 'object') return false;
  const r = room as Record<string, unknown>;
  if (!ROOM_TYPES.includes(r.type as RoomType)) return false;
  if (typeof r.label !== 'string') return false;
  const x = Number(r.x);
  const y = Number(r.y);
  const w = Number(r.w);
  const h = Number(r.h);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(w) || !Number.isInteger(h)) return false;
  if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > GRID_COLS || y + h > GRID_ROWS) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (!grid[y + dy]?.[x + dx]) return false;
    }
  }
  return true;
}

function validateAndNormalize(data: unknown): FloorPlanData {
  if (!data || typeof data !== 'object') throw new Error('Invalid response: not an object');
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.grid)) throw new Error('Invalid response: missing or invalid grid');
  const grid = d.grid as unknown[];
  if (grid.length !== GRID_ROWS) throw new Error(`Invalid response: grid must have ${GRID_ROWS} rows`);
  const normalizedGrid: boolean[][] = grid.map((row) => {
    if (!Array.isArray(row) || row.length !== GRID_COLS) throw new Error('Invalid response: each row must have ' + GRID_COLS + ' columns');
    return row.map((cell) => Boolean(cell));
  });

  const rooms: Room[] = [];
  if (Array.isArray(d.rooms)) {
    for (const r of d.rooms) {
      if (validateRoom(r, normalizedGrid)) rooms.push(r as Room);
    }
  }

  return { grid: normalizedGrid, rooms };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-key-here') {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const dataUri = body?.image;
    if (typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Missing or invalid image (expected base64 data URI)' }, { status: 400 });
    }

    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/png';
    const base64Data = match ? match[2] : dataUri.replace(/^data:[^;]+;base64,/, '');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Data } },
      { text: PROMPT },
    ]);

    const response = result.response;
    if (!response) {
      return NextResponse.json({ error: 'No response from model' }, { status: 502 });
    }

    const rawText = response.text();
    if (!rawText) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 });
    }

    const jsonStr = extractJsonFromText(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'Model did not return valid JSON', details: jsonStr.slice(0, 200) }, { status: 502 });
    }

    const floorPlan = validateAndNormalize(parsed);
    return NextResponse.json(floorPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
