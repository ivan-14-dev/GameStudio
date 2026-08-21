import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import SnakeEventEngine from '../../../src/games/snake-arena/SnakeEventEngine.js';

describe('SnakeEventEngine', () => {
  describe('constructor', () => {
    it('initializes with empty active events', () => {
      const engine = new SnakeEventEngine(42);
      assert.deepEqual(engine.activeEvents, []);
      assert.deepEqual(engine.eventHistory, []);
    });

    it('sets next event tick in future', () => {
      const engine = new SnakeEventEngine(42);
      assert.ok(engine.nextEventTick >= 200);
    });
  });

  describe('startEvent', () => {
    it('creates event with correct fields', () => {
      const engine = new SnakeEventEngine(42);
      const ev = engine.startEvent('FOOD_RUSH', { level: 10 }, 100);
      assert.ok(ev);
      assert.equal(ev.type, 'FOOD_RUSH');
      assert.equal(ev.startTick, 100);
      assert.ok(ev.endTick > 100);
      assert.ok(ev.id.includes('FOOD_RUSH'));
    });

    it('adds event to activeEvents', () => {
      const engine = new SnakeEventEngine(42);
      engine.startEvent('FOOD_RUSH', { level: 10 }, 100);
      assert.equal(engine.activeEvents.length, 1);
    });

    it('returns null for unknown event type', () => {
      const engine = new SnakeEventEngine(42);
      assert.equal(engine.startEvent('NONEXISTENT', {}, 0), null);
    });
  });

  describe('endEvent', () => {
    it('removes event from active and adds to history', () => {
      const engine = new SnakeEventEngine(42);
      const ev = engine.startEvent('FOOD_RUSH', { level: 10 }, 100);
      engine.endEvent(ev);
      assert.equal(engine.activeEvents.length, 0);
      assert.equal(engine.eventHistory.length, 1);
    });
  });

  describe('getActiveEvents', () => {
    it('returns active events array', () => {
      const engine = new SnakeEventEngine(42);
      engine.startEvent('FOOD_RUSH', { level: 10 }, 100);
      assert.equal(engine.getActiveEvents().length, 1);
    });
  });

  describe('update', () => {
    it('ends expired events', () => {
      const engine = new SnakeEventEngine(42);
      const ev = engine.startEvent('FOOD_RUSH', { level: 10 }, 100);
      const result = engine.update({ level: 10 }, ev.endTick + 1);
      assert.ok(result.some(r => r.action === 'end'));
      assert.equal(engine.activeEvents.length, 0);
    });

    it('keeps active events that have not expired', () => {
      const engine = new SnakeEventEngine(42);
      engine.startEvent('FOOD_RUSH', { level: 10 }, 100);
      engine.update({ level: 10 }, 101);
      assert.equal(engine.activeEvents.length, 1);
    });

    it('triggers new event when conditions met', () => {
      const engine = new SnakeEventEngine(42);
      engine.nextEventTick = 50; // force trigger
      const result = engine.update({ level: 10 }, 50);
      assert.ok(result.some(r => r.action === 'start'));
    });

    it('does not trigger when active event exists', () => {
      const engine = new SnakeEventEngine(42);
      engine.nextEventTick = 50;
      engine.startEvent('FOOD_RUSH', { level: 10 }, 10);
      const result = engine.update({ level: 10 }, 50);
      assert.ok(!result.some(r => r.action === 'start'));
    });

    it('does not trigger events at level below minimum', () => {
      const engine = new SnakeEventEngine(42);
      engine.nextEventTick = 50;
      // Level 1 has no eligible events (all require minLevel >= 6)
      const result = engine.update({ level: 1 }, 50);
      assert.ok(!result.some(r => r.action === 'start'));
    });
  });

  describe('_pickEvent', () => {
    it('returns null for level 1 (no eligible events)', () => {
      const engine = new SnakeEventEngine(42);
      assert.equal(engine._pickEvent(1), null);
    });

    it('returns a valid event type for level 10', () => {
      const engine = new SnakeEventEngine(42);
      const type = engine._pickEvent(10);
      assert.ok(type);
      assert.ok(['FOOD_RUSH', 'GOLDEN_FOOD', 'PORTAL_SHIFT', 'SPEED_WAVE'].includes(type));
    });

    it('has more eligible events at higher levels', () => {
      const engine = new SnakeEventEngine(42);
      // At level 30, all events should be eligible
      const types = new Set();
      for (let i = 0; i < 50; i++) {
        const t = new SnakeEventEngine(i)._pickEvent(30);
        if (t) types.add(t);
      }
      assert.ok(types.size >= 5, `Expected many event types, got ${types.size}`);
    });
  });
});
