import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import SnakeMap from '../../../src/games/snake-arena/SnakeMap.js';

const { generate } = SnakeMap;

describe('SnakeMap.generate', () => {
  it('creates a map with cells grid of correct size', () => {
    const map = generate(12345, 50, 1);
    assert.equal(map.cells.length, 50);
    assert.equal(map.cells[0].length, 50);
  });

  it('has border walls', () => {
    const map = generate(42, 30, 1);
    for (let i = 0; i < 30; i++) {
      assert.equal(map.cells[0][i], 1, `top border at ${i}`);
      assert.equal(map.cells[29][i], 1, `bottom border at ${i}`);
      assert.equal(map.cells[i][0], 1, `left border at ${i}`);
      assert.equal(map.cells[i][29], 1, `right border at ${i}`);
    }
  });

  it('returns walls array', () => {
    const map = generate(42, 30, 1);
    assert.ok(Array.isArray(map.walls));
    assert.ok(map.walls.length > 0);
  });

  it('returns spawn points', () => {
    const map = generate(42, 50, 1);
    assert.ok(Array.isArray(map.spawns));
    assert.ok(map.spawns.length > 0);
    for (const sp of map.spawns) {
      assert.ok('x' in sp);
      assert.ok('y' in sp);
    }
  });

  it('spawn areas are clear', () => {
    const map = generate(42, 50, 1);
    for (const sp of map.spawns) {
      // The spawn point itself should be open
      assert.equal(map.cells[sp.y][sp.x], 0, `spawn at ${sp.x},${sp.y} should be clear`);
    }
  });

  it('level 1-5 has no portals or secrets', () => {
    const map = generate(42, 50, 3);
    assert.deepEqual(map.portals, []);
    assert.deepEqual(map.secrets, []);
  });

  it('level 11-15 generates portals', () => {
    const map = generate(42, 100, 13);
    assert.ok(map.portals.length > 0, 'should have portals at level 13');
  });

  it('level 11-15 generates secrets', () => {
    const map = generate(42, 100, 13);
    assert.ok(map.secrets.length > 0, 'should have secrets at level 13');
  });

  it('level 16+ generates terrain', () => {
    const map = generate(42, 100, 20);
    assert.ok(map.terrain instanceof Map);
    assert.ok(map.terrain.size > 0, 'should have terrain zones at level 20');
  });

  it('deterministic with same seed', () => {
    const a = generate(999, 50, 5);
    const b = generate(999, 50, 5);
    assert.deepEqual(a.cells, b.cells);
    assert.equal(a.walls.length, b.walls.length);
  });

  it('different seeds produce different maps', () => {
    const a = generate(111, 50, 5);
    const b = generate(222, 50, 5);
    // Walls might differ (border walls are same, but internal walls differ)
    const aInternal = a.walls.filter(w => w.x > 0 && w.x < 49 && w.y > 0 && w.y < 49);
    const bInternal = b.walls.filter(w => w.x > 0 && w.x < 49 && w.y > 0 && w.y < 49);
    // Very unlikely to be identical
    const aStr = JSON.stringify(aInternal.map(w => [w.x, w.y]).sort());
    const bStr = JSON.stringify(bInternal.map(w => [w.x, w.y]).sort());
    assert.notEqual(aStr, bStr);
  });
});
