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
      this.setupGamepadActivation();
      this.setupWheelInterfaceCallbacks();
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

      // Number keys 0-9 - Change steering axis
      if (e.key >= '0' && e.key <= '9') {
        const axisNum = parseInt(e.key);
        GameConstants.gamepad.steeringAxis = axisNum;
        console.log(`Steering axis changed to: ${axisNum}`);
      }

      // Shift + Number keys - Change acceleration axis
      if (e.shiftKey && e.key >= '0' && e.key <= '9') {
        const axisNum = parseInt(e.key);
        GameConstants.gamepad.accelerationAxis = axisNum;
        console.log(`Acceleration axis changed to: ${axisNum}`);
      }

      // G - Toggle gamepad debug info
      if (e.key === 'g' || e.key === 'G') {
        GameConstants.debug.showGamepadValues = !GameConstants.debug.showGamepadValues;
        console.log('Gamepad debug:', GameConstants.debug.showGamepadValues ? 'ON' : 'OFF');
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

  setupGamepadActivation() {
    // Gamepad API requires user gesture to surface gamepads in some browsers
    // This ensures polling starts after any click or keypress
    const activateGamepad = () => {
      console.log('User gesture detected - gamepad polling active');
    };

    window.addEventListener('click', activateGamepad, { once: true });
    window.addEventListener('keydown', activateGamepad, { once: true });
  }

  setupWheelInterfaceCallbacks() {
    // Register callbacks for wheel interface events
    const wheelInterface = this.inputManager.wheelInterface;

    // Acceleration pedal changes
    wheelInterface.on('onAccelerationChange', (value) => {
      // This is already being used in the input state, but can add effects here
      // e.g., engine sound volume, particle effects, etc.
    });

    // Brake pedal changes
    wheelInterface.on('onBrakeChange', (value) => {
      // e.g., brake light effects, brake sound, etc.
    });

    // Engine start/stop
    wheelInterface.on('onEngineStart', () => {
      console.log('🏎️ Car engine started - gameplay enabled');
      // Could prevent movement until engine starts
    });

    wheelInterface.on('onEngineStop', () => {
      console.log('🏎️ Car engine stopped');
    });

    // Traction control toggle
    wheelInterface.on('onTractionControlToggle', (enabled) => {
      console.log(`Traction control: ${enabled ? 'ON' : 'OFF'}`);
      GameConstants.physics.tractionControl = enabled;
    });

    // Generic button press handler
    wheelInterface.on('onButtonPress', (buttonIndex, buttonName, value) => {
      // Could add visual feedback for any button press
    });
  }

  getCurrentTerrain() {
    const tileSize = 100;
    const carWorldX = this.scrollX + this.canvas.width / 2;
    const carWorldY = this.scrollY + this.canvas.height / 2;
    const tileX = Math.floor(carWorldX / tileSize);
    const tileY = Math.floor(carWorldY / tileSize);

    // Check terrain type (only road or grass)
    if (Math.abs(tileY % 8) <= 1 || Math.abs(tileX % 10) <= 1) {
      return this.graphicsManager.assets.terrain['road'];
    }

    // Check if on grass with mud
    const mudSeed = tileX * 19349663 ^ tileY * 83492791;
    const mudRand = (mudSeed % 1000) / 1000;

    if (GameConstants.terrain.mud.enabled && mudRand < GameConstants.terrain.mud.density) {
      // Check if car is actually within a mud circle
      const cfg = GameConstants.terrain.mud;
      const tileScreenX = tileX * tileSize;
      const tileScreenY = tileY * tileSize;

      for (let i = 0; i < cfg.circleCount; i++) {
        const offsetX = ((mudSeed * (i + 1) * 7919) % (tileSize * 0.6)) - tileSize * 0.3;
        const offsetY = ((mudSeed * (i + 1) * 8831) % (tileSize * 0.6)) - tileSize * 0.3;

        const mudCenterX = tileScreenX + tileSize / 2 + offsetX;
        const mudCenterY = tileScreenY + tileSize / 2 + offsetY;

        const dx = carWorldX - mudCenterX;
        const dy = carWorldY - mudCenterY;
        const distSq = dx * dx + dy * dy;

        if (distSq < cfg.circleRadius * cfg.circleRadius) {
          // Car is in a mud puddle - return modified grass terrain
          return {
            ...this.graphicsManager.assets.terrain['grass'],
            name: 'Mud',
            speedMultiplier: cfg.speedMultiplier,
            isMud: true
          };
        }
      }
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

    // Update wheel interface with current speed (for auto-parking logic)
    this.inputManager.wheelInterface.updateVehicleSpeed(this.car.speed);

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

        const isMud = terrain.isMud || false;

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
          maxAge: isMud ? 300 : 180, // Mud tracks last longer (5 sec vs 3 sec)
          isMud: isMud
        });

        this.tireTracks.push({
          x: rightX,
          y: rightY,
          rotation: this.car.rotation,
          age: 0,
          maxAge: isMud ? 300 : 180,
          isMud: isMud
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

    // Draw gear display (bottom right)
    this.drawGearDisplay();

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

      // Draw tire mark - mud tracks are darker and more visible
      if (track.isMud) {
        // Muddy tracks: darker brown, more opaque, wider
        this.ctx.fillStyle = `rgba(75, 60, 45, ${opacity * 0.7})`;
        this.ctx.fillRect(-3, -7, 6, 14);
      } else {
        // Regular grass tracks: subtle dark marks
        this.ctx.fillStyle = `rgba(50, 40, 30, ${opacity * 0.4})`;
        this.ctx.fillRect(-2, -6, 4, 12);
      }

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

        // Determine tile type (only road or grass)
        const isHorizontalRoad = Math.abs(tileY % 8) <= 1;
        const isVerticalRoad = Math.abs(tileX % 10) <= 1;

        let tileType = 'grass';
        if (isHorizontalRoad || isVerticalRoad) tileType = 'road';

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

  drawGearDisplay() {
    const ctx = this.ctx;
    const wheelState = this.inputManager.wheelInterface.getState();
    const gear = wheelState.displayedGear;

    // Position: bottom right corner with padding
    const padding = 20;
    const x = this.canvas.width - padding;
    const y = this.canvas.height - padding;

    // Draw gear display box
    const boxWidth = 80;
    const boxHeight = 100;
    const boxX = x - boxWidth;
    const boxY = y - boxHeight;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Border
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Gear label
    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GEAR', boxX + boxWidth / 2, boxY + 20);

    // Gear number - large and prominent
    ctx.font = 'bold 48px monospace';
    ctx.fillText(gear.toString(), boxX + boxWidth / 2, boxY + 70);
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

      // Always show gamepad status for debugging
      debugText += `
--- GAMEPAD ---`;

      if (this.inputManager && this.inputManager.gamepad) {
        const gp = this.inputManager.gamepad;
        debugText += `
Connected: ${gp.connected ? 'YES' : 'NO'}`;

        if (gp.connected && gp.axes && gp.axes.length > 0) {
          debugText += `
ID: ${gp.id || 'Unknown'}`;
          gp.axes.forEach((value, index) => {
            const marker = index === GameConstants.gamepad.steeringAxis ? ' [STEER]' :
                          index === GameConstants.gamepad.accelerationAxis ? ' [ACCEL]' : '';
            debugText += `
A${index}: ${value.toFixed(3)}${marker}`;
          });
          debugText += `
Keys: 0-9=Steer, Shift+0-9=Accel`;
        } else if (gp.connected) {
          debugText += `
Axes: ${gp.axes ? gp.axes.length : 'undefined'}`;
        }
      } else {
        debugText += `
InputManager: ${this.inputManager ? 'OK' : 'MISSING'}`;
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
