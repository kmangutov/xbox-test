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

        // Draw grass overgrowth on road edges
        if (tileType === 'road' && GameConstants.terrain.grass.overgrowth.enabled) {
          const isIntersection = isHorizontalRoad && isVerticalRoad;
          if (!isIntersection) {
            this.drawRoadOvergrowth(ctx, tileX, tileY, screenX, screenY, tileSize, isHorizontalRoad, isVerticalRoad);
          }
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

    // Fewer circles for sparser mud patches
    for (let i = 0; i < cfg.circleCount; i++) {
      const offsetX = ((seed * (i + 1) * 7919) % (tileSize * 0.6)) - tileSize * 0.3;
      const offsetY = ((seed * (i + 1) * 8831) % (tileSize * 0.6)) - tileSize * 0.3;
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
      // Horizontal road (2 tiles wide, centered on rows where tileY % 8 == 0 or 1)
      const isTopTile = tileY % 8 === 0;
      const isBottomTile = tileY % 8 === 1;

      // Center dashed line (only on top tile)
      if (isTopTile && tileX % 2 === 0) {
        ctx.fillStyle = cfg.centerLine.color;
        ctx.fillRect(
          screenX,
          screenY + tileSize - cfg.centerLine.width / 2,
          cfg.centerLine.dashLength,
          cfg.centerLine.width
        );
      }

      // Edge shoulders (solid lines)
      ctx.fillStyle = cfg.shoulder.color;
      if (isTopTile) {
        // Top edge of road
        ctx.fillRect(screenX, screenY + cfg.shoulder.offset, tileSize, cfg.shoulder.width);
      }
      if (isBottomTile) {
        // Bottom edge of road
        ctx.fillRect(screenX, screenY + tileSize - cfg.shoulder.offset - cfg.shoulder.width, tileSize, cfg.shoulder.width);
      }

    } else if (isVertical && !isHorizontal) {
      // Vertical road (2 tiles wide, centered on columns where tileX % 10 == 0 or 1)
      const isLeftTile = tileX % 10 === 0;
      const isRightTile = tileX % 10 === 1;

      // Center dashed line (only on left tile)
      if (isLeftTile && tileY % 2 === 0) {
        ctx.fillStyle = cfg.centerLine.color;
        ctx.fillRect(
          screenX + tileSize - cfg.centerLine.width / 2,
          screenY,
          cfg.centerLine.width,
          cfg.centerLine.dashLength
        );
      }

      // Edge shoulders (solid lines)
      ctx.fillStyle = cfg.shoulder.color;
      if (isLeftTile) {
        // Left edge of road
        ctx.fillRect(screenX + cfg.shoulder.offset, screenY, cfg.shoulder.width, tileSize);
      }
      if (isRightTile) {
        // Right edge of road
        ctx.fillRect(screenX + tileSize - cfg.shoulder.offset - cfg.shoulder.width, screenY, cfg.shoulder.width, tileSize);
      }
    }
  }

  drawRoadOvergrowth(ctx, tileX, tileY, screenX, screenY, tileSize, isHorizontal, isVertical) {
    const cfg = GameConstants.terrain.grass.overgrowth;
    const seed = tileX * 73856093 ^ tileY * 19349663;
    const rand = (seed % 1000) / 1000;

    if (rand > cfg.density) return; // Skip if no overgrowth

    const colors = GameConstants.terrain.grass.colorVariations;
    const patchColor = colors[Math.abs(seed) % colors.length];
    const patchSize = (Math.abs((seed * 7919) % 100) / 100) * cfg.maxSize + 5;

    ctx.fillStyle = patchColor;

    if (isHorizontal && !isVertical) {
      const isTopTile = tileY % 8 === 0;
      const isBottomTile = tileY % 8 === 1;

      // Overgrowth on top edge
      if (isTopTile) {
        const patchX = screenX + ((seed * 8831) % tileSize);
        const patchY = screenY + ((seed * 9973) % cfg.offset);
        ctx.fillRect(patchX, patchY, patchSize, patchSize);
      }

      // Overgrowth on bottom edge
      if (isBottomTile) {
        const patchX = screenX + ((seed * 8831) % tileSize);
        const patchY = screenY + tileSize - cfg.offset + ((seed * 9973) % cfg.offset);
        ctx.fillRect(patchX, patchY, patchSize, patchSize);
      }

    } else if (isVertical && !isHorizontal) {
      const isLeftTile = tileX % 10 === 0;
      const isRightTile = tileX % 10 === 1;

      // Overgrowth on left edge
      if (isLeftTile) {
        const patchX = screenX + ((seed * 8831) % cfg.offset);
        const patchY = screenY + ((seed * 9973) % tileSize);
        ctx.fillRect(patchX, patchY, patchSize, patchSize);
      }

      // Overgrowth on right edge
      if (isRightTile) {
        const patchX = screenX + tileSize - cfg.offset + ((seed * 8831) % cfg.offset);
        const patchY = screenY + ((seed * 9973) % tileSize);
        ctx.fillRect(patchX, patchY, patchSize, patchSize);
      }
    }
  }
}
