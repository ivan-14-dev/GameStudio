import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScoreEngine } from '../../src/core/ScoreEngine.js';

describe('ScoreEngine', () => {
  const engine = new ScoreEngine();

  it('returns raw score with no bonuses', () => {
    assert.equal(engine.calculate(100), 100);
  });

  it('applies speed bonus up to 50%', () => {
    const s = engine.calculate(100, { speed: 1 });
    assert.equal(s, 150);
  });

  it('caps speed bonus at 1', () => {
    const s = engine.calculate(100, { speed: 5 });
    assert.equal(s, 150);
  });

  it('applies combo bonus', () => {
    const s = engine.calculate(100, { combo: 3 });
    assert.equal(s, 130);
  });

  it('caps combo bonus at 100%', () => {
    const s = engine.calculate(100, { combo: 20 });
    assert.equal(s, 200);
  });

  it('applies perfect bonus', () => {
    const s = engine.calculate(100, { perfect: true });
    assert.equal(s, 125);
  });

  it('applies difficulty multiplier', () => {
    const s = engine.calculate(100, { difficulty: 20 });
    assert.equal(s, 200);
  });

  it('never returns negative', () => {
    assert.equal(engine.calculate(-100), 0);
  });

  it('calculates XP from result', () => {
    const xp = engine.calculateXP({ won: true, score: 500, difficulty: 5, playerCount: 4 });
    assert.ok(xp >= 35);
  });

  it('minimum XP is 1', () => {
    const xp = engine.calculateXP({ won: false, score: 0, difficulty: 0, playerCount: 2 });
    assert.ok(xp >= 1);
  });
});
