/**
 * Graphics System: Loads and renders assets from JSON
 */

class GraphicsManager {
  constructor() {
    this.assets = {
      cars: {},
      terrain: {},
      objects: {},
    };
  }

  async loadAssets() {
    try {
      const [carsData, terrainData] = await Promise.all([
        fetch('assets/cars.json').then(r => r.json()),
        fetch('assets/terrain.json').then(r => r.json()),
      ]);

      carsData.cars.forEach(car => {
        this.assets.cars[car.id] = car;
      });

      terrainData.tiles.forEach(tile => {
        this.assets.terrain[tile.id] = tile;
      });

      terrainData.objects.forEach(obj => {
        this.assets.objects[obj.id] = obj;
      });

      console.log('Assets loaded:', this.assets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }

  drawCar(ctx, carId, x, y, rotation = 0) {
    const car = this.assets.cars[carId];
    if (!car) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Draw based on parts (coordinates are now relative to center)
    car.parts.forEach(part => {
      if (part.type === 'body' || part.type === 'cabin') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.width, part.height);
      } else if (part.type === 'window') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.width, part.height);
      } else if (part.type === 'hood') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.width, part.height);
      } else if (part.type === 'wheel') {
        ctx.fillStyle = part.color;
        // Support both circle wheels (radius) and rectangular wheels (width/height)
        if (part.radius) {
          ctx.beginPath();
          ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (part.width && part.height) {
          ctx.fillRect(part.x, part.y, part.width, part.height);
        }
      }
    });

    ctx.restore();
  }

  drawTerrain(ctx, tileId, x, y, width = 100, height = 100) {
    const tile = this.assets.terrain[tileId];
    if (!tile) return;

    ctx.fillStyle = tile.color;
    ctx.fillRect(x, y, width, height);
  }

  drawObject(ctx, objectId, x, y) {
    const obj = this.assets.objects[objectId];
    if (!obj) return;

    ctx.save();
    ctx.translate(x, y);

    obj.parts.forEach(part => {
      if (part.type === 'trunk' || part.type === 'stem' || part.type === 'body') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x - obj.width / 2, part.y - obj.height / 2, part.width, part.height);
      } else if (part.type === 'foliage' || part.type === 'petals') {
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x - obj.width / 2, part.y - obj.height / 2, part.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.type === 'highlight') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x - obj.width / 2, part.y - obj.height / 2, part.width, part.height);
      }
    });

    ctx.restore();
  }

  drawTerrainGrid(ctx, canvasWidth, canvasHeight, scrollX = 0, scrollY = 0) {
    const tileSize = 100;
    const startX = Math.floor(scrollX / tileSize) * tileSize;
    const startY = Math.floor(scrollY / tileSize) * tileSize;

    for (let y = startY; y < canvasHeight + startY + tileSize; y += tileSize) {
      for (let x = startX; x < canvasWidth + startX + tileSize; x += tileSize) {
        const tileX = Math.floor(x / tileSize);
        const tileY = Math.floor(y / tileSize);

        // Create winding dirt tracks and roads
        let tileType = 'grass';

        // Horizontal road every 8 tiles
        if (Math.abs(tileY % 8) <= 1) {
          tileType = 'road';
        }

        // Vertical road every 10 tiles
        if (Math.abs(tileX % 10) <= 1) {
          tileType = 'road';
        }

        // Diagonal dirt tracks
        const diag1 = (tileX + tileY) % 15;
        const diag2 = (tileX - tileY) % 12;

        if (diag1 >= 7 && diag1 <= 8) {
          tileType = 'mud';
        }

        if (Math.abs(diag2) <= 1) {
          tileType = 'mud';
        }

        this.drawTerrain(ctx, tileType, x - scrollX, y - scrollY, tileSize, tileSize);
      }
    }
  }
}
