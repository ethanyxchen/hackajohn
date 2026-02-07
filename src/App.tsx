import { useState, useCallback, useEffect } from 'react';
import type { FurnitureItem } from './types';
import { useGrid } from './hooks/useGrid';
import { SPRITE_SHEET } from './data/furniture';
import IsometricCanvas from './components/IsometricCanvas';
import Sidebar from './components/Sidebar';
import './styles/App.css';

export default function App() {
  const { grid, toggleTile, placeFurniture, removeFurniture, clearGrid } = useGrid();
  const [selectedFurniture, setSelectedFurniture] = useState<FurnitureItem | null>(null);
  const [drawMode, setDrawMode] = useState<'tile' | 'furniture'>('tile');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setSpriteSheet(img);
    img.src = SPRITE_SHEET;
  }, []);

  const handleFurniturePlace = useCallback(
    (x: number, y: number) => {
      if (selectedFurniture) {
        placeFurniture(x, y, selectedFurniture);
      }
    },
    [selectedFurniture, placeFurniture]
  );

  return (
    <div className="app">
      <Sidebar
        selectedFurniture={selectedFurniture}
        onSelectFurniture={setSelectedFurniture}
        onClearGrid={clearGrid}
        onImageLoad={setBackgroundImage}
        onClearImage={() => setBackgroundImage(null)}
        hasImage={backgroundImage !== null}
        drawMode={drawMode}
        onSetDrawMode={setDrawMode}
        spriteSheet={spriteSheet}
      />
      <main className="main">
        <IsometricCanvas
          grid={grid}
          onTileClick={toggleTile}
          onFurniturePlace={handleFurniturePlace}
          onFurnitureRemove={removeFurniture}
          drawMode={drawMode}
          selectedFurniture={selectedFurniture}
          backgroundImage={backgroundImage}
          spriteSheet={spriteSheet}
        />
      </main>
    </div>
  );
}
