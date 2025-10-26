/**
 * Xbox Wheel Interface: Maps physical wheel controller to game car controls
 *
 * Physical Layout:
 * - Buttons 0-3: A, B, X, Y (right side)
 * - Buttons 4-5: Left/Right Paddles
 * - Buttons 6-7: Pedals (left=brake, right=gas)
 * - Buttons 8-9: Display/Settings buttons
 * - Buttons 12-15: Engine start
 * - Buttons 8-9: Traction control switch
 */

class XboxWheelInterface {
  constructor() {
    // Button mapping from physical controller to wheel functions
    this.buttonMap = {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LEFT_PADDLE',      // Left paddle
      5: 'RIGHT_PADDLE',     // Right paddle
      6: 'BRAKE_PEDAL',      // Brake pedal (analog value)
      7: 'GAS_PEDAL',        // Gas/accelerator pedal (analog value)
      8: 'DISPLAY_BUTTON',   // Small display button
      9: 'SETTINGS_BUTTON',  // Small settings button
      12: 'ENGINE_START_1',
      13: 'ENGINE_START_2',
      14: 'ENGINE_START_3',
      15: 'ENGINE_START_4',
    };

    // Track control state
    this.state = {
      steering: 0,           // -1 to 1 (left to right)
      acceleration: 0,       // 0 to 1 (from gas pedal)
      brake: 0,              // 0 to 1 (from brake pedal)
      gear: 0,               // -1 (Reverse), 0 (Park), 1-3 (gears)
      engineRunning: false,
      tractionControl: true,
      currentSpeed: 0,       // Track vehicle speed for auto-park
    };

    // Gear timers for duration-based acceleration
    this.gearTimers = {
      1: 500,   // Gear 1: 500ms burst
      2: 1000,  // Gear 2: 1000ms burst
      3: 1500,  // Gear 3: 1500ms burst
    };
    this.currentGearTimer = null;

    // Callbacks for game state changes
    this.callbacks = {
      onSteeringChange: null,
      onAccelerationChange: null,
      onBrakeChange: null,
      onGearChange: null,
      onEngineStart: null,
      onEngineStop: null,
      onTractionControlToggle: null,
      onButtonPress: null,
    };

    // Button press tracking for single-press actions
    this.previousButtonState = {};
  }

  /**
   * Process gamepad input and update car control state
   * Called from InputManager.pollGamepad()
   */
  processGamepadInput(gamepad) {
    if (!gamepad || !gamepad.buttons) return;

    // Process analog pedals (buttons 6 & 7 have analog values)
    this.updateBrakePedal(gamepad.buttons[6]);
    this.updateGasPedal(gamepad.buttons[7]);

    // Update gear timer (applies acceleration based on current gear)
    this.updateGearTimer();

    // Auto-reset to Park if speed drops to 0
    this.updateAutoParking();

    // Process digital buttons (detect press vs hold)
    this.processButtonPresses(gamepad);

    // Process steering from axes (still handled by InputManager)
    // This interface focuses on button-based controls
  }

  /**
   * Update gear timer - applies acceleration timed to current gear
   */
  updateGearTimer() {
    if (!this.currentGearTimer) return;

    const elapsed = Date.now() - this.currentGearTimer.startTime;
    const duration = this.gearTimers[this.currentGearTimer.gear] || 0;

    if (elapsed < duration) {
      // Still in gear - apply full acceleration
      this.state.acceleration = 1.0;
    } else {
      // Timer expired - stop acceleration and reset gear to Park
      this.state.acceleration = 0;
      this.currentGearTimer = null;
      this.setGear(0); // Back to Park
    }
  }

  /**
   * Auto-reset to Park when vehicle speed drops below threshold
   */
  updateAutoParking() {
    // If in a gear (not Park/Reverse) and speed is near 0, auto-park
    if (this.state.gear > 0 && this.state.currentSpeed < 0.5) {
      this.setGear(0); // Auto-park
    }
  }

  /**
   * Set the current gear and start timer if applicable
   */
  setGear(gear) {
    if (gear === this.state.gear) return; // No change

    const gearNames = {
      '-1': 'Reverse',
      '0': 'Park',
      '1': 'Gear 1',
      '2': 'Gear 2',
      '3': 'Gear 3',
    };

    this.state.gear = gear;
    console.log(`⚙️ ${gearNames[gear]}`);

    // Start gear timer for gears 1-3
    if (gear >= 1 && gear <= 3) {
      this.currentGearTimer = {
        gear: gear,
        startTime: Date.now(),
      };
    } else {
      this.currentGearTimer = null;
      this.state.acceleration = 0;
    }

    if (this.callbacks.onGearChange) {
      this.callbacks.onGearChange(gear, gearNames[gear]);
    }
  }

  /**
   * Update vehicle speed from game (called by game loop)
   */
  updateVehicleSpeed(speed) {
    this.state.currentSpeed = speed;
  }

  /**
   * Update brake state from left pedal (button 6)
   */
  updateBrakePedal(button) {
    if (!button) return;

    const newBrake = button.value || 0;
    if (newBrake !== this.state.brake) {
      this.state.brake = newBrake;
      if (this.callbacks.onBrakeChange) {
        this.callbacks.onBrakeChange(newBrake);
      }
    }
  }

  /**
   * Update acceleration state from right pedal (button 7)
   */
  updateGasPedal(button) {
    if (!button) return;

    const newAcceleration = button.value || 0;
    if (newAcceleration !== this.state.acceleration) {
      this.state.acceleration = newAcceleration;
      if (this.callbacks.onAccelerationChange) {
        this.callbacks.onAccelerationChange(newAcceleration);
      }
    }
  }

  /**
   * Detect button press events (single trigger per press)
   */
  processButtonPresses(gamepad) {
    gamepad.buttons.forEach((button, index) => {
      const wasPressed = this.previousButtonState[index] || false;
      const isPressed = button.pressed;

      // Detect press (transition from not pressed to pressed)
      if (isPressed && !wasPressed) {
        this.handleButtonPress(index, button);
      }

      // Detect release
      if (!isPressed && wasPressed) {
        this.handleButtonRelease(index);
      }

      // Store state for next frame
      this.previousButtonState[index] = isPressed;
    });
  }

  /**
   * Handle a button press event
   */
  handleButtonPress(buttonIndex, button) {
    const buttonName = this.buttonMap[buttonIndex] || `BUTTON_${buttonIndex}`;

    console.log(`🎮 ${buttonName} PRESSED (value: ${button.value.toFixed(2)})`);

    if (this.callbacks.onButtonPress) {
      this.callbacks.onButtonPress(buttonIndex, buttonName, button.value);
    }

    // Handle specific button actions
    switch (buttonName) {
      case 'LEFT_PADDLE':
        this.handleLeftPaddle();
        break;
      case 'RIGHT_PADDLE':
        this.handleRightPaddle();
        break;
      case 'A':
      case 'B':
      case 'X':
      case 'Y':
        this.handleColorButton(buttonName);
        break;
      case 'SETTINGS_BUTTON':
        this.toggleTractionControl();
        break;
      case 'DISPLAY_BUTTON':
        console.log('Display button pressed - could show lap times, speed, etc.');
        break;
      case 'ENGINE_START_1':
      case 'ENGINE_START_2':
      case 'ENGINE_START_3':
      case 'ENGINE_START_4':
        this.handleEngineStart();
        break;
    }
  }

  /**
   * Handle button release events
   */
  handleButtonRelease(buttonIndex) {
    const buttonName = this.buttonMap[buttonIndex] || `BUTTON_${buttonIndex}`;
    console.log(`🎮 ${buttonName} RELEASED`);
  }

  /**
   * Left paddle - shift down (or to Reverse from Park)
   */
  handleLeftPaddle() {
    if (this.state.gear === 0) {
      // Park -> Reverse
      this.setGear(-1);
    } else if (this.state.gear > 1) {
      // Down-shift
      this.setGear(this.state.gear - 1);
    } else if (this.state.gear === -1) {
      // Reverse -> Park
      this.setGear(0);
    }
  }

  /**
   * Right paddle - shift up (or to Gear 1 from Park)
   */
  handleRightPaddle() {
    if (this.state.gear <= 0) {
      // Park/Reverse -> Gear 1
      this.setGear(1);
    } else if (this.state.gear < 3) {
      // Up-shift
      this.setGear(this.state.gear + 1);
    } else if (this.state.gear === 3) {
      // Gear 3 -> Park
      this.setGear(0);
    }
  }

  /**
   * Color buttons (A, B, X, Y)
   */
  handleColorButton(buttonName) {
    console.log(`${buttonName} button pressed - could be horn, lights, etc.`);
    // TODO: Implement wheel-specific behavior
  }

  /**
   * Toggle traction control via button 9
   */
  toggleTractionControl() {
    this.state.tractionControl = !this.state.tractionControl;
    console.log(`Traction control: ${this.state.tractionControl ? 'ON' : 'OFF'}`);

    if (this.callbacks.onTractionControlToggle) {
      this.callbacks.onTractionControlToggle(this.state.tractionControl);
    }
  }

  /**
   * Engine start sequence (buttons 12-15)
   */
  handleEngineStart() {
    if (!this.state.engineRunning) {
      this.state.engineRunning = true;
      console.log('🏎️ Engine started!');

      if (this.callbacks.onEngineStart) {
        this.callbacks.onEngineStart();
      }
    } else {
      this.state.engineRunning = false;
      console.log('🏎️ Engine stopped!');

      if (this.callbacks.onEngineStop) {
        this.callbacks.onEngineStop();
      }
    }
  }

  /**
   * Register a callback for a specific event
   */
  on(event, callback) {
    if (event in this.callbacks) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Get current control state
   */
  getState() {
    return { ...this.state };
  }
}
