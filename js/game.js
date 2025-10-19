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
      this.start();
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
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

  update() {
    // Update input state
    this.inputManager.update();
    const input = this.inputManager.getState();

    const physics = this.config.physics;

    // Update steering (rotation)
    this.car.rotation += input.steering * physics.turnSpeed;

    // Update speed based on acceleration/brake
    if (input.acceleration > 0) {
      this.car.speed = Math.min(physics.maxSpeed, this.car.speed + physics.acceleration);
    } else if (input.brake > 0) {
      this.car.speed = Math.max(0, this.car.speed - physics.maxSpeed);
    } else {
      this.car.speed = Math.max(0, this.car.speed - physics.friction);
    }

    // Calculate velocity based on rotation
    this.car.vx = Math.sin(this.car.rotation) * this.car.speed;
    this.car.vy = -Math.cos(this.car.rotation) * this.car.speed;

    // Update position (car stays at center, background scrolls)
    // In prototype feel, the car is stationary and background moves
    this.scrollX += this.car.vx * 2;
    this.scrollY += this.car.vy * 2;

    // Update debug info
    this.debug.steering = input.steering.toFixed(2);
    this.debug.acceleration = input.acceleration.toFixed(2);
    this.debug.brake = input.brake.toFixed(2);
    this.debug.speed = this.car.speed.toFixed(2);
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#87ceeb';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw terrain grid (moving background)
    this.graphicsManager.drawTerrainGrid(this.ctx, this.canvas.width, this.canvas.height, this.scrollX, this.scrollY);

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

  drawDebugInfo() {
    const debugEl = document.getElementById('debug');
    if (debugEl) {
      debugEl.textContent = `
Steering: ${this.debug.steering}
Accel: ${this.debug.acceleration}
Brake: ${this.debug.brake}
Speed: ${this.debug.speed}
Rotation: ${(this.car.rotation * 180 / Math.PI).toFixed(0)}°
Position: (${Math.floor(this.scrollX)}, ${Math.floor(this.scrollY)})
Car: ${this.car.carType}
      `.trim();
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
