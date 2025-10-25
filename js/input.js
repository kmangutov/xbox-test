/**
 * Input System: Handles keyboard, gamepad, and touch inputs
 */

class InputManager {
  constructor(config) {
    this.config = config;
    this.state = {
      steering: 0,      // -1 to 1 (left to right)
      acceleration: 0,  // 0 to 1
      brake: 0,         // 0 to 1
    };

    this.keyboard = {
      left: false,
      right: false,
      accelerate: false,
      brake: false,
    };

    this.gamepad = {
      connected: false,
      axes: [0, 0, 0, 0],
    };

    this.touch = {
      steeringLeft: false,
      steeringRight: false,
      accelerating: false,
    };

    this.setupKeyboardListeners();
    this.setupGamepadListeners();
    this.setupTouchListeners();
    this.showTouchControlsIfNeeded();
  }

  setupKeyboardListeners() {
    if (!this.config.input.keyboard.enabled) return;

    const keyMap = this.config.input.keyboard.keys;

    window.addEventListener('keydown', (e) => {
      if (keyMap.left.includes(e.key)) this.keyboard.left = true;
      if (keyMap.right.includes(e.key)) this.keyboard.right = true;
      if (keyMap.accelerate.includes(e.key)) this.keyboard.accelerate = true;
      if (keyMap.brake.includes(e.key)) this.keyboard.brake = true;
    });

    window.addEventListener('keyup', (e) => {
      if (keyMap.left.includes(e.key)) this.keyboard.left = false;
      if (keyMap.right.includes(e.key)) this.keyboard.right = false;
      if (keyMap.accelerate.includes(e.key)) this.keyboard.accelerate = false;
      if (keyMap.brake.includes(e.key)) this.keyboard.brake = false;
    });
  }

  setupGamepadListeners() {
    if (!this.config.input.gamepad.enabled) return;

    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepad.connected = true;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      this.gamepad.connected = false;
    });
  }

  setupTouchListeners() {
    if (!this.config.input.touch.enabled) return;

    const steerLeft = document.getElementById('steerLeft');
    const steerRight = document.getElementById('steerRight');
    const accelerate = document.getElementById('accelerate');

    if (steerLeft) {
      steerLeft.addEventListener('touchstart', () => this.touch.steeringLeft = true);
      steerLeft.addEventListener('touchend', () => this.touch.steeringLeft = false);
    }

    if (steerRight) {
      steerRight.addEventListener('touchstart', () => this.touch.steeringRight = true);
      steerRight.addEventListener('touchend', () => this.touch.steeringRight = false);
    }

    if (accelerate) {
      accelerate.addEventListener('touchstart', () => this.touch.accelerating = true);
      accelerate.addEventListener('touchend', () => this.touch.accelerating = false);
    }
  }

  showTouchControlsIfNeeded() {
    const overlay = document.getElementById('touchOverlay');
    if (!overlay) return;

    // Show touch controls on mobile devices
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && this.config.input.touch.showOnMobile) {
      overlay.classList.add('show');
    }
  }

  pollGamepad() {
    if (!this.config.input.gamepad.enabled) return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = Array.from(gamepads).find(g => g && g.connected);

    if (gamepad) {
      if (!this.gamepad.connected) {
        // First connection - log all gamepad info
        console.log('=== GAMEPAD CONNECTED ===');
        console.log('ID:', gamepad.id);
        console.log('Mapping:', gamepad.mapping);
        console.log('Axes count:', gamepad.axes.length);
        console.log('Buttons count:', gamepad.buttons.length);
        console.log('========================');
      }

      this.gamepad.connected = true;
      this.gamepad.axes = gamepad.axes.slice(); // Store all axes
      this.gamepad.buttons = gamepad.buttons.slice(); // Store all buttons
      this.gamepad.id = gamepad.id;
    } else {
      // Not finding gamepad - debug why
      if (this.gamepad.connected) {
        console.log('Gamepad disconnected');
      }
      this.gamepad.connected = false;

      // Log what we're seeing every 60 frames (~1 second)
      if (!this._debugFrameCount) this._debugFrameCount = 0;
      this._debugFrameCount++;
      if (this._debugFrameCount % 60 === 0) {
        const allGamepads = Array.from(gamepads);
        console.log('Gamepad poll debug:', {
          apiAvailable: !!navigator.getGamepads,
          gamepadsCount: allGamepads.length,
          gamepadsFound: allGamepads.map((g, i) => g ? `[${i}]: ${g.id} (connected: ${g.connected})` : `[${i}]: null`)
        });
      }
    }
  }

  update() {
    this.pollGamepad();

    // Reset state
    this.state.steering = 0;
    this.state.acceleration = 0;
    this.state.brake = 0;

    // Store raw gamepad values for debug
    this.state.rawGamepadLX = 0;
    this.state.rawGamepadLY = 0;

    // Keyboard input
    if (this.keyboard.left) this.state.steering -= 1;
    if (this.keyboard.right) this.state.steering += 1;
    if (this.keyboard.accelerate) this.state.acceleration = 1;
    if (this.keyboard.brake) this.state.brake = 1;

    // Gamepad input (configurable axes)
    if (this.gamepad.connected) {
      const steeringAxis = GameConstants.gamepad.steeringAxis;
      const accelAxis = GameConstants.gamepad.accelerationAxis;

      const rawLX = this.gamepad.axes[steeringAxis] || 0;
      const rawLY = this.gamepad.axes[accelAxis] || 0;

      // Store raw values for debugging
      this.state.rawGamepadLX = rawLX;
      this.state.rawGamepadLY = rawLY;
      this.state.steeringAxisUsed = steeringAxis;
      this.state.accelAxisUsed = accelAxis;

      // Apply deadzone
      const dz = GameConstants.gamepad.deadzone;
      const lx = Math.abs(rawLX) > dz ? rawLX : 0;
      const ly = Math.abs(rawLY) > dz ? rawLY : 0;

      // Map steering from hardcoded min/max to -1 to 1 range
      let steering = 0;
      if (lx < 0) {
        // Left: map -0.15 to -1
        steering = lx / Math.abs(GameConstants.gamepad.steeringMin);
      } else if (lx > 0) {
        // Right: map 0.25 to 1
        steering = lx / GameConstants.gamepad.steeringMax;
      }
      // Clamp to -1 to 1
      steering = Math.max(-1, Math.min(1, steering));

      this.state.steering += steering;

      // TODO: TEMPORARY - Auto-accelerate when steering (remove when pedal controls ready)
      if (GameConstants.gamepad.autoAccelerateOnSteering && Math.abs(steering) > 0.1) {
        this.state.acceleration = Math.max(this.state.acceleration, GameConstants.gamepad.autoAccelerateAmount);
      }

      // Normal acceleration/brake from Y-axis
      if (ly > 0) {
        this.state.acceleration = Math.min(1, this.state.acceleration + Math.abs(ly));
      }
      if (ly < 0) {
        this.state.brake = Math.min(1, this.state.brake + Math.abs(ly));
      }
    }

    // Touch input
    if (this.touch.steeringLeft) this.state.steering -= 1;
    if (this.touch.steeringRight) this.state.steering += 1;
    if (this.touch.accelerating) this.state.acceleration = 1;

    // Clamp values to [-1, 1]
    this.state.steering = Math.max(-1, Math.min(1, this.state.steering));
    this.state.acceleration = Math.max(0, Math.min(1, this.state.acceleration));
    this.state.brake = Math.max(0, Math.min(1, this.state.brake));
  }

  getState() {
    return { ...this.state };
  }
}
