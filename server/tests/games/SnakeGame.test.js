import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import SnakeGame from '../../src/games/snake/SnakeGame.js';

const cfg = (n = 2) => ({
  difficulty: { boardSize: 20, speed: 5, obstacleCount: 0 },
  playerCount: n,
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
});

describe('SnakeGame', () => {
  it('metadata is correct', () => {
    const m = SnakeGame.getMetadata();
    assert.equal(m.id, 'snake');
    assert.equal(m.tickRate, 10);
    assert.equal(m.minPlayers, 2);
    assert.equal(m.maxPlayers, 4);
  });

  it('creates state with correct snakes', () => {
    const state = SnakeGame.createState(cfg());
    assert.ok(state.snakes.p0);
    assert.ok(state.snakes.p1);
    assert.ok(state.snakes.p0.alive);
    assert.equal(state.snakes.p0.body.length, 1);
    assert.ok(state.food);
    assert.equal(state.size, 20);
  });

  it('validates direction', () => {
    const state = SnakeGame.createState(cfg());
    assert.equal(SnakeGame.validateAction(state, { direction: 'UP' }, { id: 'p0' }), true);
    assert.notEqual(SnakeGame.validateAction(state, {}, { id: 'p0' }), true);
    assert.notEqual(SnakeGame.validateAction(state, { direction: 'INVALID' }, { id: 'p0' }), true);
  });

  it('rejects reverse direction', () => {
    const state = SnakeGame.createState(cfg());
    state.snakes.p0.direction = 'RIGHT';
    const r = SnakeGame.validateAction(state, { direction: 'LEFT' }, { id: 'p0' });
    assert.notEqual(r, true);
  });

  it('rejects dead snake action', () => {
    const state = SnakeGame.createState(cfg());
    state.snakes.p0.alive = false;
    const r = SnakeGame.validateAction(state, { direction: 'UP' }, { id: 'p0' });
    assert.notEqual(r, true);
  });

  it('applies direction change', () => {
    const state = SnakeGame.createState(cfg());
    SnakeGame.applyAction(state, { direction: 'UP' }, { id: 'p0' });
    assert.equal(state.snakes.p0.direction, 'UP');
  });

  it('tick moves snakes', () => {
    const state = SnakeGame.createState(cfg());
    state.snakes.p0.body = [[5, 5]];
    state.snakes.p0.direction = 'RIGHT';
    state.snakes.p1.body = [[15, 15]];
    state.snakes.p1.direction = 'LEFT';
    state.food = [99, 99];
    const result = SnakeGame.tick(state);
    assert.ok(result);
    assert.equal(state.snakes.p0.body[0][0], 6);
    assert.equal(state.snakes.p0.body[0][1], 5);
  });

  it('wall collision kills snake', () => {
    const state = SnakeGame.createState(cfg());
    state.snakes.p0.body = [[0, 0]];
    state.snakes.p0.direction = 'LEFT';
    state.snakes.p1.body = [[15, 15]];
    SnakeGame.tick(state);
    assert.equal(state.snakes.p0.alive, false);
  });

  it('eating food grows snake and scores', () => {
    const state = SnakeGame.createState(cfg());
    state.snakes.p0.body = [[5, 5]];
    state.snakes.p0.direction = 'RIGHT';
    state.snakes.p1.body = [[15, 15]];
    state.food = [6, 5];
    const result = SnakeGame.tick(state);
    assert.equal(state.snakes.p0.body.length, 2);
    assert.equal(state.snakes.p0.score, 10);
    assert.ok(result.events.some(e => e.type === 'eat'));
  });

  it('game ends when <= 1 alive', () => {
    const state = SnakeGame.createState(cfg());
    state.snakes.p0.alive = false;
    const end = SnakeGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p1');
  });

  it('handlePlayerLeave kills snake', () => {
    const state = SnakeGame.createState(cfg());
    SnakeGame.handlePlayerLeave(state, { id: 'p0' });
    assert.equal(state.snakes.p0.alive, false);
  });

  it('serializeState returns clean state', () => {
    const state = SnakeGame.createState(cfg());
    const s = SnakeGame.serializeState(state);
    assert.ok(s.snakes);
    assert.ok(s.food);
    assert.equal(s.size, 20);
  });

  it('supports 4 players', () => {
    const state = SnakeGame.createState(cfg(4));
    assert.equal(Object.keys(state.snakes).length, 4);
  });

  it('getDifficulty returns config object', () => {
    const d = SnakeGame.getDifficulty();
    assert.ok(d.speed);
    assert.ok(d.boardSize);
  });
});
