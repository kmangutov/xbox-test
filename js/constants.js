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
  // ROAD MARKINGS
  // ========================================
  roadMarkings: {
    enabled: true,  // Toggle with 'M' key

    // Center dashed line
    centerLine: {
      width: 4,
      dashLength: 30,
      gapLength: 20,
      color: '#ffffff'
    },

    // Edge shoulders
    shoulder: {
      width: 3,
      offset: 8,  // Distance from edge
      color: '#ffffff'
    }
  },

  // ========================================
  // TERRAIN VISUALS
  // ========================================
  terrain: {
    // Grass variation
    grass: {
      patchDensity: 0.15,  // Probability of a patch per area
      patchMinSize: 3,
      patchMaxSize: 8,
      colorVariations: ['#4ecca3', '#45b88f', '#3ea67c']
    },

    // Mud circles
    mud: {
      circleRadius: 50,
      overlap: 0.7,
      baseColor: '#8b6f47',
      darkColor: '#6d5635',
      alpha: 0.3
    }
  },

  // ========================================
  // DEBUG SETTINGS
  // ========================================
  debug: {
    showGamepadValues: true,  // Show raw gamepad values in debug panel
    terrainDebugMode: false,   // Toggle with 'T' key - shows tile info, boundaries
    showRoadMarkings: true     // Can be toggled independently
  }
};
