import { useRef, useEffect } from 'react';
import type { FurnitureItem as FurnitureItemType } from '../types';

interface Props {
  item: FurnitureItemType;
  isSelected: boolean;
  onSelect: (item: FurnitureItemType) => void;
  spriteSheet: HTMLImageElement | null;
}

export default function FurnitureItem({ item, isSelected, onSelect, spriteSheet }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteSheet || !item.sprite) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 36, 36);
    const { x, y, w, h } = item.sprite;
    const scale = Math.min(34 / w, 34 / h);
    const dw = w * scale;
    const dh = h * scale;
    ctx.drawImage(spriteSheet, x, y, w, h, (36 - dw) / 2, (36 - dh) / 2, dw, dh);
  }, [spriteSheet, item.sprite]);

  return (
    <button
      className={`furniture-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(item)}
      title={`Place ${item.name}`}
    >
      {item.sprite ? (
        <canvas ref={canvasRef} width={36} height={36} className="furniture-preview" />
      ) : (
        <div className="furniture-swatch" style={{ backgroundColor: item.color }} />
      )}
      <span className="furniture-name">{item.name}</span>
    </button>
  );
}
