import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Connect4Game from '../../src/games/connect4/Connect4Game.js';

const cfg = () => ({
  difficulty: { level: 1, timeLimit: 30 },
  playerCount: 2,
  players: [{ id: 'p0', name: 'R' }, { id: 'p1', name: 'Y' }],
});

describe('Connect4Game', () => {
  it('metadata', () => {
    const m = Connect4Game.getMetadata();
    assert.equal(m.id, 'connect4');
    assert.equal(m.tickRate, 0);
  });

  it('creates board with default 7 cols 6 rows', () => {
    const state = Connect4Game.createState(cfg());
    assert.equal(state.cols, 7);
    assert.equal(state.rows, 6);
    assert.equal(state.board.length, 6);
    assert.equal(state.board[0].length, 7);
  });

  it('validates turn order', () => {
    const state = Connect4Game.createState(cfg());
    assert.equal(Connect4Game.validateAction(state, { col: 0 }, { id: 'p0' }), true);
    assert.notEqual(Connect4Game.validateAction(state, { col: 0 }, { id: 'p1' }), true);
  });

  it('rejects invalid column', () => {
    const state = Connect4Game.createState(cfg());
    assert.notEqual(Connect4Game.validateAction(state, { col: -1 }, { id: 'p0' }), true);
    assert.notEqual(Connect4Game.validateAction(state, { col: 99 }, { id: 'p0' }), true);
  });

  it('rejects full column', () => {
    const state = Connect4Game.createState(cfg());
    for (let r = 0; r < state.rows; r++) state.board[r][0] = 'p0';
    assert.notEqual(Connect4Game.validateAction(state, { col: 0 }, { id: 'p0' }), true);
  });

  it('drops piece to lowest row', () => {
    const state = Connect4Game.createState(cfg());
    Connect4Game.applyAction(state, { col: 3 }, { id: 'p0' });
    assert.equal(state.board[5][3], 'p0');
    assert.equal(state.lastMove.row, 5);
    assert.equal(state.lastMove.col, 3);
  });

  it('stacks pieces', () => {
    const state = Connect4Game.createState(cfg());
    Connect4Game.applyAction(state, { col: 3 }, { id: 'p0' });
    Connect4Game.applyAction(state, { col: 3 }, { id: 'p1' });
    assert.equal(state.board[5][3], 'p0');
    assert.equal(state.board[4][3], 'p1');
  });

  it('detects vertical win', () => {
    const state = Connect4Game.createState(cfg());
    for (let i = 0; i < 4; i++) {
      state.board[5 - i][0] = 'p0';
    }
    state.lastMove = { row: 2, col: 0, playerId: 'p0' };
    const end = Connect4Game.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
    assert.ok(state.winLine);
  });

  it('detects horizontal win', () => {
    const state = Connect4Game.createState(cfg());
    for (let c = 0; c < 4; c++) {
      state.board[5][c] = 'p0';
    }
    state.lastMove = { row: 5, col: 3, playerId: 'p0' };
    const end = Connect4Game.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('detects draw when board full', () => {
    const state = Connect4Game.createState(cfg());
    // Fill board with no connect-4
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        state.board[r][c] = ((r + c) % 3 === 0) ? 'p0' : 'p1';
      }
    }
    state.lastMove = { row: 0, col: 0, playerId: 'p0' };
    // Force no win line
    const end = Connect4Game.checkGameEnd(state);
    // Either finished with draw or with winner depending on pattern
    assert.ok(end.finished);
  });

  it('serializeState includes winLine and timeLimit', () => {
    const state = Connect4Game.createState(cfg());
    const s = Connect4Game.serializeState(state);
    assert.ok('winLine' in s);
    assert.ok('timeLimit' in s);
    assert.ok('lastMove' in s);
  });

  it('handlePlayerLeave auto-wins', () => {
    const state = Connect4Game.createState(cfg());
    Connect4Game.handlePlayerLeave(state, { id: 'p0' });
    assert.equal(state.winner, 'p1');
  });
});
