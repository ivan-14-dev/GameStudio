import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnPowerup, collectPowerup, applyEffect, removeEffect, updatePowerups, hasActivePowerup } from '../../../src/games/snake-arena/SnakePowerup.js';

function makeRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

function makeState() {
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
    tickCount: 100,
  };
}

function makePlayer() {
  return {
    id: 'p0',
    body: [[5, 5], [5, 6], [5, 7], [5, 8], [5, 9]],
    direction: 'UP',
    powerups: [],
    score: 0,
    combo: { count: 0, multiplier: 1, lastTime: 0 },
    stats: { foodEaten: 0, secretsFound: 0, eliminations: 0 },
    _growthPending: 0,
    alive: true,
  };
}

describe('spawnPowerup', () => {
  it('adds a powerup to state', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8]);
    spawnPowerup(state, rng);
    assert.ok(state.powerups.length >= 1);
  });

  it('powerup has required fields', () => {
    const state = makeState();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2]);
    spawnPowerup(state, rng);
    if (state.powerups.length > 0) {
      const p = state.powerups[0];
      assert.ok('x' in p);
      assert.ok('y' in p);
      assert.ok('type' in p);
    }
  });
});

describe('collectPowerup', () => {
  it('marks powerup as collected', () => {
    const player = makePlayer();
    const powerup = { x: 5, y: 5, type: 'SHIELD', collected: false };
    const state = makeState();
    state.powerups.push(powerup);
    collectPowerup(player, powerup, state);
    assert.ok(powerup.collected || player.powerups.length > 0);
  });
});

describe('applyEffect', () => {
  it('adds duration-based powerup to player array', () => {
    const player = makePlayer();
    applyEffect(player, { type: 'SHIELD', duration: 5000 });
    assert.ok(player.powerups.length > 0);
    assert.equal(player.powerups[0].type, 'SHIELD');
  });
});

describe('removeEffect', () => {
  it('removes powerup by id', () => {
    const player = makePlayer();
    player.powerups = [{ id: 'pu1', type: 'SHIELD', expiresAt: 999 }];
    removeEffect(player, 'pu1');
    assert.equal(player.powerups.length, 0);
  });

  it('no-op for unknown id', () => {
    const player = makePlayer();
    player.powerups = [{ id: 'pu1', type: 'SHIELD', expiresAt: 999 }];
    removeEffect(player, 'unknown');
    assert.equal(player.powerups.length, 1);
  });
});

describe('updatePowerups', () => {
  it('removes expired powerups (expiresAt in the past)', () => {
    const players = new Map([
      ['p0', { powerups: [{ id: 'pu1', type: 'SHIELD', expiresAt: Date.now() - 1000 }] }],
    ]);
    updatePowerups(players, 100);
    assert.equal(players.get('p0').powerups.length, 0);
  });

  it('keeps non-expired powerups (expiresAt in the future)', () => {
    const players = new Map([
      ['p0', { powerups: [{ id: 'pu1', type: 'SHIELD', expiresAt: Date.now() + 60000 }] }],
    ]);
    updatePowerups(players, 100);
    assert.equal(players.get('p0').powerups.length, 1);
  });
});

describe('hasActivePowerup', () => {
  it('returns true for active powerup with future expiry', () => {
    const player = { powerups: [{ type: 'GHOST', expiresAt: Date.now() + 60000 }] };
    assert.ok(hasActivePowerup(player, 'GHOST'));
  });

  it('returns false for expired powerup', () => {
    const player = { powerups: [{ type: 'GHOST', expiresAt: Date.now() - 1000 }] };
    assert.ok(!hasActivePowerup(player, 'GHOST'));
  });

  it('returns false for missing type', () => {
    const player = { powerups: [{ type: 'SHIELD', expiresAt: Date.now() + 60000 }] };
    assert.ok(!hasActivePowerup(player, 'GHOST'));
  });

  it('returns false with empty powerups', () => {
    assert.ok(!hasActivePowerup({ powerups: [] }, 'SHIELD'));
  });
});
