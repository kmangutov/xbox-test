# Architecture Overview

## System Design

The game uses a simple module-based architecture with separate systems for input, graphics, and game logic.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Input     │────▶│  Game Loop   │────▶│  Graphics   │
│  Manager    │     │              │     │  Manager    │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                     │
      ▼                    ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Keyboard    │     │   Physics    │     │ JSON Assets │
│ Gamepad     │     │   Terrain    │     │ cars.json   │
│ Touch       │     │  Tire Tracks │     │ terrain.json│
└─────────────┘     └──────────────┘     └─────────────┘
```

## Input System (`js/input.js`)

### Three Input Sources → One Normalized State

All inputs (keyboard, gamepad, touch) are normalized to the same format:

```javascript
this.state = {
  steering: 0,      // -1 (left) to 1 (right)
  acceleration: 0,  // 0 to 1
  brake: 0          // 0 to 1
}
```

### Keyboard Input

Simple binary state tracking:

```javascript
setupKeyboardListeners() {
  window.addEventListener('keydown', (e) => {
    if (keyMap.left.includes(e.key)) this.keyboard.left = true;
    if (keyMap.right.includes(e.key)) this.keyboard.right = true;
    // ...
  });
}

// In update():
if (this.keyboard.left) this.state.steering -= 1;
if (this.keyboard.right) this.state.steering += 1;
```

### Gamepad Input

Maps physical wheel limits to -1 to 1:

```javascript
// Constants (js/constants.js)
gamepad: {
  steeringMin: -0.15,  // Physical wheel turned all the way left
  steeringMax: 0.25,   // Physical wheel turned all the way right
  deadzone: 0.05
}

// Mapping (js/input.js)
const rawLX = this.gamepad.axes[0];
const lx = Math.abs(rawLX) > deadzone ? rawLX : 0;

let steering = 0;
if (lx < 0) {
  steering = lx / 0.15;  // -0.15 → -1 (full left)
} else if (lx > 0) {
  steering = lx / 0.25;  // 0.25 → 1 (full right)
}

// TODO: TEMPORARY - Auto-acceleration
if (autoAccelerateOnSteering && Math.abs(steering) > 0.1) {
  this.state.acceleration = 1.0;
}
```

### Touch Input (Mobile)

Button-based, shows only on mobile:

```javascript
setupTouchListeners() {
  steerLeft.addEventListener('touchstart', () => this.touch.steeringLeft = true);
  steerRight.addEventListener('touchstart', () => this.touch.steeringRight = true);
  accelerate.addEventListener('touchstart', () => this.touch.accelerating = true);
}

// In update():
if (this.touch.steeringLeft) this.state.steering -= 1;
if (this.touch.steeringRight) this.state.steering += 1;
```

## Asset System (`js/graphics.js`)

### Loading Assets from JSON

Assets are loaded asynchronously on game init:

```javascript
async loadAssets() {
  const [carsData, terrainData] = await Promise.all([
    fetch('assets/cars.json').then(r => r.json()),
    fetch('assets/terrain.json').then(r => r.json()),
  ]);

  // Store in lookup tables
  carsData.cars.forEach(car => {
    this.assets.cars[car.id] = car;
  });

  terrainData.tiles.forEach(tile => {
    this.assets.terrain[tile.id] = tile;
  });
}
```

### Car Asset Structure (`assets/cars.json`)

Cars are defined as a collection of parts with coordinates relative to center:

```json
{
  "id": "truck",
  "width": 50,
  "height": 70,
  "parts": [
    { "type": "wheel", "x": -20, "y": -28, "width": 8, "height": 16, "color": "#1a1a1a" },
    { "type": "cabin", "x": -15, "y": -35, "width": 30, "height": 25, "color": "#c0392b" },
    { "type": "window", "x": -12, "y": -32, "width": 24, "height": 15, "color": "#3498db" }
  ]
}
```

**Key points:**
- Coordinates are relative to center (0, 0)
- Car rotates around center point
- Parts rendered in order (back to front)

### Rendering Cars

```javascript
drawCar(ctx, carId, x, y, rotation = 0) {
  const car = this.assets.cars[carId];

  ctx.save();
  ctx.translate(x, y);     // Move to car position
  ctx.rotate(rotation);    // Rotate around center

  car.parts.forEach(part => {
    if (part.type === 'wheel') {
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.width, part.height);
    }
    // ... other part types
  });

  ctx.restore();
}
```

## Terrain System (`js/graphics.js` + `js/game.js`)

### Terrain Tiles (`assets/terrain.json`)

```json
{
  "id": "grass",
  "color": "#4ecca3",
  "speedMultiplier": 0.7  // Affects car speed/handling
}
```

### Procedural Terrain Generation

Roads and dirt tracks are generated procedurally, not from tile data:

```javascript
drawTerrainGrid(ctx, canvasWidth, canvasHeight, scrollX, scrollY) {
  const tileSize = 100;

  for (let y = startY; y < canvasHeight + startY + tileSize; y += tileSize) {
    for (let x = startX; x < canvasWidth + startX + tileSize; x += tileSize) {
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);

      let tileType = 'grass';  // Default

      // Horizontal roads every 8 tiles
      if (Math.abs(tileY % 8) <= 1) tileType = 'road';

      // Vertical roads every 10 tiles
      if (Math.abs(tileX % 10) <= 1) tileType = 'road';

      // Diagonal dirt tracks
      if ((tileX + tileY) % 15 >= 7 && (tileX + tileY) % 15 <= 8) {
        tileType = 'mud';
      }

      this.drawTerrain(ctx, tileType, x - scrollX, y - scrollY, tileSize, tileSize);
    }
  }
}
```

### Terrain Detection & Physics

Game detects current terrain to affect speed/handling:

```javascript
getCurrentTerrain() {
  const tileX = Math.floor((this.scrollX + canvasWidth/2) / 100);
  const tileY = Math.floor((this.scrollY + canvasHeight/2) / 100);

  // Same logic as drawTerrainGrid
  if (Math.abs(tileY % 8) <= 1 || Math.abs(tileX % 10) <= 1) {
    return this.graphicsManager.assets.terrain['road'];
  }
  // ...
  return this.graphicsManager.assets.terrain['grass'];
}

// In update loop:
const terrain = this.getCurrentTerrain();
const terrainMultiplier = terrain.speedMultiplier;  // 0.5 for mud, 0.7 for grass, 1.0 for road

this.car.speed = Math.min(
  physics.maxSpeed * terrainMultiplier,
  this.car.speed + physics.acceleration * terrainMultiplier
);
```

## Object Placement (`js/game.js`)

Trees, rocks, and flowers are procedurally placed in clumps:

```javascript
drawSceneObjects() {
  const clumpSize = 400;

  for (let cy = startY; cy < endY; cy += clumpSize) {
    for (let cx = startX; cx < endX; cx += clumpSize) {
      if (this.isOnRoad(cx, cy)) continue;  // Don't place on roads

      const clumpHash = Math.floor(cx / clumpSize) + Math.floor(cy / clumpSize) * 173;
      const rand = (clumpHash * 9973) % 100;

      if (rand < 25) {  // 25% chance of clump
        const clumpType = rand % 2 === 0 ? 'tree' : 'rock';

        for (let i = 0; i < numObjects; i++) {
          // Random offset within clump
          const worldX = cx + offsetX;
          const worldY = cy + offsetY;

          this.graphicsManager.drawObject(ctx, clumpType, screenX, screenY);
        }
      }
    }
  }
}
```

## Future Roadmap

### 1. Road Markings

**Current:** Solid color tiles for roads
**Planned:** Dashed center lines, solid edge lines, shoulders

```javascript
// Potential approach in drawTerrainGrid():
drawRoadMarkings(ctx, tileX, tileY, screenX, screenY) {
  // Detect if this is a road tile
  const isHorizontalRoad = Math.abs(tileY % 8) <= 1;
  const isVerticalRoad = Math.abs(tileX % 10) <= 1;
  const isIntersection = isHorizontalRoad && isVerticalRoad;

  if (isIntersection) {
    // No markings in intersections
    return;
  }

  if (isHorizontalRoad) {
    // Draw dashed white center line
    if (tileX % 2 === 0) {  // Every other tile for dashing
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX + 45, screenY, 10, 100);
    }

    // Draw solid shoulder lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screenX + 10, screenY, 3, 100);  // Left edge
    ctx.fillRect(screenX + 87, screenY, 3, 100);  // Right edge
  }

  // Similar for vertical roads...
}
```

### 2. Asset Editor Page

**Current:** Assets defined in JSON, edited manually
**Planned:** Visual editor for truck/car customization

**Approach:**
- Create `editor.html` with canvas preview
- Load car from `assets/cars.json`
- UI controls to adjust part positions, colors, sizes
- Export modified JSON

```javascript
// editor.js (future)
class AssetEditor {
  constructor() {
    this.currentCar = null;
    this.selectedPart = null;
  }

  async loadCar(carId) {
    const data = await fetch('assets/cars.json').then(r => r.json());
    this.currentCar = data.cars.find(c => c.id === carId);
    this.render();
  }

  updatePartProperty(partIndex, property, value) {
    this.currentCar.parts[partIndex][property] = value;
    this.render();  // Live preview
  }

  exportJSON() {
    return JSON.stringify(this.currentCar, null, 2);
  }
}
```

**Integration points:**
- Reuse `GraphicsManager.drawCar()` for preview
- Share same JSON schema
- Export button copies to clipboard or downloads JSON

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main game page, canvas setup |
| `js/constants.js` | Game constants (gamepad limits, debug flags) |
| `js/input.js` | Unified input handling (keyboard/gamepad/touch) |
| `js/graphics.js` | Asset loading, rendering cars/terrain/objects |
| `js/game.js` | Main loop, physics, terrain detection, tire tracks |
| `assets/cars.json` | Car sprite definitions |
| `assets/terrain.json` | Terrain tiles and scenery objects |
| `assets/config.json` | Physics settings, input config |

## Development Workflow

1. **Tweak constants** → Edit `js/constants.js`
2. **Change physics** → Edit `assets/config.json`
3. **Add new car** → Add entry to `assets/cars.json`
4. **Modify terrain** → Edit procedural logic in `drawTerrainGrid()`
5. **Test locally** → `python -m http.server 8000`
6. **Deploy** → Push to `gh-pages` branch
