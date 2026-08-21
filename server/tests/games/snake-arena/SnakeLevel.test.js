import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLevelConfig, getFeaturesForLevel, getMapSizeForLevel, getDifficultyModifiers } from '../../../src/games/snake-arena/SnakeLevel.js';

describe('getMapSizeForLevel', () => {
  it('level 1-5 returns SMALL (50)', () => {
    assert.equal(getMapSizeForLevel(1), 50);
    assert.equal(getMapSizeForLevel(5), 50);
  });

  it('level 6-15 returns MEDIUM (100)', () => {
    assert.equal(getMapSizeForLevel(6), 100);
    assert.equal(getMapSizeForLevel(15), 100);
  });

  it('level 16-30 returns LARGE (150)', () => {
    assert.equal(getMapSizeForLevel(16), 150);
    assert.equal(getMapSizeForLevel(30), 150);
  });

  it('level 31+ returns HUGE (200)', () => {
    assert.equal(getMapSizeForLevel(31), 200);
    assert.equal(getMapSizeForLevel(50), 200);
  });
});

describe('getFeaturesForLevel', () => {
  it('level 1 has tutorial features', () => {
    const f = getFeaturesForLevel(1);
    assert.ok(f.includes('basic_movement'));
    assert.ok(f.includes('food'));
  });

  it('features accumulate with level', () => {
    const low = getFeaturesForLevel(1);
    const high = getFeaturesForLevel(20);
    assert.ok(high.length > low.length);
  });

  it('level 11+ has portals and secrets', () => {
    const f = getFeaturesForLevel(11);
    assert.ok(f.includes('portals'));
    assert.ok(f.includes('secrets'));
  });

  it('level 21+ has powerups and events', () => {
    const f = getFeaturesForLevel(21);
    assert.ok(f.includes('powerups'));
    assert.ok(f.includes('events'));
  });
});

describe('getLevelConfig', () => {
  it('returns complete config object', () => {
    const config = getLevelConfig(10);
    assert.ok('mapSize' in config);
    assert.ok('features' in config);
    assert.ok('foodDensity' in config);
    assert.ok('obstacleTypes' in config);
    assert.ok('eventFrequency' in config);
    assert.ok('fogRadius' in config);
    assert.ok('minimapDetail' in config);
    assert.ok('tierName' in config);
  });

  it('tier name matches level', () => {
    assert.equal(getLevelConfig(1).tierName, 'Tutorial');
    assert.equal(getLevelConfig(8).tierName, 'Explorer');
    assert.equal(getLevelConfig(13).tierName, 'Pathfinder');
    assert.equal(getLevelConfig(18).tierName, 'Survivor');
  });

  it('fog radius is Infinity below level 26', () => {
    assert.equal(getLevelConfig(10).fogRadius, Infinity);
    assert.equal(getLevelConfig(25).fogRadius, Infinity);
  });

  it('fog radius is finite at level 26+', () => {
    assert.ok(getLevelConfig(26).fogRadius < Infinity);
  });

  it('minimap detail varies by level', () => {
    assert.equal(getLevelConfig(3).minimapDetail, 'none');
    assert.equal(getLevelConfig(10).minimapDetail, 'full');
    assert.equal(getLevelConfig(20).minimapDetail, 'partial');
    assert.equal(getLevelConfig(28).minimapDetail, 'minimal');
  });

  it('obstacle types increase with level', () => {
    const low = getLevelConfig(1).obstacleTypes;
    const high = getLevelConfig(25).obstacleTypes;
    assert.ok(high.length > low.length);
  });
});

describe('getDifficultyModifiers', () => {
  it('level 1 has base values', () => {
    const mods = getDifficultyModifiers(1);
    assert.equal(mods.speedMultiplier, 1);
    assert.equal(mods.foodSpawnRate, 1);
  });

  it('higher level has higher speed multiplier', () => {
    const low = getDifficultyModifiers(1);
    const high = getDifficultyModifiers(20);
    assert.ok(high.speedMultiplier > low.speedMultiplier);
  });

  it('higher level has lower food spawn rate', () => {
    const low = getDifficultyModifiers(1);
    const high = getDifficultyModifiers(20);
    assert.ok(high.foodSpawnRate < low.foodSpawnRate);
  });

  it('food spawn rate has minimum floor', () => {
    const mods = getDifficultyModifiers(100);
    assert.ok(mods.foodSpawnRate >= 0.5);
  });

  it('event cooldown has minimum floor', () => {
    const mods = getDifficultyModifiers(100);
    assert.ok(mods.eventCooldownMod >= 0.3);
  });
});
