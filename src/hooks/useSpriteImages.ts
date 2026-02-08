import { useEffect, useState } from "react";
import type { FurnitureType } from "@/types/furniture";
import { ORIENTATIONS, type SpriteBaseInfo } from "@/data/furniture-catalog";

export function useSpriteImages(
    spriteBaseMap: Partial<Record<FurnitureType, SpriteBaseInfo>>,
): Record<string, HTMLImageElement> {
    const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        const entries = Object.entries(spriteBaseMap) as [FurnitureType, SpriteBaseInfo][];
        let cancelled = false;
        const loaded: Record<string, HTMLImageElement> = {};
        let remaining = entries.length * ORIENTATIONS.length;

        for (const [type, info] of entries) {
            for (const orient of ORIENTATIONS) {
                const key = `${type}_${orient}`;
                const img = new Image();
                img.onload = () => {
                    loaded[key] = img;
                    remaining -= 1;
                    if (remaining === 0 && !cancelled) {
                        setImages({ ...loaded });
                    }
                };
                img.onerror = () => {
                    remaining -= 1;
                    if (remaining === 0 && !cancelled) {
                        setImages({ ...loaded });
                    }
                };
                img.src = `/sprites/kenney/${info.baseName}_${orient}.png`;
            }
        }

        return () => {
            cancelled = true;
        };
    }, [spriteBaseMap]);

    return images;
}
