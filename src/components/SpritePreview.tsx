import { useEffect, useRef } from "react";
import type { FurnitureType, Rotation } from "@/types/furniture";
import { FURNITURE_CATALOG, ROTATION_TO_ORIENTATION } from "@/data/furniture-catalog";

export function SpritePreview({
    type,
    images,
    rotation,
}: {
    type: FurnitureType;
    images: Record<string, HTMLImageElement>;
    rotation: Rotation;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const orient = ROTATION_TO_ORIENTATION[rotation];
    const img = images[`${type}_${orient}`] ?? images[`${type}_SE`];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const cw = 80;
        const ch = 60;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);

        const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * 0.85;
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
    }, [img, rotation]);

    if (!img) {
        return (
            <div
                className="furniture-swatch"
                style={{ background: FURNITURE_CATALOG[type].swatch }}
            />
        );
    }

    return <canvas ref={canvasRef} className="furniture-preview" />;
}
