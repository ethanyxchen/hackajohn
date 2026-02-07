import type { FurnitureItem as FurnitureItemType } from '../types';
import { furnitureCatalog } from '../data/furniture';
import FurnitureItem from './FurnitureItem';
import FloorPlanUpload from './FloorPlanUpload';

interface Props {
  selectedFurniture: FurnitureItemType | null;
  onSelectFurniture: (item: FurnitureItemType | null) => void;
  onClearGrid: () => void;
  onImageLoad: (img: HTMLImageElement) => void;
  onClearImage: () => void;
  hasImage: boolean;
  drawMode: 'tile' | 'furniture';
  onSetDrawMode: (mode: 'tile' | 'furniture') => void;
  spriteSheet: HTMLImageElement | null;
}

export default function Sidebar({
  selectedFurniture,
  onSelectFurniture,
  onClearGrid,
  onImageLoad,
  onClearImage,
  hasImage,
  drawMode,
  onSetDrawMode,
  spriteSheet,
}: Props) {
  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">Room Decorator</h1>

      <div className="sidebar-section">
        <h3>Mode</h3>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${drawMode === 'tile' ? 'active' : ''}`}
            onClick={() => {
              onSetDrawMode('tile');
              onSelectFurniture(null);
            }}
          >
            Draw Tiles
          </button>
          <button
            className={`mode-btn ${drawMode === 'furniture' ? 'active' : ''}`}
            onClick={() => onSetDrawMode('furniture')}
          >
            Place Furniture
          </button>
        </div>
      </div>

      {drawMode === 'tile' && (
        <div className="sidebar-section">
          <h3>Tile Drawing</h3>
          <p className="hint">Click tiles to cycle: empty → floor → wall</p>
        </div>
      )}

      {drawMode === 'furniture' && (
        <div className="sidebar-section">
          <h3>Furniture</h3>
          <p className="hint">Select an item, then click a floor tile to place it. Click placed furniture to remove it.</p>
          <div className="furniture-list">
            {furnitureCatalog.map(item => (
              <FurnitureItem
                key={item.id}
                item={item}
                isSelected={selectedFurniture?.id === item.id}
                onSelect={(f) => onSelectFurniture(f)}
                spriteSheet={spriteSheet}
              />
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <FloorPlanUpload
          onImageLoad={onImageLoad}
          onClear={onClearImage}
          hasImage={hasImage}
        />
      </div>

      <div className="sidebar-section">
        <button className="clear-grid-btn" onClick={onClearGrid}>
          Clear Grid
        </button>
      </div>
    </aside>
  );
}
