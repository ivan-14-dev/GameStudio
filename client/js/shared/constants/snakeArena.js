// Snake Arena — shared constants
export const ARENA = Object.freeze({
  // Game modes
  MODES: {
    SURVIVAL: 'SURVIVAL',
    SCORE: 'SCORE',
    RACE: 'RACE',
    HUNT: 'HUNT',
    TREASURE: 'TREASURE',
    DOMINATION: 'DOMINATION',
  },

  // Directions
  DIRECTIONS: {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
  },
  OPPOSITE: { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' },

  // Player colors
  COLORS: ['#4ade80', '#60a5fa', '#f472b6', '#facc15', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171'],

  // Map sizes by level tier
  MAP_SIZES: {
    SMALL: 50,
    MEDIUM: 100,
    LARGE: 150,
    HUGE: 200,
  },

  // Viewport (in cells)
  VIEWPORT: { width: 24, height: 16 },

  // Terrain types
  TERRAIN: {
    NORMAL: 'NORMAL',
    ICE: 'ICE',
    MUD: 'MUD',
    BOOST: 'BOOST',
    DANGER: 'DANGER',
    PORTAL_ZONE: 'PORTAL_ZONE',
    DARK_ZONE: 'DARK_ZONE',
  },

  // Obstacle types
  OBSTACLES: {
    WALL: 'WALL',
    BREAKABLE_WALL: 'BREAKABLE_WALL',
    MOVING_WALL: 'MOVING_WALL',
    DAMAGE_ZONE: 'DAMAGE_ZONE',
    SLOW_ZONE: 'SLOW_ZONE',
    SPEED_ZONE: 'SPEED_ZONE',
    COLLAPSING_BLOCK: 'COLLAPSING_BLOCK',
    ROTATING_OBSTACLE: 'ROTATING_OBSTACLE',
    GATE: 'GATE',
    TRAP: 'TRAP',
  },

  // Food types
  FOOD: {
    NORMAL: { id: 'NORMAL', points: 10, growth: 1, emoji: '🍎', rarity: 0.6 },
    RARE: { id: 'RARE', points: 25, growth: 2, emoji: '🍓', rarity: 0.2 },
    EPIC: { id: 'EPIC', points: 100, growth: 5, emoji: '💎', rarity: 0.08 },
    GOLD: { id: 'GOLD', points: 200, growth: 3, emoji: '🟡', rarity: 0.05 },
    POISON: { id: 'POISON', points: -20, growth: -2, emoji: '☠️', rarity: 0.05 },
    MYSTERY: { id: 'MYSTERY', points: 0, growth: 0, emoji: '❓', rarity: 0.02 },
  },

  // Power-up types
  POWERUPS: {
    SPEED_BOOST: { id: 'SPEED_BOOST', duration: 5000, emoji: '⚡', rarity: 0.15 },
    SHIELD: { id: 'SHIELD', duration: 8000, emoji: '🛡️', rarity: 0.1 },
    GHOST: { id: 'GHOST', duration: 6000, emoji: '👻', rarity: 0.08 },
    MAGNET: { id: 'MAGNET', duration: 7000, emoji: '🧲', rarity: 0.1 },
    FREEZE: { id: 'FREEZE', duration: 4000, emoji: '❄️', rarity: 0.08 },
    TELEPORT: { id: 'TELEPORT', duration: 0, emoji: '🌀', rarity: 0.05 },
    CUT: { id: 'CUT', duration: 3000, emoji: '✂️', rarity: 0.06 },
    DOUBLE_SCORE: { id: 'DOUBLE_SCORE', duration: 10000, emoji: '✨', rarity: 0.08 },
    REVERSE: { id: 'REVERSE', duration: 5000, emoji: '🔄', rarity: 0.05 },
  },

  // Dynamic events
  EVENTS: {
    FOOD_RUSH: 'FOOD_RUSH',
    BLACKOUT: 'BLACKOUT',
    STORM: 'STORM',
    EARTHQUAKE: 'EARTHQUAKE',
    PORTAL_SHIFT: 'PORTAL_SHIFT',
    HUNT: 'HUNT',
    GOLDEN_FOOD: 'GOLDEN_FOOD',
    COLLAPSE: 'COLLAPSE',
    SPEED_WAVE: 'SPEED_WAVE',
  },

  // Biomes
  BIOMES: {
    FOREST: 'FOREST',
    CAVE: 'CAVE',
    CITY: 'CITY',
    RUINS: 'RUINS',
    LABYRINTH: 'LABYRINTH',
    ICE: 'ICE',
    VOLCANO: 'VOLCANO',
    SPACE: 'SPACE',
    FUTURISTIC: 'FUTURISTIC',
  },

  // Combat modes
  COMBAT: {
    CLASSIC: 'CLASSIC',       // head vs body = death
    ADVANCED: 'ADVANCED',     // head vs head = smaller dies
    PEACEFUL: 'PEACEFUL',     // no player collision
  },

  // Game modifiers
  MODIFIERS: {
    FAST: 'FAST',
    LOW_VISION: 'LOW_VISION',
    NO_POWERUPS: 'NO_POWERUPS',
    DOUBLE_SCORE: 'DOUBLE_SCORE',
    SMALL_MAP: 'SMALL_MAP',
    BIG_MAP: 'BIG_MAP',
    CHAOS: 'CHAOS',
  },

  // Effect quality
  EFFECT_QUALITY: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
  },

  // Tick rates
  SIMULATION_TICK_MS: 50,    // 20 ticks/sec
  NETWORK_TICK_MS: 50,       // 20 updates/sec
  RENDER_FPS: 60,

  // Camera
  CAMERA_SMOOTHING: 0.12,

  // Combo
  COMBO_TIMEOUT_MS: 3000,
  COMBO_THRESHOLDS: [5, 10, 20],
  COMBO_MULTIPLIERS: [2, 3, 5],

  // Fog of war radius (in cells)
  FOG_RADIUS: { EASY: 12, MEDIUM: 8, HARD: 5, EXPERT: 3 },

  // Player limits
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,

  // Reconnection
  RECONNECT_TIMEOUT_MS: 15000,
});

// Snake Arena specific WebSocket events
export const SNAKE_EVENTS = Object.freeze({
  // Player actions
  PLAYER_MOVE: 'snake:move',
  PLAYER_USE_POWERUP: 'snake:use_powerup',

  // World updates
  FOOD_SPAWNED: 'snake:food_spawned',
  FOOD_COLLECTED: 'snake:food_collected',
  POWERUP_SPAWNED: 'snake:powerup_spawned',
  POWERUP_COLLECTED: 'snake:powerup_collected',
  PORTAL_ENTERED: 'snake:portal_entered',
  SECRET_FOUND: 'snake:secret_found',
  TRAP_TRIGGERED: 'snake:trap_triggered',
  OBSTACLE_DESTROYED: 'snake:obstacle_destroyed',

  // Combat
  PLAYER_COLLISION: 'snake:player_collision',
  PLAYER_ELIMINATED: 'snake:player_eliminated',

  // Progression
  OBJECTIVE_COMPLETED: 'snake:objective_completed',
  LEVEL_CHANGE: 'snake:level_change',
  COMBO_UPDATE: 'snake:combo_update',
  TREASURE_SPAWNED: 'snake:treasure_spawned',
  TREASURE_COLLECTED: 'snake:treasure_collected',

  // Dynamic events
  EVENT_STARTED: 'snake:event_started',
  EVENT_ENDED: 'snake:event_ended',

  // State
  WORLD_SNAPSHOT: 'snake:world_snapshot',
  PLAYER_STATE: 'snake:player_state',

  // Debug
  DEBUG_INFO: 'snake:debug_info',
});

// Level tier definitions
export const LEVEL_TIERS = Object.freeze([
  { min: 1, max: 5, name: 'Tutorial', features: ['basic_movement', 'food', 'simple_walls'] },
  { min: 6, max: 10, name: 'Explorer', features: ['large_map', 'corridors', 'minimap'] },
  { min: 11, max: 15, name: 'Pathfinder', features: ['secrets', 'portals', 'speed_zones'] },
  { min: 16, max: 20, name: 'Survivor', features: ['moving_walls', 'traps', 'damage_zones'] },
  { min: 21, max: 25, name: 'Hunter', features: ['powerups', 'rare_food', 'events'] },
  { min: 26, max: 30, name: 'Shadow', features: ['fog_of_war', 'limited_minimap', 'treasures'] },
  { min: 31, max: 35, name: 'Architect', features: ['complex_map', 'dynamic_portals', 'breakable_walls'] },
  { min: 36, max: 40, name: 'Warlord', features: ['frequent_events', 'changing_zones', 'multi_objectives'] },
  { min: 41, max: 45, name: 'Legend', features: ['expert_mode', 'rare_resources', 'narrow_passages'] },
  { min: 46, max: 50, name: 'Nightmare', features: ['all_mechanics', 'chaos'] },
]);
