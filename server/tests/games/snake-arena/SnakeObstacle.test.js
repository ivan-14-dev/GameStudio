import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createObstacles, updateObstacles, damageObstacle, isPassable } from '../../../src/games/snake-arena/SnakeObstacle.js';

function makeMap(size = 30) {
  const cells = Array.from({ length: size }, () => new Array(size).fill(0));
  for (let i = 0; i < size; i++) { cells[0][i] = 1; cells[size-1][i] = 1; cells[i][0] = 1; cells[i][size-1] = 1; }
  return { cells };
}

function makeRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('createObstacles', () => {
  it('returns empty array for low levels (<6)', () => {
    const map = makeMap();
    const rng = makeRng([0.5]);
    assert.deepEqual(createObstacles(map, 1, rng), []);
    assert.deepEqual(createObstacles(map, 5, rng), []);
  });

  it('creates breakable walls at level 11+', () => {
    const map = makeMap();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.5, 0.5, 0.3, 0.7, 0.2, 0.4]);
    const obs = createObstacles(map, 11, rng);
    assert.ok(obs.some(o => o.type === 'BREAKABLE_WALL'));
  });

  it('creates moving walls at level 16+', () => {
    const map = makeMap();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.3]);
    const obs = createObstacles(map, 16, rng);
    assert.ok(obs.some(o => o.type === 'MOVING_WALL'));
  });

  it('creates traps at level 16+', () => {
    const map = makeMap();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.3]);
    const obs = createObstacles(map, 16, rng);
    assert.ok(obs.some(o => o.type === 'TRAP'));
  });

  it('creates rotating obstacles at level 21+', () => {
    const map = makeMap();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.3, 0.6, 0.2, 0.4]);
    const obs = createObstacles(map, 21, rng);
    assert.ok(obs.some(o => o.type === 'ROTATING_OBSTACLE'));
  });

  it('all obstacles have id, x, y, type', () => {
    const map = makeMap();
    const rng = makeRng([0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 0.1, 0.9, 0.5, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8]);
    const obs = createObstacles(map, 21, rng);
    for (const o of obs) {
      assert.ok(o.id, 'obstacle should have an id');
      assert.ok('x' in o, 'obstacle should have x');
      assert.ok('y' in o, 'obstacle should have y');
      assert.ok(o.type, 'obstacle should have a type');
    }
  });
});

describe('updateObstacles', () => {
  it('moves MOVING_WALL when interval elapsed', () => {
    const map = makeMap();
    const obs = [{
      type: 'MOVING_WALL', x: 10, y: 10, dx: 1, dy: 0,
      moveInterval: 5, lastMove: 0,
    }];
    updateObstacles(obs, 10, map);
    assert.equal(obs[0].x, 11);
    assert.equal(obs[0].lastMove, 10);
  });

  it('reverses MOVING_WALL at border', () => {
    const map = makeMap(30);
    const obs = [{
      type: 'MOVING_WALL', x: 28, y: 10, dx: 1, dy: 0,
      moveInterval: 5, lastMove: 0,
    }];
    updateObstacles(obs, 10, map);
    assert.equal(obs[0].dx, -1);
  });

  it('collapses COLLAPSING_BLOCK at collapseAt', () => {
    const obs = [{
      type: 'COLLAPSING_BLOCK', x: 5, y: 5,
      collapseAt: 50, collapsed: false,
    }];
    updateObstacles(obs, 50, { cells: [[]] });
    assert.ok(obs[0].collapsed);
  });

  it('does not collapse early', () => {
    const obs = [{
      type: 'COLLAPSING_BLOCK', x: 5, y: 5,
      collapseAt: 50, collapsed: false,
    }];
    updateObstacles(obs, 30, { cells: [[]] });
    assert.ok(!obs[0].collapsed);
  });
});

describe('damageObstacle', () => {
  it('reduces HP of breakable wall', () => {
    const obs = { type: 'BREAKABLE_WALL', hp: 3, maxHp: 3 };
    const destroyed = damageObstacle(obs, 1);
    assert.equal(obs.hp, 2);
    assert.ok(!destroyed);
  });

  it('returns true when destroyed', () => {
    const obs = { type: 'BREAKABLE_WALL', hp: 1, maxHp: 3 };
    assert.ok(damageObstacle(obs, 1));
  });

  it('returns false for non-breakable', () => {
    const obs = { type: 'WALL' };
    assert.ok(!damageObstacle(obs, 1));
  });
});

describe('isPassable', () => {
  it('null obstacle is passable', () => {
    assert.ok(isPassable(null, {}));
  });

  it('collapsed obstacle is passable', () => {
    assert.ok(isPassable({ collapsed: true }, {}));
  });

  it('ghost powerup makes all passable', () => {
    assert.ok(isPassable({ type: 'WALL' }, { powerups: [{ type: 'GHOST' }] }));
  });

  it('triggered trap is passable', () => {
    assert.ok(isPassable({ type: 'TRAP', triggered: true }, { powerups: [] }));
  });

  it('normal wall is not passable', () => {
    assert.ok(!isPassable({ type: 'WALL' }, { powerups: [] }));
  });
});
