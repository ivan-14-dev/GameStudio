import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import SnakeWorld from '../../../src/games/snake-arena/SnakeWorld.js';

describe('SnakeWorld', () => {
  describe('constructor', () => {
    it('creates grid of correct size', () => {
      const w = new SnakeWorld(20);
      assert.equal(w.mapSize, 20);
      assert.equal(w.grid.length, 20);
      assert.equal(w.grid[0].length, 20);
    });

    it('initializes all cells to 0', () => {
      const w = new SnakeWorld(10);
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          assert.equal(w.grid[y][x], 0);
        }
      }
    });
  });

  describe('getCellAt / setCellAt', () => {
    it('sets and gets cell value', () => {
      const w = new SnakeWorld(10);
      w.setCellAt(3, 4, 1);
      assert.equal(w.getCellAt(3, 4), 1);
    });

    it('returns -1 for out of bounds', () => {
      const w = new SnakeWorld(10);
      assert.equal(w.getCellAt(-1, 0), -1);
      assert.equal(w.getCellAt(10, 0), -1);
      assert.equal(w.getCellAt(0, -1), -1);
      assert.equal(w.getCellAt(0, 10), -1);
    });

    it('setCellAt ignores out of bounds', () => {
      const w = new SnakeWorld(10);
      w.setCellAt(-1, 0, 1); // should not throw
      assert.equal(w.getCellAt(0, 0), 0); // unaffected
    });
  });

  describe('isInBounds', () => {
    it('returns true for valid coordinates', () => {
      const w = new SnakeWorld(10);
      assert.ok(w.isInBounds(0, 0));
      assert.ok(w.isInBounds(9, 9));
      assert.ok(w.isInBounds(5, 5));
    });

    it('returns false for out of bounds', () => {
      const w = new SnakeWorld(10);
      assert.ok(!w.isInBounds(-1, 0));
      assert.ok(!w.isInBounds(10, 0));
      assert.ok(!w.isInBounds(0, 10));
    });
  });

  describe('terrain', () => {
    it('returns NORMAL by default', () => {
      const w = new SnakeWorld(10);
      assert.equal(w.getTerrainAt(5, 5), 'NORMAL');
    });

    it('sets and gets terrain type', () => {
      const w = new SnakeWorld(10);
      w.setTerrain(3, 4, 'ICE');
      assert.equal(w.getTerrainAt(3, 4), 'ICE');
    });
  });

  describe('entity management', () => {
    it('add and retrieve entity', () => {
      const w = new SnakeWorld(50);
      w.addEntity({ id: 'e1', x: 10, y: 10 });
      assert.ok(w.entities.has('e1'));
    });

    it('removeEntity clears entity', () => {
      const w = new SnakeWorld(50);
      w.addEntity({ id: 'e1', x: 10, y: 10 });
      w.removeEntity('e1');
      assert.ok(!w.entities.has('e1'));
    });

    it('removeEntity is no-op for unknown id', () => {
      const w = new SnakeWorld(50);
      w.removeEntity('nonexistent'); // should not throw
    });

    it('updateEntityPosition changes entity coords and spatial hash', () => {
      const w = new SnakeWorld(50);
      w.addEntity({ id: 'e1', x: 5, y: 5 });
      w.updateEntityPosition('e1', 30, 30);
      const e = w.entities.get('e1');
      assert.equal(e.x, 30);
      assert.equal(e.y, 30);
    });
  });

  describe('queryRect', () => {
    it('finds entities within rectangle', () => {
      const w = new SnakeWorld(100);
      w.addEntity({ id: 'a', x: 10, y: 10 });
      w.addEntity({ id: 'b', x: 50, y: 50 });
      w.addEntity({ id: 'c', x: 90, y: 90 });
      const results = w.queryRect(0, 0, 20, 20);
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'a');
    });

    it('returns empty for empty region', () => {
      const w = new SnakeWorld(100);
      w.addEntity({ id: 'a', x: 50, y: 50 });
      assert.deepEqual(w.queryRect(0, 0, 10, 10), []);
    });
  });

  describe('getEntitiesInRadius', () => {
    it('finds entities within radius', () => {
      const w = new SnakeWorld(100);
      w.addEntity({ id: 'close', x: 12, y: 10 });
      w.addEntity({ id: 'far', x: 90, y: 90 });
      const results = w.getEntitiesInRadius(10, 10, 5);
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'close');
    });

    it('returns empty when none in range', () => {
      const w = new SnakeWorld(100);
      w.addEntity({ id: 'a', x: 50, y: 50 });
      assert.deepEqual(w.getEntitiesInRadius(0, 0, 3), []);
    });
  });
});
