// Snake Arena — Powerup management
import { ARENA } from '../../../../shared/constants/snakeArena.js';

let powerupIdCounter = 0;

/** Spawn a random powerup onto the map */
export function spawnPowerup(state, rng) {
  const rngFn = rng || (() => Math.random());
  const pos = findSpawnPos(state, rngFn);
  if (!pos) return null;

  const type = pickPowerupType(rngFn);
  const def = ARENA.POWERUPS[type];
  const powerup = {
    id: `pu_${++powerupIdCounter}`,
    x: pos[0], y: pos[1],
    type, emoji: def.emoji,
    duration: def.duration,
    collected: false,
    spawnedAt: state.tickCount,
    expiresAt: state.tickCount + 600, // disappears after 30s at 20tps
  };
  state.powerups.push(powerup);
  return powerup;
}

/** Apply a powerup when collected */
export function collectPowerup(player, powerup, state) {
  powerup.collected = true;
  const idx = state.powerups.indexOf(powerup);
  if (idx !== -1) state.powerups.splice(idx, 1);

  if (powerup.type === 'TELEPORT') {
    // Instant effect: random teleport
    const pos = findSpawnPos(state, () => Math.random());
    if (pos) player.body[0] = pos;
    return;
  }

  if (powerup.type === 'CUT') {
    // Instant: cut tail in half
    const cutLen = Math.max(1, Math.floor(player.body.length / 2));
    player.body.splice(cutLen);
    player.length = player.body.length;
    return;
  }

  if (powerup.type === 'REVERSE') {
    // Instant: reverse body
    player.body.reverse();
    return;
  }

  // Duration-based powerups
  applyEffect(player, powerup);
}

/** Apply a duration-based effect */
export function applyEffect(player, powerup) {
  player.powerups.push({
    id: powerup.id,
    type: powerup.type,
    expiresAt: Date.now() + powerup.duration,
    appliedAt: Date.now(),
  });
}

/** Remove an expired effect */
export function removeEffect(player, powerupId) {
  const idx = player.powerups.findIndex(p => p.id === powerupId);
  if (idx !== -1) player.powerups.splice(idx, 1);
}

/** Tick down active powerups, remove expired ones */
export function updatePowerups(players, tickCount) {
  const now = Date.now();
  for (const [, player] of players) {
    player.powerups = player.powerups.filter(pu => pu.expiresAt > now);
  }
}

/** Check if player has a specific active powerup */
export function hasActivePowerup(player, type) {
  return player.powerups.some(p => p.type === type && p.expiresAt > Date.now());
}

function findSpawnPos(state, rngFn) {
  const occupied = new Set();
  for (const [, p] of state.players) {
    for (const [bx, by] of p.body) occupied.add(`${bx},${by}`);
  }
  for (const pu of state.powerups) occupied.add(`${pu.x},${pu.y}`);

  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(rngFn() * (state.mapSize - 4)) + 2;
    const y = Math.floor(rngFn() * (state.mapSize - 4)) + 2;
    if (state.map.cells[y]?.[x] !== 0) continue;
    if (occupied.has(`${x},${y}`)) continue;
    return [x, y];
  }
  return null;
}

function pickPowerupType(rngFn) {
  const types = Object.entries(ARENA.POWERUPS);
  const total = types.reduce((s, [, d]) => s + d.rarity, 0);
  let roll = rngFn() * total;
  for (const [key, def] of types) {
    roll -= def.rarity;
    if (roll <= 0) return key;
  }
  return 'SPEED_BOOST';
}

export default { spawnPowerup, collectPowerup, updatePowerups, applyEffect, removeEffect, hasActivePowerup };
