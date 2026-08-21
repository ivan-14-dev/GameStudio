import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressionEngine } from '../../src/core/ProgressionEngine.js';

describe('ProgressionEngine', () => {
  const engine = new ProgressionEngine();

  it('xpForLevel increases with level', () => {
    const xp2 = engine.xpForLevel(2);
    const xp10 = engine.xpForLevel(10);
    assert.ok(xp10 > xp2);
  });

  it('addXP grants global and game XP', () => {
    const profile = { totalXP: 0, level: 1, gameLevels: {} };
    engine.addXP(profile, 'snake', 50);
    assert.equal(profile.totalXP, 50);
    assert.equal(profile.gameLevels.snake.xp, 50);
  });

  it('levels up when enough XP', () => {
    const profile = { totalXP: 0, level: 1, gameLevels: {} };
    const ups = engine.addXP(profile, 'snake', 99999);
    assert.ok(profile.level > 1);
    assert.ok(ups.length > 0);
    assert.ok(ups.some(u => u.type === 'global'));
  });

  it('getProgress returns 0-1 progress', () => {
    const profile = { totalXP: 50, level: 1 };
    const p = engine.getProgress(profile);
    assert.equal(p.level, 1);
    assert.ok(p.progress >= 0 && p.progress <= 1);
    assert.ok(p.needed > 0);
  });

  it('recordResult tracks wins and streaks', () => {
    const profile = { stats: {} };
    engine.recordResult(profile, 'snake', { won: true, score: 100 });
    assert.equal(profile.stats.gamesPlayed, 1);
    assert.equal(profile.stats.wins, 1);
    assert.equal(profile.stats.winStreak, 1);

    engine.recordResult(profile, 'snake', { won: false, score: 50 });
    assert.equal(profile.stats.gamesPlayed, 2);
    assert.equal(profile.stats.winStreak, 0);
    assert.equal(profile.stats.bestWinStreak, 1);
  });

  it('tracks best score', () => {
    const profile = { stats: {} };
    engine.recordResult(profile, 'test', { won: false, score: 200 });
    engine.recordResult(profile, 'test', { won: false, score: 100 });
    assert.equal(profile.stats.bestScore, 200);
  });
});
