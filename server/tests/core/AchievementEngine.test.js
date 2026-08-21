import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AchievementEngine } from '../../src/core/AchievementEngine.js';

describe('AchievementEngine', () => {
  it('has default achievements', () => {
    const engine = new AchievementEngine();
    const all = engine.getAll();
    assert.ok(all.length >= 4);
    assert.ok(all.some(a => a.id === 'FIRST_WIN'));
  });

  it('unlocks FIRST_WIN on 1 win', () => {
    const engine = new AchievementEngine();
    const profile = { stats: { wins: 1 }, achievements: [] };
    const unlocked = engine.evaluate(profile);
    assert.ok(unlocked.some(a => a.id === 'FIRST_WIN'));
    assert.ok(profile.achievements.includes('FIRST_WIN'));
  });

  it('does not re-unlock already earned', () => {
    const engine = new AchievementEngine();
    const profile = { stats: { wins: 5 }, achievements: ['FIRST_WIN'] };
    const unlocked = engine.evaluate(profile);
    assert.ok(!unlocked.some(a => a.id === 'FIRST_WIN'));
  });

  it('get returns a single achievement', () => {
    const engine = new AchievementEngine();
    const a = engine.get('FIRST_WIN');
    assert.ok(a);
    assert.equal(a.id, 'FIRST_WIN');
    assert.ok(a.icon);
  });

  it('get returns null for unknown', () => {
    const engine = new AchievementEngine();
    assert.equal(engine.get('UNKNOWN'), null);
  });

  it('define adds custom achievements', () => {
    const engine = new AchievementEngine();
    engine.define('CUSTOM', { name: 'Test', check: () => true, icon: '🧪' });
    const profile = { achievements: [] };
    const u = engine.evaluate(profile);
    assert.ok(u.some(a => a.id === 'CUSTOM'));
  });
});
