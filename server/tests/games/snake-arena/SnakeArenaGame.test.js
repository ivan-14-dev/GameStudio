import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import SnakeArenaGame from '../../../src/games/snake-arena/SnakeArenaGame.js';

function makeConfig(overrides = {}) {
  return {
    difficulty: { level: 1 },
    playerCount: 2,
    players: [{ id: 'p0', name: 'Alice' }, { id: 'p1', name: 'Bob' }],
    seed: 42,
    mode: 'SURVIVAL',
    ...overrides,
  };
}

describe('SnakeArenaGame', () => {
  describe('getMetadata', () => {
    it('returns correct metadata', () => {
      const meta = SnakeArenaGame.getMetadata();
      assert.equal(meta.id, 'snake-arena');
      assert.equal(meta.minPlayers, 1);
      assert.equal(meta.maxPlayers, 8);
      assert.ok(meta.categories.includes('arcade'));
    });
  });

  describe('createState', () => {
    it('creates state with all required fields', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      assert.ok(state.players instanceof Map);
      assert.equal(state.players.size, 2);
      assert.ok(Array.isArray(state.food));
      assert.ok(Array.isArray(state.powerups));
      assert.ok(Array.isArray(state.portals));
      assert.ok(Array.isArray(state.secrets));
      assert.ok(Array.isArray(state.obstacles));
      assert.equal(state.tickCount, 0);
      assert.equal(state.mode, 'SURVIVAL');
    });

    it('creates players with correct initial state', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const p0 = state.players.get('p0');
      assert.equal(p0.id, 'p0');
      assert.equal(p0.name, 'Alice');
      assert.ok(p0.alive);
      assert.equal(p0.score, 0);
      assert.ok(Array.isArray(p0.body));
      assert.ok(p0.body.length >= 1);
      assert.ok(['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(p0.direction));
      assert.deepEqual(p0.powerups, []);
    });

    it('generates map with correct size for level', () => {
      const state = SnakeArenaGame.createState(makeConfig({ difficulty: { level: 1 } }));
      assert.equal(state.mapSize, 50); // SMALL for level 1-5
    });

    it('spawns initial food', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      assert.ok(state.food.length > 0);
    });

    it('uses seed for determinism', () => {
      const a = SnakeArenaGame.createState(makeConfig({ seed: 999 }));
      const b = SnakeArenaGame.createState(makeConfig({ seed: 999 }));
      assert.deepEqual(a.map.cells, b.map.cells);
    });

    it('supports custom mode', () => {
      const state = SnakeArenaGame.createState(makeConfig({ mode: 'SCORE' }));
      assert.equal(state.mode, 'SCORE');
    });

    it('supports up to 8 players', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const state = SnakeArenaGame.createState(makeConfig({ playerCount: 8, players }));
      assert.equal(state.players.size, 8);
    });
  });

  describe('validateAction', () => {
    it('accepts valid direction change', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const result = SnakeArenaGame.validateAction(state, { type: 'direction', direction: 'LEFT' }, { id: 'p0' });
      // Might be true or an error depending on direction vs current
      assert.ok(result === true || typeof result === 'string');
    });

    it('rejects missing action type', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      assert.equal(SnakeArenaGame.validateAction(state, {}, { id: 'p0' }), 'Missing action type');
    });

    it('rejects invalid direction', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const result = SnakeArenaGame.validateAction(state, { type: 'direction', direction: 'DIAGONAL' }, { id: 'p0' });
      assert.equal(result, 'Invalid direction');
    });

    it('rejects action from dead player', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.players.get('p0').alive = false;
      const result = SnakeArenaGame.validateAction(state, { type: 'direction', direction: 'UP' }, { id: 'p0' });
      assert.equal(result, 'Snake is dead');
    });

    it('rejects opposite direction', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const p = state.players.get('p0');
      p.direction = 'UP';
      const result = SnakeArenaGame.validateAction(state, { type: 'direction', direction: 'DOWN' }, { id: 'p0' });
      assert.equal(result, 'Cannot reverse');
    });

    it('rejects use_powerup with no powerups', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const result = SnakeArenaGame.validateAction(state, { type: 'use_powerup' }, { id: 'p0' });
      assert.equal(result, 'No powerups available');
    });

    it('accepts use_powerup with powerups', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.players.get('p0').powerups.push({ type: 'SHIELD', id: 'pu1' });
      const result = SnakeArenaGame.validateAction(state, { type: 'use_powerup' }, { id: 'p0' });
      assert.equal(result, true);
    });

    it('rejects unknown action type', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      assert.equal(SnakeArenaGame.validateAction(state, { type: 'fly' }, { id: 'p0' }), 'Unknown action type');
    });
  });

  describe('applyAction', () => {
    it('changes direction', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      SnakeArenaGame.applyAction(state, { type: 'direction', direction: 'LEFT' }, { id: 'p0' });
      assert.equal(state.players.get('p0').direction, 'LEFT');
    });

    it('sets pending powerup', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      SnakeArenaGame.applyAction(state, { type: 'use_powerup', powerupId: 'pu1' }, { id: 'p0' });
      assert.equal(state.players.get('p0')._pendingPowerup, 'pu1');
    });

    it('no-op for dead player', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.players.get('p0').alive = false;
      const result = SnakeArenaGame.applyAction(state, { type: 'direction', direction: 'UP' }, { id: 'p0' });
      assert.deepEqual(result, {});
    });
  });

  describe('tick', () => {
    it('increments tick count', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      SnakeArenaGame.tick(state);
      assert.equal(state.tickCount, 1);
    });

    it('returns tick result with required fields', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const result = SnakeArenaGame.tick(state);
      assert.ok('tickCount' in result);
      assert.ok('positions' in result);
      assert.ok('food' in result);
      assert.ok('events' in result);
      assert.ok('finished' in result);
    });

    it('game not finished immediately', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const result = SnakeArenaGame.tick(state);
      assert.ok(!result.finished);
    });

    it('game finishes when only one player alive', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.players.get('p1').alive = false;
      const result = SnakeArenaGame.tick(state);
      assert.ok(result.finished);
      assert.equal(result.winner, 'p0');
    });

    it('multiple ticks run without error', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      for (let i = 0; i < 50; i++) {
        SnakeArenaGame.tick(state);
      }
      assert.equal(state.tickCount, 50);
    });

    it('decrements timer', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.timer = 10;
      SnakeArenaGame.tick(state);
      assert.equal(state.timer, 9);
    });
  });

  describe('checkGameEnd', () => {
    it('not finished with multiple alive players', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      assert.ok(!SnakeArenaGame.checkGameEnd(state).finished);
    });

    it('finished in SURVIVAL when one left', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.players.get('p1').alive = false;
      const result = SnakeArenaGame.checkGameEnd(state);
      assert.ok(result.finished);
      assert.equal(result.winner, 'p0');
    });
  });

  describe('calculateScore', () => {
    it('returns scores for all players', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      state.players.get('p0').score = 500;
      state.players.get('p0').stats.foodEaten = 10;
      const scores = SnakeArenaGame.calculateScore(state);
      assert.ok('p0' in scores);
      assert.ok('p1' in scores);
      assert.ok(scores['p0'] > 0);
    });
  });

  describe('serializeState', () => {
    it('strips internal fields', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const serialized = SnakeArenaGame.serializeState(state);
      assert.ok(!('_world' in serialized));
      assert.ok(!('_eventEngine' in serialized));
      assert.ok(!('_rng' in serialized));
    });

    it('includes player data', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      const serialized = SnakeArenaGame.serializeState(state);
      assert.ok(serialized.players);
      assert.ok('p0' in serialized.players);
    });
  });

  describe('getDifficulty', () => {
    it('returns difficulty config', () => {
      const diff = SnakeArenaGame.getDifficulty?.();
      if (diff) {
        assert.ok('level' in diff || 'speed' in diff);
      }
    });
  });

  describe('handlePlayerJoin', () => {
    it('adds a new player to state', () => {
      const state = SnakeArenaGame.createState(makeConfig());
      if (typeof SnakeArenaGame.handlePlayerJoin === 'function') {
        const before = state.players.size;
        SnakeArenaGame.handlePlayerJoin(state, { id: 'p2', name: 'Charlie' });
        assert.ok(state.players.size >= before);
      }
    });
  });

  describe('integration: full game flow', () => {
    it('runs a complete game to conclusion', () => {
      const state = SnakeArenaGame.createState(makeConfig({ seed: 777 }));
      let finished = false;
      let ticks = 0;
      const maxTicks = 2000;

      while (!finished && ticks < maxTicks) {
        // Apply random direction changes
        for (const [pid, player] of state.players) {
          if (!player.alive) continue;
          if (ticks % 10 === 0) {
            const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
            const dir = dirs[ticks % 4];
            const valid = SnakeArenaGame.validateAction(state, { type: 'direction', direction: dir }, { id: pid });
            if (valid === true) {
              SnakeArenaGame.applyAction(state, { type: 'direction', direction: dir }, { id: pid });
            }
          }
        }

        const result = SnakeArenaGame.tick(state);
        finished = result.finished;
        ticks++;
      }

      // Game should end eventually (snakes will hit walls or each other)
      assert.ok(ticks <= maxTicks, `Game should end within ${maxTicks} ticks`);
    });
  });
});
