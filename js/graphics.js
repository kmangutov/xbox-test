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
        const isHorizontalRoad = Math.abs(tileY % 8) <= 1;
        const isVerticalRoad = Math.abs(tileX % 10) <= 1;

        // Horizontal road every 8 tiles
        if (isHorizontalRoad) {
          tileType = 'road';
        }

        // Vertical road every 10 tiles
        if (isVerticalRoad) {
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

        const screenX = x - scrollX;
        const screenY = y - scrollY;

        // Draw base terrain
        if (tileType === 'grass') {
          this.drawGrassTile(ctx, tileX, tileY, screenX, screenY, tileSize);
        } else if (tileType === 'mud') {
          this.drawMudTile(ctx, tileX, tileY, screenX, screenY, tileSize);
        } else {
          this.drawTerrain(ctx, tileType, screenX, screenY, tileSize, tileSize);
        }

        // Draw road markings if on road
        if (tileType === 'road' && GameConstants.roadMarkings.enabled) {
          const isIntersection = isHorizontalRoad && isVerticalRoad;
          this.drawRoadMarkings(ctx, tileX, tileY, screenX, screenY, tileSize, isHorizontalRoad, isVerticalRoad, isIntersection);
        }
      }
    }
  }

  drawGrassTile(ctx, tileX, tileY, screenX, screenY, tileSize) {
    const tile = this.assets.terrain['grass'];
    ctx.fillStyle = tile.color;
    ctx.fillRect(screenX, screenY, tileSize, tileSize);

    // Add patch variation
    const seed = tileX * 73856093 ^ tileY * 19349663;
    const rand = (seed % 1000) / 1000;

    if (rand < GameConstants.terrain.grass.patchDensity) {
      const colors = GameConstants.terrain.grass.colorVariations;
      const patchColor = colors[Math.abs(seed) % colors.length];

      const patchSize = GameConstants.terrain.grass.patchMinSize +
        (Math.abs((seed * 7919) % 100) / 100) *
        (GameConstants.terrain.grass.patchMaxSize - GameConstants.terrain.grass.patchMinSize);

      const patchX = screenX + ((seed * 8831) % tileSize);
      const patchY = screenY + ((seed * 9973) % tileSize);

      ctx.fillStyle = patchColor;
      ctx.fillRect(patchX, patchY, patchSize, patchSize);
    }
  }

  drawMudTile(ctx, tileX, tileY, screenX, screenY, tileSize) {
    // Draw grass base first
    const grassTile = this.assets.terrain['grass'];
    ctx.fillStyle = grassTile.color;
    ctx.fillRect(screenX, screenY, tileSize, tileSize);

    // Draw overlapping mud circles
    const cfg = GameConstants.terrain.mud;
    const seed = tileX * 73856093 ^ tileY * 19349663;

    ctx.save();
    ctx.globalAlpha = cfg.alpha;

    // Multiple circles for irregular patches
    for (let i = 0; i < 3; i++) {
      const offsetX = ((seed * (i + 1) * 7919) % tileSize) - tileSize / 2;
      const offsetY = ((seed * (i + 1) * 8831) % tileSize) - tileSize / 2;
      const color = i % 2 === 0 ? cfg.baseColor : cfg.darkColor;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        screenX + tileSize / 2 + offsetX,
        screenY + tileSize / 2 + offsetY,
        cfg.circleRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  drawRoadMarkings(ctx, tileX, tileY, screenX, screenY, tileSize, isHorizontal, isVertical, isIntersection) {
    if (isIntersection) {
      return; // No markings in intersections
    }

    const cfg = GameConstants.roadMarkings;

    if (isHorizontal && !isVertical) {
      // Horizontal road markings
      const roadWidth = tileSize * 2; // Road is 2 tiles wide
      const centerY = tileY % 8 === 0 ? screenY + tileSize : screenY;

      // Center dashed line
      if (tileX % 2 === 0) {  // Dash every other tile
        ctx.fillStyle = cfg.centerLine.color;
        ctx.fillRect(
          screenX,
          centerY - cfg.centerLine.width / 2,
          cfg.centerLine.dashLength,
          cfg.centerLine.width
        );
      }

      // Edge shoulders
      ctx.fillStyle = cfg.shoulder.color;
      // Top edge
      ctx.fillRect(screenX, screenY + cfg.shoulder.offset, tileSize, cfg.shoulder.width);
      // Bottom edge
      ctx.fillRect(screenX, screenY + roadWidth - cfg.shoulder.offset, tileSize, cfg.shoulder.width);

    } else if (isVertical && !isHorizontal) {
      // Vertical road markings
      const roadWidth = tileSize * 2; // Road is 2 tiles wide
      const centerX = tileX % 10 === 0 ? screenX + tileSize : screenX;

      // Center dashed line
      if (tileY % 2 === 0) {  // Dash every other tile
        ctx.fillStyle = cfg.centerLine.color;
        ctx.fillRect(
          centerX - cfg.centerLine.width / 2,
          screenY,
          cfg.centerLine.width,
          cfg.centerLine.dashLength
        );
      }

      // Edge shoulders
      ctx.fillStyle = cfg.shoulder.color;
      // Left edge
      ctx.fillRect(screenX + cfg.shoulder.offset, screenY, cfg.shoulder.width, tileSize);
      // Right edge
      ctx.fillRect(screenX + roadWidth - cfg.shoulder.offset, screenY, cfg.shoulder.width, tileSize);
    }
  }
}
