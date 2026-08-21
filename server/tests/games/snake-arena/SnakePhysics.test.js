import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { moveSnake, applyTerrain, getSpeedForPlayer, shouldMoveThisTick } from '../../../src/games/snake-arena/SnakePhysics.js';

describe('moveSnake', () => {
  it('returns new head position for UP', () => {
    const player = { body: [[5, 5], [5, 6]], direction: 'UP', alive: true };
    const state = { map: { cells: Array.from({ length: 20 }, () => new Array(20).fill(0)) }, mapSize: 20 };
    const newHead = moveSnake(player, state);
    assert.deepEqual(newHead, [5, 4]);
  });

  it('returns new head position for RIGHT', () => {
    const player = { body: [[5, 5], [4, 5]], direction: 'RIGHT', alive: true };
    const state = { map: { cells: Array.from({ length: 20 }, () => new Array(20).fill(0)) }, mapSize: 20 };
    const newHead = moveSnake(player, state);
    assert.deepEqual(newHead, [6, 5]);
  });

  it('returns new head position for DOWN', () => {
    const player = { body: [[5, 5], [5, 4]], direction: 'DOWN', alive: true };
    const state = { map: { cells: Array.from({ length: 20 }, () => new Array(20).fill(0)) }, mapSize: 20 };
    const newHead = moveSnake(player, state);
    assert.deepEqual(newHead, [5, 6]);
  });

  it('returns new head position for LEFT', () => {
    const player = { body: [[5, 5], [6, 5]], direction: 'LEFT', alive: true };
    const state = { map: { cells: Array.from({ length: 20 }, () => new Array(20).fill(0)) }, mapSize: 20 };
    const newHead = moveSnake(player, state);
    assert.deepEqual(newHead, [4, 5]);
  });

  it('returns current head for invalid direction', () => {
    const player = { body: [[5, 5]], direction: 'INVALID', alive: true };
    const state = { map: { cells: Array.from({ length: 20 }, () => new Array(20).fill(0)) }, mapSize: 20 };
    const newHead = moveSnake(player, state);
    assert.deepEqual(newHead, [5, 5]);
  });
});

describe('applyTerrain', () => {
  it('sets NORMAL terrain speed mod to 1', () => {
    const player = { _terrainSpeedMod: 1 };
    applyTerrain(player, 'NORMAL');
    assert.equal(player._terrainSpeedMod, 1.0);
  });

  it('sets ICE terrain speed mod to 1.5', () => {
    const player = { _terrainSpeedMod: 1 };
    applyTerrain(player, 'ICE');
    assert.equal(player._terrainSpeedMod, 1.5);
  });

  it('sets MUD terrain speed mod to 0.5', () => {
    const player = { _terrainSpeedMod: 1 };
    applyTerrain(player, 'MUD');
    assert.equal(player._terrainSpeedMod, 0.5);
  });

  it('sets BOOST terrain speed mod to 2.0', () => {
    const player = { _terrainSpeedMod: 1 };
    applyTerrain(player, 'BOOST');
    assert.equal(player._terrainSpeedMod, 2.0);
  });
});

describe('getSpeedForPlayer', () => {
  it('returns base speed for normal player', () => {
    const player = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: Array.from({ length: 5 }, (_, i) => [i, 0]),
    };
    const speed = getSpeedForPlayer(player);
    assert.ok(speed > 0);
  });

  it('longer snake is slower (>20 body)', () => {
    const short = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: Array.from({ length: 10 }, (_, i) => [i, 0]),
    };
    const long = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: Array.from({ length: 25 }, (_, i) => [i, 0]),
    };
    assert.ok(getSpeedForPlayer(long) < getSpeedForPlayer(short));
  });

  it('very long snake (>50) is even slower', () => {
    const medium = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: Array.from({ length: 25 }, (_, i) => [i, 0]),
    };
    const veryLong = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: Array.from({ length: 55 }, (_, i) => [i, 0]),
    };
    assert.ok(getSpeedForPlayer(veryLong) < getSpeedForPlayer(medium));
  });

  it('terrain modifier affects speed', () => {
    const base = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: [[0, 0]],
    };
    const boosted = {
      _terrainSpeedMod: 2.0,
      powerups: [],
      body: [[0, 0]],
    };
    assert.ok(getSpeedForPlayer(boosted) > getSpeedForPlayer(base));
  });
});

describe('shouldMoveThisTick', () => {
  it('returns boolean', () => {
    const player = {
      _terrainSpeedMod: 1.0,
      powerups: [],
      body: [[0, 0]],
    };
    const result = shouldMoveThisTick(player, 1);
    assert.equal(typeof result, 'boolean');
  });

  it('faster players move more frequently', () => {
    const fast = {
      _terrainSpeedMod: 2.0,
      powerups: [],
      body: [[0, 0]],
    };
    const slow = {
      _terrainSpeedMod: 0.5,
      powerups: [],
      body: [[0, 0]],
    };
    let fastMoves = 0, slowMoves = 0;
    for (let t = 0; t < 100; t++) {
      if (shouldMoveThisTick(fast, t)) fastMoves++;
      if (shouldMoveThisTick(slow, t)) slowMoves++;
    }
    assert.ok(fastMoves >= slowMoves, `fast=${fastMoves} should >= slow=${slowMoves}`);
  });
});
