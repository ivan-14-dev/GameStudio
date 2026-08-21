import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SpatialHash, buildSpatialHash, checkWall, checkSelfCollision, checkSnakeCollision, checkFood, checkPowerup, checkPortal, checkSecret, checkTrap, checkAll } from '../../../src/games/snake-arena/SnakeCollision.js';

describe('SpatialHash', () => {
  it('insert and query', () => {
    const h = new SpatialHash();
    h.insert(5, 10, { id: 'a' });
    const items = h.query(5, 10);
    assert.equal(items.length, 1);
    assert.equal(items[0].id, 'a');
  });

  it('query returns empty for missing coords', () => {
    const h = new SpatialHash();
    assert.deepEqual(h.query(99, 99), []);
  });

  it('has returns true/false', () => {
    const h = new SpatialHash();
    h.insert(3, 4, { id: 'x' });
    assert.ok(h.has(3, 4));
    assert.ok(!h.has(0, 0));
  });

  it('multiple items at same coord', () => {
    const h = new SpatialHash();
    h.insert(1, 1, { id: 'a' });
    h.insert(1, 1, { id: 'b' });
    assert.equal(h.query(1, 1).length, 2);
  });

  it('clear empties all data', () => {
    const h = new SpatialHash();
    h.insert(1, 1, { id: 'a' });
    h.clear();
    assert.ok(!h.has(1, 1));
  });

  it('handles negative coords', () => {
    const h = new SpatialHash();
    h.insert(-5, -10, { id: 'neg' });
    assert.equal(h.query(-5, -10).length, 1);
  });
});

describe('buildSpatialHash', () => {
  it('indexes snakes, food, powerups, obstacles, portals, secrets', () => {
    const state = {
      players: new Map([
        ['p0', { alive: true, body: [[5, 5], [5, 6]] }],
        ['p1', { alive: false, body: [[10, 10]] }],
      ]),
      food: [{ x: 3, y: 3 }],
      powerups: [{ x: 7, y: 7, collected: false }, { x: 8, y: 8, collected: true }],
      obstacles: [{ x: 2, y: 2 }],
      portals: [{ x: 4, y: 4 }],
      secrets: [{ x: 6, y: 6, found: false }, { x: 9, y: 9, found: true }],
    };
    const h = buildSpatialHash(state);
    assert.equal(h.query(5, 5).length, 1);
    assert.equal(h.query(5, 6).length, 1);
    assert.equal(h.query(10, 10).length, 0); // dead snake not indexed
    assert.equal(h.query(3, 3).length, 1);
    assert.equal(h.query(7, 7).length, 1);
    assert.equal(h.query(8, 8).length, 0); // collected powerup not indexed
    assert.equal(h.query(2, 2).length, 1);
    assert.equal(h.query(4, 4).length, 1);
    assert.equal(h.query(6, 6).length, 1);
    assert.equal(h.query(9, 9).length, 0); // found secret not indexed
  });
});

describe('checkWall', () => {
  const map = { cells: [[1,0,0],[0,0,0],[0,0,1]] };

  it('detects out of bounds', () => {
    assert.ok(checkWall([-1, 0], map, 3));
    assert.ok(checkWall([3, 0], map, 3));
    assert.ok(checkWall([0, -1], map, 3));
    assert.ok(checkWall([0, 3], map, 3));
  });

  it('detects wall cell', () => {
    assert.ok(checkWall([0, 0], map, 3));
    assert.ok(checkWall([2, 2], map, 3));
  });

  it('returns false for open cell', () => {
    assert.ok(!checkWall([1, 1], map, 3));
  });
});

describe('checkSelfCollision', () => {
  it('no collision on short snake', () => {
    assert.ok(!checkSelfCollision({ body: [[5, 5]] }));
  });

  it('detects head hitting body', () => {
    assert.ok(checkSelfCollision({ body: [[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]] }));
  });

  it('no false positive on normal snake', () => {
    assert.ok(!checkSelfCollision({ body: [[5, 5], [5, 6], [5, 7]] }));
  });
});

describe('checkSnakeCollision', () => {
  it('detects head-on collision', () => {
    const result = checkSnakeCollision([5, 5], { body: [[5, 5], [5, 6]] });
    assert.ok(result);
    assert.ok(result.hitHead);
    assert.equal(result.hitIndex, 0);
  });

  it('detects body collision', () => {
    const result = checkSnakeCollision([5, 6], { body: [[5, 5], [5, 6], [5, 7]] });
    assert.ok(result);
    assert.ok(!result.hitHead);
    assert.equal(result.hitIndex, 1);
  });

  it('returns null on miss', () => {
    assert.equal(checkSnakeCollision([9, 9], { body: [[5, 5], [5, 6]] }), null);
  });
});

describe('checkFood', () => {
  it('finds food at position', () => {
    const food = [{ x: 3, y: 4 }, { x: 7, y: 8 }];
    assert.deepEqual(checkFood([3, 4], food), food[0]);
  });

  it('returns null on miss', () => {
    assert.equal(checkFood([0, 0], [{ x: 5, y: 5 }]), null);
  });
});

describe('checkPowerup', () => {
  it('finds uncollected powerup', () => {
    const pus = [{ x: 3, y: 3, collected: false }];
    assert.ok(checkPowerup([3, 3], pus));
  });

  it('skips collected', () => {
    assert.equal(checkPowerup([3, 3], [{ x: 3, y: 3, collected: true }]), null);
  });
});

describe('checkPortal', () => {
  it('finds portal', () => {
    assert.ok(checkPortal([1, 1], [{ x: 1, y: 1 }]));
  });

  it('returns undefined on miss', () => {
    assert.ok(!checkPortal([9, 9], [{ x: 1, y: 1 }]));
  });
});

describe('checkSecret', () => {
  it('finds unfound secret', () => {
    assert.ok(checkSecret([2, 2], [{ x: 2, y: 2, found: false }]));
  });

  it('skips found', () => {
    assert.equal(checkSecret([2, 2], [{ x: 2, y: 2, found: true }]), null);
  });
});

describe('checkTrap', () => {
  it('finds untriggered trap', () => {
    assert.ok(checkTrap([4, 4], [{ x: 4, y: 4, type: 'TRAP', triggered: false }]));
  });

  it('skips triggered', () => {
    assert.ok(!checkTrap([4, 4], [{ x: 4, y: 4, type: 'TRAP', triggered: true }]));
  });

  it('skips non-trap obstacles', () => {
    assert.ok(!checkTrap([4, 4], [{ x: 4, y: 4, type: 'WALL', triggered: false }]));
  });
});

describe('checkAll', () => {
  function makeState(overrides = {}) {
    const size = 20;
    const cells = Array.from({ length: size }, () => new Array(size).fill(0));
    // border walls
    for (let i = 0; i < size; i++) { cells[0][i] = 1; cells[size-1][i] = 1; cells[i][0] = 1; cells[i][size-1] = 1; }
    return {
      players: new Map([
        ['p0', { alive: true, body: [[5, 5]], direction: 'RIGHT' }],
        ['p1', { alive: true, body: [[15, 15]], direction: 'LEFT' }],
      ]),
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

  it('detects wall collision', () => {
    const state = makeState();
    state.players.get('p0').body = [[0, 0]]; // wall cell
    const events = checkAll(state);
    assert.ok(events.some(e => e.type === 'wall' && e.playerId === 'p0'));
  });

  it('detects food collision', () => {
    const state = makeState();
    state.food = [{ x: 5, y: 5 }];
    const events = checkAll(state);
    assert.ok(events.some(e => e.type === 'food' && e.playerId === 'p0'));
  });

  it('detects snake-snake collision', () => {
    const state = makeState();
    state.players.get('p0').body = [[10, 10]];
    state.players.get('p1').body = [[10, 10], [10, 11]];
    const events = checkAll(state);
    assert.ok(events.some(e => e.type === 'snake'));
  });

  it('skips dead players', () => {
    const state = makeState();
    state.players.get('p0').alive = false;
    const events = checkAll(state);
    assert.ok(!events.some(e => e.playerId === 'p0'));
  });
});
