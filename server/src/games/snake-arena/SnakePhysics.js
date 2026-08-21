// Snake Arena — Physics (grid-based movement with speed modifiers)
import { ARENA } from '../../../../shared/constants/snakeArena.js';

const BASE_SPEED = 1;

const TERRAIN_SPEED = {
  NORMAL: 1.0,
  ICE: 1.5,
  MUD: 0.5,
  BOOST: 2.0,
  DANGER: 0.8,
  PORTAL_ZONE: 1.0,
  DARK_ZONE: 0.7,
};

/** Calculate the new head position for a snake */
export function moveSnake(player, state) {
  const dir = ARENA.DIRECTIONS[player.direction];
  if (!dir) return player.body[0];
  const head = player.body[0];
  return [head[0] + dir.x, head[1] + dir.y];
}

/** Apply terrain modifier to a player's effective speed */
export function applyTerrain(player, terrainType) {
  const mod = TERRAIN_SPEED[terrainType] ?? 1.0;
  player._terrainSpeedMod = mod;
  return mod;
}

/** Get effective speed considering powerups, terrain, and length */
export function getSpeedForPlayer(player) {
  let speed = BASE_SPEED;

  // Terrain modifier
  if (player._terrainSpeedMod != null) speed *= player._terrainSpeedMod;

  // Powerup modifiers
  if (player.powerups) {
    for (const pu of player.powerups) {
      if (pu.type === 'SPEED_BOOST') speed *= 1.5;
      if (pu.type === 'FREEZE') speed *= 0.3;
    }
  }

  // Longer snakes are slightly slower
  if (player.body.length > 20) speed *= 0.9;
  if (player.body.length > 50) speed *= 0.85;

  return speed;
}

/** Check if player should move this tick based on speed */
export function shouldMoveThisTick(player, tickCount) {
  const speed = getSpeedForPlayer(player);
  if (speed >= 2.0) return true;
  if (speed >= 1.5) return tickCount % 1 === 0;
  if (speed >= 1.0) return tickCount % 1 === 0;
  if (speed >= 0.5) return tickCount % 2 === 0;
  return tickCount % 3 === 0;
}

export default { moveSnake, applyTerrain, getSpeedForPlayer, shouldMoveThisTick };
