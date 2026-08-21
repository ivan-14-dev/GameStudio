import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkWinCondition, checkElimination, handleCombat, canPass, isValidMove } from '../../../src/games/snake-arena/SnakeRules.js';
import { ARENA } from '../../../../shared/constants/snakeArena.js';

function makePlayers(configs) {
  const map = new Map();
  for (const c of configs) {
    map.set(c.id, {
      id: c.id,
      alive: c.alive ?? true,
      score: c.score ?? 0,
      body: c.body ?? [[5, 5]],
      direction: 'UP',
      powerups: c.powerups ?? [],
      stats: { eliminations: c.eliminations ?? 0, secretsFound: c.secretsFound ?? 0, foodEaten: 0 },
    });
  }
  return map;
}

describe('checkWinCondition', () => {
  describe('SURVIVAL mode', () => {
    it('not finished with 2+ alive', () => {
      const state = { players: makePlayers([{ id: 'a' }, { id: 'b' }]) };
      const result = checkWinCondition(state, ARENA.MODES.SURVIVAL);
      assert.ok(!result.finished);
    });

    it('finished when 1 alive', () => {
      const state = { players: makePlayers([{ id: 'a' }, { id: 'b', alive: false }]) };
      const result = checkWinCondition(state, ARENA.MODES.SURVIVAL);
      assert.ok(result.finished);
      assert.equal(result.winner, 'a');
    });

    it('finished with no survivors', () => {
      const state = { players: makePlayers([{ id: 'a', alive: false }, { id: 'b', alive: false }]) };
      const result = checkWinCondition(state, ARENA.MODES.SURVIVAL);
      assert.ok(result.finished);
      assert.equal(result.winner, null);
    });
  });

  describe('SCORE mode', () => {
    it('not finished below target', () => {
      const state = { players: makePlayers([{ id: 'a', score: 500 }]), config: { scoreTarget: 1000 } };
      assert.ok(!checkWinCondition(state, ARENA.MODES.SCORE).finished);
    });

    it('finished when target reached', () => {
      const state = { players: makePlayers([{ id: 'a', score: 1000 }]), config: { scoreTarget: 1000 } };
      const result = checkWinCondition(state, ARENA.MODES.SCORE);
      assert.ok(result.finished);
      assert.equal(result.winner, 'a');
    });
  });

  describe('HUNT mode', () => {
    it('not finished below elimination target', () => {
      const state = { players: makePlayers([{ id: 'a', eliminations: 2 }, { id: 'b', eliminations: 0 }]), config: { eliminationTarget: 5 } };
      assert.ok(!checkWinCondition(state, ARENA.MODES.HUNT).finished);
    });

    it('finished when elimination target reached', () => {
      const state = { players: makePlayers([{ id: 'a', eliminations: 5 }]), config: { eliminationTarget: 5 } };
      const result = checkWinCondition(state, ARENA.MODES.HUNT);
      assert.ok(result.finished);
      assert.equal(result.winner, 'a');
    });
  });

  describe('TREASURE mode', () => {
    it('finished when treasure target reached', () => {
      const state = { players: makePlayers([{ id: 'a', secretsFound: 3 }]), config: { treasureTarget: 3 } };
      const result = checkWinCondition(state, ARENA.MODES.TREASURE);
      assert.ok(result.finished);
      assert.equal(result.winner, 'a');
    });
  });

  describe('DOMINATION mode', () => {
    it('not finished when timer > 0', () => {
      const state = { players: makePlayers([{ id: 'a', score: 500 }]), timer: 100 };
      assert.ok(!checkWinCondition(state, ARENA.MODES.DOMINATION).finished);
    });

    it('finished when timer reaches 0, highest score wins', () => {
      const state = { players: makePlayers([{ id: 'a', score: 500 }, { id: 'b', score: 800 }]), timer: 0 };
      const result = checkWinCondition(state, ARENA.MODES.DOMINATION);
      assert.ok(result.finished);
      assert.equal(result.winner, 'b');
    });
  });

  describe('default mode', () => {
    it('falls back to survival logic', () => {
      const state = { players: makePlayers([{ id: 'a' }, { id: 'b', alive: false }]) };
      const result = checkWinCondition(state, 'UNKNOWN');
      assert.ok(result.finished);
      assert.equal(result.winner, 'a');
    });
  });
});

describe('checkElimination', () => {
  it('returns true for dead player', () => {
    assert.ok(checkElimination({ alive: false, body: [[5,5]] }));
  });

  it('returns true for empty body', () => {
    assert.ok(checkElimination({ alive: true, body: [] }));
  });

  it('returns false for alive player with body', () => {
    assert.ok(!checkElimination({ alive: true, body: [[5,5]] }));
  });
});

describe('handleCombat', () => {
  it('CLASSIC: player1 dies (ran into other)', () => {
    const p1 = { id: 'a', body: [[5,5]] };
    const p2 = { id: 'b', body: [[5,5],[5,6]] };
    const result = handleCombat(p1, p2, { combat: ARENA.COMBAT.CLASSIC });
    assert.deepEqual(result.deaths, ['a']);
  });

  it('PEACEFUL: no deaths', () => {
    const p1 = { id: 'a', body: [[5,5]] };
    const p2 = { id: 'b', body: [[5,5]] };
    const result = handleCombat(p1, p2, { combat: ARENA.COMBAT.PEACEFUL });
    assert.deepEqual(result.deaths, []);
  });

  it('ADVANCED: smaller snake dies', () => {
    const p1 = { id: 'a', body: [[5,5],[5,6],[5,7]] };
    const p2 = { id: 'b', body: [[5,5]] };
    const result = handleCombat(p1, p2, { combat: ARENA.COMBAT.ADVANCED });
    assert.deepEqual(result.deaths, ['b']);
  });

  it('ADVANCED: equal size = both die', () => {
    const p1 = { id: 'a', body: [[5,5],[5,6]] };
    const p2 = { id: 'b', body: [[5,5],[5,7]] };
    const result = handleCombat(p1, p2, { combat: ARENA.COMBAT.ADVANCED });
    assert.deepEqual(result.deaths, ['a', 'b']);
  });
});

describe('canPass', () => {
  it('null obstacle is passable', () => {
    assert.ok(canPass({}, null));
  });

  it('ghost powerup allows passage', () => {
    assert.ok(canPass({ powerups: [{ type: 'GHOST' }] }, { type: 'WALL' }));
  });

  it('destroyed breakable wall is passable', () => {
    assert.ok(canPass({ powerups: [] }, { type: 'BREAKABLE_WALL', hp: 0 }));
  });

  it('collapsed obstacle is passable', () => {
    assert.ok(canPass({ powerups: [] }, { collapsed: true }));
  });

  it('normal wall blocks', () => {
    assert.ok(!canPass({ powerups: [] }, { type: 'WALL' }));
  });
});

describe('isValidMove', () => {
  it('rejects opposite direction', () => {
    assert.ok(!isValidMove({ direction: 'UP' }, 'DOWN', {}));
    assert.ok(!isValidMove({ direction: 'LEFT' }, 'RIGHT', {}));
  });

  it('allows perpendicular direction', () => {
    assert.ok(isValidMove({ direction: 'UP' }, 'LEFT', {}));
    assert.ok(isValidMove({ direction: 'UP' }, 'RIGHT', {}));
  });

  it('rejects invalid direction name', () => {
    assert.ok(!isValidMove({ direction: 'UP' }, 'DIAGONAL', {}));
  });
});
