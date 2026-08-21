import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import PongGame from '../../src/games/pong/PongGame.js';

const cfg = (n = 2) => ({
  difficulty: { level: 1, speed: 3 },
  playerCount: n,
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
});

describe('PongGame', () => {
  it('metadata', () => {
    const m = PongGame.getMetadata();
    assert.equal(m.id, 'pong');
    assert.equal(m.tickRate, 60);
    assert.equal(m.maxPlayers, 4);
  });

  it('creates 2-player state with left/right paddles', () => {
    const state = PongGame.createState(cfg(2));
    assert.equal(state.paddles.p0.side, 'left');
    assert.equal(state.paddles.p1.side, 'right');
    assert.ok(state.ball);
  });

  it('creates 4-player state with top/bottom paddles', () => {
    const state = PongGame.createState(cfg(4));
    assert.equal(state.paddles.p2.side, 'top');
    assert.equal(state.paddles.p3.side, 'bottom');
  });

  it('validates vertical paddle moves', () => {
    const state = PongGame.createState(cfg(2));
    assert.equal(PongGame.validateAction(state, { move: 'up' }, { id: 'p0' }), true);
    assert.equal(PongGame.validateAction(state, { move: 'down' }, { id: 'p0' }), true);
    assert.notEqual(PongGame.validateAction(state, { move: 'left' }, { id: 'p0' }), true);
  });

  it('validates horizontal paddle moves', () => {
    const state = PongGame.createState(cfg(4));
    assert.equal(PongGame.validateAction(state, { move: 'left' }, { id: 'p2' }), true);
    assert.equal(PongGame.validateAction(state, { move: 'right' }, { id: 'p2' }), true);
    assert.notEqual(PongGame.validateAction(state, { move: 'up' }, { id: 'p2' }), true);
  });

  it('applies paddle movement', () => {
    const state = PongGame.createState(cfg(2));
    const y0 = state.paddles.p0.y;
    PongGame.applyAction(state, { move: 'up' }, { id: 'p0' });
    assert.ok(state.paddles.p0.y < y0);
  });

  it('paddle stays in bounds', () => {
    const state = PongGame.createState(cfg(2));
    state.paddles.p0.y = 0;
    PongGame.applyAction(state, { move: 'up' }, { id: 'p0' });
    assert.ok(state.paddles.p0.y >= 0);
  });

  it('tick moves ball', () => {
    const state = PongGame.createState(cfg(2));
    const x0 = state.ball.x;
    state.tickCount = 0;
    PongGame.tick(state);
    assert.notEqual(state.ball.x, x0);
  });

  it('scoring gives point to opposite side', () => {
    const state = PongGame.createState(cfg(2));
    state.ball.x = -10;
    state.ball.vx = -1;
    state.ball.vy = 0;
    state.tickCount = 0;
    const result = PongGame.tick(state);
    // Ball exited left, point goes to right side player
    assert.ok(result);
    assert.equal(state.scores.p1, 1);
  });

  it('game ends at maxScore', () => {
    const state = PongGame.createState(cfg(2));
    state.scores.p0 = state.maxScore;
    const end = PongGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('network throttling skips ticks', () => {
    const state = PongGame.createState(cfg(2));
    state.tickCount = 1;
    state.ball.x = 400;
    state.ball.y = 300;
    const result = PongGame.tick(state);
    // tickCount 2 is not divisible by 3, should return null
    assert.equal(result, null);
  });

  it('serializeState includes all fields', () => {
    const state = PongGame.createState(cfg(2));
    const s = PongGame.serializeState(state);
    assert.ok(s.paddles);
    assert.ok(s.ball);
    assert.ok(s.scores);
  });

  it('handlePlayerLeave removes paddle', () => {
    const state = PongGame.createState(cfg(2));
    PongGame.handlePlayerLeave(state, { id: 'p0' });
    assert.equal(state.paddles.p0, undefined);
  });
});
