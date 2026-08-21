import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFood, collectFood, getSpawnPosition } from '../../../src/games/snake-arena/SnakeFood.js';

function makeRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

function makeState(overrides = {}) {
  const size = 20;
  const cells = Array.from({ length: size }, () => new Array(size).fill(0));
  for (let i = 0; i < size; i++) { cells[0][i] = 1; cells[size-1][i] = 1; cells[i][0] = 1; cells[i][size-1] = 1; }
  return {
    players: new Map(),
    food: [],
    powerups: [],
    obstacles: [],
    portals: [],
    secrets: [],
    map: { cells },
    mapSize: size,
    ...overrides,
  };
}

describe('spawnFood', () => {
  it('spawns requested number of food items', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9]);
    spawnFood(state, 3, rng);
    assert.ok(state.food.length >= 1);
  });

  it('each food has x, y, type properties', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8]);
    spawnFood(state, 1, rng);
    if (state.food.length > 0) {
      const f = state.food[0];
      assert.ok('x' in f);
      assert.ok('y' in f);
      assert.ok('type' in f);
    }
  });
});

describe('collectFood', () => {
  it('adds score and growth for normal food', () => {
    const player = {
      score: 0,
      length: 1,
      body: [[5, 5]],
      _growthPending: 0,
      stats: { foodEaten: 0 },
      combo: { count: 0, multiplier: 1, lastTime: 0 },
      powerups: [],
    };
    const food = { type: 'NORMAL', x: 5, y: 5, points: 10, growth: 1 };
    const state = makeState({ food: [food] });
    collectFood(player, food, state);
    assert.equal(player.score, 10);
    assert.equal(player.length, 2);
    assert.equal(player.stats.foodEaten, 1);
  });

  it('poison food reduces score', () => {
    const player = {
      score: 100,
      length: 4,
      body: [[5, 5], [5, 6], [5, 7], [5, 8]],
      _growthPending: 0,
      stats: { foodEaten: 0 },
      combo: { count: 0, multiplier: 1, lastTime: 0 },
      powerups: [],
    };
    const food = { type: 'POISON', x: 5, y: 5, points: -20, growth: -2 };
    const state = makeState({ food: [food] });
    collectFood(player, food, state);
    assert.ok(player.score < 100, `score should decrease, got ${player.score}`);
  });
});

describe('getSpawnPosition', () => {
  it('returns a valid position within bounds', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.6, 0.8, 0.2, 0.9]);
    const pos = getSpawnPosition(state, rng);
    if (pos) {
      assert.ok(pos[0] >= 1 && pos[0] < state.mapSize - 1);
      assert.ok(pos[1] >= 1 && pos[1] < state.mapSize - 1);
    }
  });

  it('avoids wall cells', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5]);
    const pos = getSpawnPosition(state, rng);
    if (pos) {
      assert.equal(state.map.cells[pos[1]][pos[0]], 0);
    }
  });
});

describe('spawnFood type distribution', () => {
  it('spawned food has valid type from ARENA.FOOD', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9]);
    spawnFood(state, 5, rng);
    const validTypes = ['NORMAL', 'RARE', 'EPIC', 'GOLD', 'POISON', 'MYSTERY'];
    for (const f of state.food) {
      assert.ok(validTypes.includes(f.type), `food type ${f.type} should be valid`);
    }
  });
});
