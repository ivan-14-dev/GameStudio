// Snake Arena — Food management
import { ARENA } from '../../../../shared/constants/snakeArena.js';

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let foodIdCounter = 0;

/** Spawn food items onto the state */
export function spawnFood(state, count, rng) {
  const rngFn = rng || mulberry32(Date.now());
  for (let i = 0; i < count; i++) {
    const pos = getSpawnPosition(state, rngFn);
    if (!pos) continue;
    const type = pickFoodType(rngFn);
    const foodDef = ARENA.FOOD[type];
    state.food.push({
      id: `food_${++foodIdCounter}`,
      x: pos[0], y: pos[1],
      type, points: foodDef.points, growth: foodDef.growth, emoji: foodDef.emoji,
    });
  }
}

/** Apply food collection to a player */
export function collectFood(player, food, state) {
  player.score += food.points;
  player.length += food.growth;
  if (food.growth < 0) {
    // Shrink: remove from tail
    const removeCount = Math.min(Math.abs(food.growth), player.body.length - 1);
    player.body.splice(player.body.length - removeCount, removeCount);
  }
  player.stats.foodEaten++;

  // Remove from state
  const idx = state.food.indexOf(food);
  if (idx !== -1) state.food.splice(idx, 1);

  // Mystery food: random effect
  if (food.type === 'MYSTERY') {
    const effects = Object.keys(ARENA.FOOD).filter(k => k !== 'MYSTERY');
    const picked = effects[Math.floor(Math.random() * effects.length)];
    const fx = ARENA.FOOD[picked];
    player.score += fx.points;
    player.length += fx.growth;
  }

  return food.points;
}

/** Find a valid spawn position away from walls, players, and existing food */
export function getSpawnPosition(state, rngFn) {
  const occupied = new Set();

  // Mark player cells
  for (const [, p] of state.players) {
    for (const [bx, by] of p.body) occupied.add(`${bx},${by}`);
  }
  // Mark existing food
  for (const f of state.food) occupied.add(`${f.x},${f.y}`);

  for (let attempt = 0; attempt < 200; attempt++) {
    const x = Math.floor(rngFn() * (state.mapSize - 4)) + 2;
    const y = Math.floor(rngFn() * (state.mapSize - 4)) + 2;
    if (state.map.cells[y]?.[x] !== 0) continue;
    if (occupied.has(`${x},${y}`)) continue;

    // Not too close to existing food (min 3 cells)
    let tooClose = false;
    for (const f of state.food) {
      if (Math.abs(f.x - x) + Math.abs(f.y - y) < 3) { tooClose = true; break; }
    }
    if (tooClose) continue;

    return [x, y];
  }
  return null;
}

/** Weighted random food type selection based on rarity */
function pickFoodType(rngFn) {
  const types = Object.entries(ARENA.FOOD);
  const totalWeight = types.reduce((sum, [, def]) => sum + def.rarity, 0);
  let roll = rngFn() * totalWeight;
  for (const [key, def] of types) {
    roll -= def.rarity;
    if (roll <= 0) return key;
  }
  return 'NORMAL';
}

export default { spawnFood, collectFood, getSpawnPosition };
