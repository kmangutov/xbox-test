/**
 * Game Constants
 *
 * Hardcoded game constants that are easier to tweak than config.json
 */

const GameConstants = {
  // ========================================
  // GAMEPAD SETTINGS
  // ========================================
  gamepad: {
    // Hardcoded steering wheel/stick limits
    // When turned all the way left: -0.15
    // When turned all the way right: 0.25
    steeringMin: -0.15,
    steeringMax: 0.25,
    deadzone: 0.05,

    // TODO: TEMPORARY - Remove when pedal controls are ready
    // When true, any steering input automatically applies acceleration
    // This allows driving with just the steering stick
    autoAccelerateOnSteering: true,
    autoAccelerateAmount: 1.0  // 0.0 to 1.0, how much to accelerate when steering
  },

  // ========================================
  // DEBUG SETTINGS
  // ========================================
  debug: {
    showGamepadValues: true  // Show raw gamepad values in debug panel
  }
};
