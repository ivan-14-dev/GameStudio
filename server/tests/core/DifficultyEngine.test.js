import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DifficultyEngine } from '../../src/core/DifficultyEngine.js';

describe('DifficultyEngine', () => {
  it('returns default curve when no game registered', () => {
    const engine = new DifficultyEngine();
    const d = engine.get('unknown', 1);
    assert.equal(d.level, 1);
    assert.ok('speed' in d);
    assert.ok('timeLimit' in d);
  });

  it('uses registered config', () => {
    const engine = new DifficultyEngine();
    engine.register('test', {
      speed: { min: 1, max: 10, curve: 'linear' },
    });
    const d1 = engine.get('test', 1);
    const d50 = engine.get('test', 50);
    assert.equal(d1.speed, 1);
    assert.equal(d50.speed, 10);
  });

  it('clamps level to valid range', () => {
    const engine = new DifficultyEngine();
    engine.register('test', {
      speed: { min: 1, max: 10, curve: 'linear' },
    });
    const low = engine.get('test', -5);
    assert.equal(low.level, 1);
  });

  it('supports ease-in curve', () => {
    const engine = new DifficultyEngine();
    engine.register('test', {
      speed: { min: 0, max: 100, curve: 'ease-in' },
    });
    const mid = engine.get('test', 25);
    // ease-in: t*t, at midpoint (24/49) ≈ 0.24, so speed should be < 50
    assert.ok(mid.speed < 50);
  });

  it('supports ease-out curve', () => {
    const engine = new DifficultyEngine();
    engine.register('test', {
      speed: { min: 0, max: 100, curve: 'ease-out' },
    });
    const mid = engine.get('test', 25);
    assert.ok(mid.speed > 50);
  });

  it('supports step curve', () => {
    const engine = new DifficultyEngine();
    engine.register('test', {
      speed: { min: 0, max: 100, curve: 'step' },
    });
    const d = engine.get('test', 10);
    assert.ok(Number.isInteger(d.speed));
  });
});
