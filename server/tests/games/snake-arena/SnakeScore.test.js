import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addScore, updateCombo, resetCombo, getMultiplier, calculateFinalScores } from '../../../src/games/snake-arena/SnakeScore.js';

function makePlayer(overrides = {}) {
  return {
    score: 0,
    combo: { count: 0, multiplier: 1, lastTime: 0 },
    powerups: [],
    body: [[5, 5], [5, 6], [5, 7]],
    alive: true,
    stats: { foodEaten: 5, secretsFound: 1, eliminations: 2 },
    ...overrides,
  };
}

describe('addScore', () => {
  it('adds base score with multiplier 1', () => {
    const player = makePlayer();
    const result = addScore(player, 100, 'food');
    assert.equal(result, 100);
    assert.equal(player.score, 100);
  });

  it('applies combo multiplier', () => {
    const player = makePlayer({ combo: { count: 10, multiplier: 3, lastTime: Date.now() } });
    const result = addScore(player, 100, 'food');
    assert.equal(result, 300);
    assert.equal(player.score, 300);
  });

  it('applies DOUBLE_SCORE powerup', () => {
    const player = makePlayer({ powerups: [{ type: 'DOUBLE_SCORE' }] });
    const result = addScore(player, 50, 'food');
    assert.equal(result, 100);
  });

  it('stacks combo and powerup multipliers', () => {
    const player = makePlayer({
      combo: { count: 10, multiplier: 3, lastTime: Date.now() },
      powerups: [{ type: 'DOUBLE_SCORE' }],
    });
    const result = addScore(player, 10, 'food');
    assert.equal(result, 60); // 10 * 3 * 2
  });
});

describe('updateCombo', () => {
  it('increments combo count', () => {
    const player = makePlayer();
    updateCombo(player, Date.now());
    assert.equal(player.combo.count, 1);
  });

  it('resets combo if timed out', () => {
    const player = makePlayer({
      combo: { count: 8, multiplier: 2, lastTime: Date.now() - 5000 },
    });
    updateCombo(player, Date.now());
    // After reset, count becomes 1 (reset then increment)
    assert.equal(player.combo.count, 1);
  });

  it('upgrades multiplier at threshold 5', () => {
    const player = makePlayer();
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      updateCombo(player, now + i);
    }
    assert.equal(player.combo.multiplier, 2);
  });

  it('upgrades multiplier at threshold 10', () => {
    const player = makePlayer();
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      updateCombo(player, now + i);
    }
    assert.equal(player.combo.multiplier, 3);
  });

  it('upgrades multiplier at threshold 20', () => {
    const player = makePlayer();
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      updateCombo(player, now + i);
    }
    assert.equal(player.combo.multiplier, 5);
  });
});

describe('resetCombo', () => {
  it('resets count, multiplier, and lastTime', () => {
    const player = makePlayer({ combo: { count: 15, multiplier: 3, lastTime: 1000 } });
    resetCombo(player);
    assert.equal(player.combo.count, 0);
    assert.equal(player.combo.multiplier, 1);
    assert.equal(player.combo.lastTime, 0);
  });
});

describe('getMultiplier', () => {
  it('returns 1 for fresh player', () => {
    assert.equal(getMultiplier(makePlayer()), 1);
  });

  it('returns combo multiplier', () => {
    assert.equal(getMultiplier(makePlayer({ combo: { count: 5, multiplier: 2, lastTime: 0 } })), 2);
  });

  it('doubles with DOUBLE_SCORE', () => {
    const player = makePlayer({
      combo: { count: 5, multiplier: 2, lastTime: 0 },
      powerups: [{ type: 'DOUBLE_SCORE' }],
    });
    assert.equal(getMultiplier(player), 4);
  });
});

describe('calculateFinalScores', () => {
  it('calculates composite score for all players', () => {
    const state = {
      players: new Map([
        ['p0', makePlayer({ score: 500 })],
        ['p1', makePlayer({ score: 300, alive: false })],
      ]),
    };
    const scores = calculateFinalScores(state);
    // p0: 500 + 5*2 + 1*50 + 2*100 + 200 + 3*5 = 500+10+50+200+200+15 = 975
    assert.equal(scores['p0'], 975);
    // p1: 300 + 10 + 50 + 200 + 0 + 15 = 575
    assert.equal(scores['p1'], 575);
  });

  it('survival bonus only for alive players', () => {
    const state = {
      players: new Map([
        ['alive', makePlayer({ score: 0, alive: true, body: [[0,0]], stats: { foodEaten: 0, secretsFound: 0, eliminations: 0 } })],
        ['dead', makePlayer({ score: 0, alive: false, body: [[0,0]], stats: { foodEaten: 0, secretsFound: 0, eliminations: 0 } })],
      ]),
    };
    const scores = calculateFinalScores(state);
    assert.ok(scores['alive'] > scores['dead']);
    assert.equal(scores['alive'] - scores['dead'], 200);
  });
});
