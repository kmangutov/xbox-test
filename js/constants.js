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

    // Axis mapping (can be changed with number keys 0-5)
    steeringAxis: 0,  // Which axis to use for steering (default: 0)
    accelerationAxis: 1,  // Which axis to use for acceleration (default: 1)

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
      colorVariations: ['#4ecca3', '#45b88f', '#3ea67c'],

      // Road edge overgrowth
      overgrowth: {
        enabled: true,
        density: 0.3,      // Probability per road edge tile
        maxSize: 12,       // Max size of overgrowth patches
        offset: 15         // How far from edge they can appear
      }
    },

    // Mud overlay (only appears on grass, not roads)
    mud: {
      enabled: true,
      density: 0.04,          // Much more rare (4% chance per grass tile)
      circleRadius: 35,       // Smaller circles for concentrated patches
      circleCount: 2,         // Fewer circles per tile (more sparse)
      baseColor: '#6d5635',   // Darker, muddier brown
      darkColor: '#534429',   // Even darker variation
      alpha: 0.6,             // Less transparent, more visible
      speedMultiplier: 0.4    // Mud slows you down more than grass (0.4 vs 0.7)
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
