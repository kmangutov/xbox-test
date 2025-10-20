/**
 * Main Game Loop: Coordinates input, physics, and rendering
 */

class Game {
  constructor(canvasId, configPath = 'assets/config.json') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.configPath = configPath;
    this.config = null;

    // Game entities
    this.car = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rotation: 0,
      speed: 0,
      carType: 'sedan',
    };

    // Systems
    this.inputManager = null;
    this.graphicsManager = null;

    // Game state
    this.scrollX = 0;
    this.scrollY = 0;
    this.running = false;
    this.tireTracks = []; // Array of tire track positions
    this.trackInterval = 0;
    this.debug = {
      steering: 0,
      acceleration: 0,
      brake: 0,
      speed: 0,
    };

    this.init();
  }

  async init() {
    try {
      // Load configuration
      this.config = await fetch(this.configPath).then(r => r.json());

      // Set canvas size
      this.canvas.width = this.config.game.width;
      this.canvas.height = this.config.game.height;

      // Initialize systems
      this.inputManager = new InputManager(this.config);
      this.graphicsManager = new GraphicsManager();
      await this.graphicsManager.loadAssets();

      // Set car starting position (center of screen)
      this.car.x = this.canvas.width / 2;
      this.car.y = this.canvas.height / 2;
      this.car.carType = this.config.game.defaultCar;

      console.log('Game initialized');
      this.setupDebugKeys();
      this.start();
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }

  setupDebugKeys() {
    window.addEventListener('keydown', (e) => {
      // M - Toggle road markings
      if (e.key === 'm' || e.key === 'M') {
        GameConstants.roadMarkings.enabled = !GameConstants.roadMarkings.enabled;
        console.log('Road markings:', GameConstants.roadMarkings.enabled ? 'ON' : 'OFF');
      }

      // T - Toggle terrain debug mode
      if (e.key === 't' || e.key === 'T') {
        GameConstants.debug.terrainDebugMode = !GameConstants.debug.terrainDebugMode;
        console.log('Terrain debug mode:', GameConstants.debug.terrainDebugMode ? 'ON' : 'OFF');
      }
    });
  }

  start() {
    this.running = true;
    this.gameLoop();
  }

  gameLoop = () => {
    if (!this.running) return;

    this.update();
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  getCurrentTerrain() {
    const tileSize = 100;
    const tileX = Math.floor((this.scrollX + this.canvas.width / 2) / tileSize);
    const tileY = Math.floor((this.scrollY + this.canvas.height / 2) / tileSize);

    // Check terrain type (same logic as drawTerrainGrid)
    if (Math.abs(tileY % 8) <= 1 || Math.abs(tileX % 10) <= 1) {
      return this.graphicsManager.assets.terrain['road'];
    }

    const diag1 = (tileX + tileY) % 15;
    const diag2 = (tileX - tileY) % 12;
    if (diag1 >= 7 && diag1 <= 8 || Math.abs(diag2) <= 1) {
      return this.graphicsManager.assets.terrain['mud'];
    }

    return this.graphicsManager.assets.terrain['grass'];
  }

  update() {
    // Update input state
    this.inputManager.update();
    const input = this.inputManager.getState();

    const physics = this.config.physics;
    const terrain = this.getCurrentTerrain();
    const terrainMultiplier = terrain ? terrain.speedMultiplier : 1.0;

    // Update steering (rotation) - terrain affects steering too
    this.car.rotation += input.steering * physics.turnSpeed * terrainMultiplier;

    // Update speed based on acceleration/brake
    if (input.acceleration > 0) {
      this.car.speed = Math.min(physics.maxSpeed * terrainMultiplier, this.car.speed + physics.acceleration * terrainMultiplier);
    } else if (input.brake > 0) {
      this.car.speed = Math.max(0, this.car.speed - physics.maxSpeed);
    } else {
      // Terrain-based friction (grass and mud slow you down more)
      const terrainFriction = physics.friction * (2 - terrainMultiplier);
      this.car.speed = Math.max(0, this.car.speed - terrainFriction);
    }

    // Calculate velocity based on rotation
    this.car.vx = Math.sin(this.car.rotation) * this.car.speed;
    this.car.vy = -Math.cos(this.car.rotation) * this.car.speed;

    // Update position (car stays at center, background scrolls)
    // In prototype feel, the car is stationary and background moves
    this.scrollX += this.car.vx * 2;
    this.scrollY += this.car.vy * 2;

    // Add tire tracks on grass/mud if moving
    if (this.car.speed > 0.5 && terrain && terrain.id !== 'road') {
      this.trackInterval++;
      if (this.trackInterval >= 3) {
        this.trackInterval = 0;

        // Add tire tracks for left and right wheels
        const wheelOffset = 8; // Distance from center to wheels
        const leftX = this.scrollX + this.canvas.width / 2 - wheelOffset * Math.cos(this.car.rotation);
        const leftY = this.scrollY + this.canvas.height / 2 - wheelOffset * Math.sin(this.car.rotation);
        const rightX = this.scrollX + this.canvas.width / 2 + wheelOffset * Math.cos(this.car.rotation);
        const rightY = this.scrollY + this.canvas.height / 2 + wheelOffset * Math.sin(this.car.rotation);

        this.tireTracks.push({
          x: leftX,
          y: leftY,
          rotation: this.car.rotation,
          age: 0,
          maxAge: 180 // Frames until track disappears (3 seconds at 60fps)
        });

        this.tireTracks.push({
          x: rightX,
          y: rightY,
          rotation: this.car.rotation,
          age: 0,
          maxAge: 180
        });
      }
    }

    // Age and remove old tire tracks
    this.tireTracks = this.tireTracks.filter(track => {
      track.age++;
      return track.age < track.maxAge;
    });

    // Limit tire tracks to prevent memory issues
    if (this.tireTracks.length > 500) {
      this.tireTracks = this.tireTracks.slice(-500);
    }

    // Update debug info
    this.debug.steering = input.steering.toFixed(2);
    this.debug.acceleration = input.acceleration.toFixed(2);
    this.debug.brake = input.brake.toFixed(2);
    this.debug.speed = this.car.speed.toFixed(2);
    this.debug.terrain = terrain ? terrain.name : 'Unknown';
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#87ceeb';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw terrain grid (moving background)
    this.graphicsManager.drawTerrainGrid(this.ctx, this.canvas.width, this.canvas.height, this.scrollX, this.scrollY);

    // Draw tire tracks
    this.drawTireTracks();

    // Draw some trees/rocks for visual interest
    this.drawSceneObjects();

    // Draw car at center (stationary perspective)
    this.graphicsManager.drawCar(
      this.ctx,
      this.car.carType,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.car.rotation
    );

    // Draw terrain debug overlay if enabled
    if (GameConstants.debug.terrainDebugMode) {
      this.drawTerrainDebugOverlay();
    }

    // Draw debug info
    this.drawDebugInfo();
  }

  isOnRoad(worldX, worldY) {
    const tileSize = 100;
    const tileX = Math.floor(worldX / tileSize);
    const tileY = Math.floor(worldY / tileSize);

    // Check if on horizontal road
    if (Math.abs(tileY % 8) <= 1) {
      return true;
    }

    // Check if on vertical road
    if (Math.abs(tileX % 10) <= 1) {
      return true;
    }

    return false;
  }

  drawTireTracks() {
    this.ctx.save();

    for (const track of this.tireTracks) {
      const screenX = track.x - this.scrollX;
      const screenY = track.y - this.scrollY;

      // Only draw if visible on screen
      if (screenX < -20 || screenX > this.canvas.width + 20 ||
          screenY < -20 || screenY > this.canvas.height + 20) {
        continue;
      }

      // Calculate opacity based on age (fade out)
      const opacity = 1 - (track.age / track.maxAge);

      this.ctx.save();
      this.ctx.translate(screenX, screenY);
      this.ctx.rotate(track.rotation);

      // Draw a small dark tire mark
      this.ctx.fillStyle = `rgba(50, 40, 30, ${opacity * 0.4})`;
      this.ctx.fillRect(-2, -6, 4, 12);

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  drawSceneObjects() {
    // Draw trees and rocks in clumps with 2D scrolling
    const clumpSize = 400;
    const objectSpacing = 60;

    const startX = Math.floor(this.scrollX / clumpSize) * clumpSize;
    const startY = Math.floor(this.scrollY / clumpSize) * clumpSize;

    // Draw clumps (only off-road)
    for (let cy = startY - clumpSize; cy < this.scrollY + this.canvas.height + clumpSize; cy += clumpSize) {
      for (let cx = startX - clumpSize; cx < this.scrollX + this.canvas.width + clumpSize; cx += clumpSize) {
        // Skip if clump center is on a road
        if (this.isOnRoad(cx, cy)) continue;

        const clumpHash = Math.floor(cx / clumpSize) + Math.floor(cy / clumpSize) * 173;
        const rand = (clumpHash * 9973) % 100;

        // 25% chance of a clump (reduced from 40%)
        if (rand < 25) {
          const clumpType = rand % 2 === 0 ? 'tree' : 'rock';
          const numObjects = 3 + (rand % 4); // 3-6 objects

          // Draw objects in this clump
          for (let i = 0; i < numObjects; i++) {
            const objHash = clumpHash * 100 + i;
            const offsetX = ((objHash * 7919) % 120) - 60;
            const offsetY = ((objHash * 8831) % 120) - 60;

            const worldX = cx + offsetX;
            const worldY = cy + offsetY;

            // Don't place objects on roads
            if (this.isOnRoad(worldX, worldY)) continue;

            const screenX = worldX - this.scrollX;
            const screenY = worldY - this.scrollY;

            if (screenX > -50 && screenX < this.canvas.width + 50 &&
                screenY > -50 && screenY < this.canvas.height + 50) {
              this.graphicsManager.drawObject(this.ctx, clumpType, screenX, screenY);
            }
          }
        }
      }
    }

    // Also add scattered flowers (only off-road)
    for (let y = startY; y < this.scrollY + this.canvas.height + 200; y += objectSpacing * 2) {
      for (let x = startX; x < this.scrollX + this.canvas.width + 200; x += objectSpacing * 2) {
        if (this.isOnRoad(x, y)) continue;

        const hash = Math.floor(x / objectSpacing) + Math.floor(y / objectSpacing) * 100;
        if ((hash * 9973) % 100 < 8) { // Reduced from 15%
          const screenX = x - this.scrollX;
          const screenY = y - this.scrollY;

          if (screenX > -20 && screenX < this.canvas.width + 20 &&
              screenY > -20 && screenY < this.canvas.height + 20) {
            this.graphicsManager.drawObject(this.ctx, 'flower', screenX, screenY);
          }
        }
      }
    }
  }

  drawTerrainDebugOverlay() {
    const tileSize = 100;
    const startX = Math.floor(this.scrollX / tileSize) * tileSize;
    const startY = Math.floor(this.scrollY / tileSize) * tileSize;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '10px monospace';
    this.ctx.lineWidth = 1;

    // Draw grid lines and tile info
    for (let y = startY; y < this.scrollY + this.canvas.height + tileSize; y += tileSize) {
      for (let x = startX; x < this.scrollX + this.canvas.width + tileSize; x += tileSize) {
        const screenX = x - this.scrollX;
        const screenY = y - this.scrollY;

        // Skip if off-screen
        if (screenX > this.canvas.width || screenY > this.canvas.height) continue;

        const tileX = Math.floor(x / tileSize);
        const tileY = Math.floor(y / tileSize);

        // Draw tile boundary
        this.ctx.strokeRect(screenX, screenY, tileSize, tileSize);

        // Determine tile type
        const isHorizontalRoad = Math.abs(tileY % 8) <= 1;
        const isVerticalRoad = Math.abs(tileX % 10) <= 1;
        const diag1 = (tileX + tileY) % 15;
        const diag2 = (tileX - tileY) % 12;
        const isMud = (diag1 >= 7 && diag1 <= 8) || Math.abs(diag2) <= 1;

        let tileType = 'grass';
        if (isHorizontalRoad || isVerticalRoad) tileType = 'road';
        if (isMud) tileType = 'mud';

        // Draw tile info
        const terrain = this.graphicsManager.assets.terrain[tileType];
        const speedMult = terrain ? terrain.speedMultiplier : 1.0;

        this.ctx.fillText(`${tileX},${tileY}`, screenX + 5, screenY + 15);
        this.ctx.fillText(tileType, screenX + 5, screenY + 28);
        this.ctx.fillText(`×${speedMult}`, screenX + 5, screenY + 41);
      }
    }

    // Draw car position marker
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 30, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawDebugInfo() {
    const debugEl = document.getElementById('debug');
    if (debugEl) {
      const input = this.inputManager.getState();
      let debugText = `
Steering: ${this.debug.steering}
Accel: ${this.debug.acceleration}
Brake: ${this.debug.brake}
Speed: ${this.debug.speed}
Terrain: ${this.debug.terrain}
Rotation: ${(this.car.rotation * 180 / Math.PI).toFixed(0)}°
Position: (${Math.floor(this.scrollX)}, ${Math.floor(this.scrollY)})
Car: ${this.car.carType}`;

      // Show raw gamepad values if enabled in constants
      if (GameConstants.debug.showGamepadValues && input.rawGamepadLX !== undefined) {
        debugText += `
--- GAMEPAD RAW ---
LX: ${input.rawGamepadLX.toFixed(3)}
LY: ${input.rawGamepadLY.toFixed(3)}`;
      }

      // Show debug key hints
      if (GameConstants.debug.terrainDebugMode || GameConstants.roadMarkings.enabled) {
        debugText += `
--- DEBUG KEYS ---
M: Markings ${GameConstants.roadMarkings.enabled ? 'ON' : 'OFF'}
T: Terrain ${GameConstants.debug.terrainDebugMode ? 'ON' : 'OFF'}`;
      }

      debugEl.textContent = debugText.trim();
    }
  }
}

// Start game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Game('gameCanvas');
  });
} else {
  new Game('gameCanvas');
}
