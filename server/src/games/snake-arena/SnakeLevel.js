// Snake Arena — Level/progression system
import { ARENA, LEVEL_TIERS } from '../../../../shared/constants/snakeArena.js';

/** Get full configuration for a given level */
export function getLevelConfig(level) {
  const tier = LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0];
  return {
    mapSize: getMapSizeForLevel(level),
    features: getFeaturesForLevel(level),
    foodDensity: getFoodDensity(level),
    obstacleTypes: getObstacleTypes(level),
    eventFrequency: getEventFrequency(level),
    fogRadius: getFogRadius(level),
    minimapDetail: getMinimapDetail(level),
    tierName: tier.name,
  };
}

/** Get enabled features based on level tier accumulation */
export function getFeaturesForLevel(level) {
  const features = new Set();
  for (const tier of LEVEL_TIERS) {
    if (level >= tier.min) {
      for (const f of tier.features) features.add(f);
    }
  }
  return [...features];
}

/** Map size scales with level */
export function getMapSizeForLevel(level) {
  if (level <= 5) return ARENA.MAP_SIZES.SMALL;
  if (level <= 15) return ARENA.MAP_SIZES.MEDIUM;
  if (level <= 30) return ARENA.MAP_SIZES.LARGE;
  return ARENA.MAP_SIZES.HUGE;
}

/** Get difficulty modifiers for speed, spawn rates */
export function getDifficultyModifiers(level) {
  return {
    speedMultiplier: 1 + (level - 1) * 0.03,
    foodSpawnRate: Math.max(0.5, 1 - (level - 1) * 0.02),
    obstacleSpeed: 1 + Math.floor(level / 10) * 0.2,
    eventCooldownMod: Math.max(0.3, 1 - (level - 1) * 0.015),
  };
}

function getFoodDensity(level) {
  // More food at lower levels, sparser at higher
  if (level <= 5) return 0.004;
  if (level <= 15) return 0.003;
  if (level <= 30) return 0.002;
  return 0.0015;
}

function getObstacleTypes(level) {
  const types = [];
  if (level >= 1) types.push('WALL');
  if (level >= 11) types.push('BREAKABLE_WALL');
  if (level >= 16) types.push('MOVING_WALL', 'TRAP');
  if (level >= 21) types.push('ROTATING_OBSTACLE', 'DAMAGE_ZONE');
  if (level >= 26) types.push('COLLAPSING_BLOCK', 'GATE');
  return types;
}

function getEventFrequency(level) {
  if (level < 6) return 0;
  if (level <= 15) return 0.3;
  if (level <= 25) return 0.6;
  return 1.0;
}

function getFogRadius(level) {
  if (level < 26) return Infinity;
  if (level <= 30) return ARENA.FOG_RADIUS.EASY;
  if (level <= 35) return ARENA.FOG_RADIUS.MEDIUM;
  if (level <= 40) return ARENA.FOG_RADIUS.HARD;
  return ARENA.FOG_RADIUS.EXPERT;
}

function getMinimapDetail(level) {
  if (level < 6) return 'none';
  if (level <= 15) return 'full';
  if (level <= 25) return 'partial';
  return 'minimal';
}

export default { getLevelConfig, getFeaturesForLevel, getMapSizeForLevel, getDifficultyModifiers };
