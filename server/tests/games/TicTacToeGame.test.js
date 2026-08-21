import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import TicTacToeGame from '../../src/games/tictactoe/TicTacToeGame.js';

const cfg = () => ({
  difficulty: { level: 1, timeLimit: 30 },
  playerCount: 2,
  players: [{ id: 'p0', name: 'X' }, { id: 'p1', name: 'O' }],
});

describe('TicTacToeGame', () => {
  it('metadata', () => {
    const m = TicTacToeGame.getMetadata();
    assert.equal(m.id, 'tictactoe');
    assert.equal(m.tickRate, 0);
  });

  it('creates 3x3 board', () => {
    const state = TicTacToeGame.createState(cfg());
    assert.equal(state.size, 3);
    assert.equal(state.board.length, 3);
    assert.equal(state.board[0].length, 3);
  });

  it('validates correct turn', () => {
    const state = TicTacToeGame.createState(cfg());
    assert.equal(TicTacToeGame.validateAction(state, { row: 0, col: 0 }, { id: 'p0' }), true);
    assert.notEqual(TicTacToeGame.validateAction(state, { row: 0, col: 0 }, { id: 'p1' }), true);
  });

  it('rejects occupied cell', () => {
    const state = TicTacToeGame.createState(cfg());
    TicTacToeGame.applyAction(state, { row: 0, col: 0 }, { id: 'p0' });
    assert.notEqual(TicTacToeGame.validateAction(state, { row: 0, col: 0 }, { id: 'p1' }), true);
  });

  it('rejects out of bounds', () => {
    const state = TicTacToeGame.createState(cfg());
    assert.notEqual(TicTacToeGame.validateAction(state, { row: 5, col: 0 }, { id: 'p0' }), true);
    assert.notEqual(TicTacToeGame.validateAction(state, { row: -1, col: 0 }, { id: 'p0' }), true);
  });

  it('places symbol and advances turn', () => {
    const state = TicTacToeGame.createState(cfg());
    TicTacToeGame.applyAction(state, { row: 0, col: 0 }, { id: 'p0' });
    assert.equal(state.board[0][0], 'X');
    assert.equal(state.currentTurn, 1);
  });

  it('detects horizontal win', () => {
    const state = TicTacToeGame.createState(cfg());
    // p0 plays row 0: [0,0], [0,1], [0,2]
    TicTacToeGame.applyAction(state, { row: 0, col: 0 }, { id: 'p0' });
    TicTacToeGame.applyAction(state, { row: 1, col: 0 }, { id: 'p1' });
    TicTacToeGame.applyAction(state, { row: 0, col: 1 }, { id: 'p0' });
    TicTacToeGame.applyAction(state, { row: 1, col: 1 }, { id: 'p1' });
    TicTacToeGame.applyAction(state, { row: 0, col: 2 }, { id: 'p0' });

    const end = TicTacToeGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
    assert.ok(state.winLine);
    assert.equal(state.winLine.length, 3);
  });

  it('detects diagonal win', () => {
    const state = TicTacToeGame.createState(cfg());
    TicTacToeGame.applyAction(state, { row: 0, col: 0 }, { id: 'p0' });
    TicTacToeGame.applyAction(state, { row: 0, col: 1 }, { id: 'p1' });
    TicTacToeGame.applyAction(state, { row: 1, col: 1 }, { id: 'p0' });
    TicTacToeGame.applyAction(state, { row: 0, col: 2 }, { id: 'p1' });
    TicTacToeGame.applyAction(state, { row: 2, col: 2 }, { id: 'p0' });

    const end = TicTacToeGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('detects draw', () => {
    const state = TicTacToeGame.createState(cfg());
    // Fill board with no winner: X O X / X X O / O X O
    const moves = [
      [0,0,'p0'], [0,1,'p1'], [0,2,'p0'],
      [1,0,'p0'], [1,1,'p0'], [1,2,'p1'],
      [2,0,'p1'], [2,1,'p0'], [2,2,'p1'],
    ];
    for (const [r, c, pid] of moves) {
      state.board[r][c] = state.playerSymbols[pid];
      state.moves++;
    }
    const end = TicTacToeGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, null);
  });

  it('serializeState includes winLine and timeLimit', () => {
    const state = TicTacToeGame.createState(cfg());
    const s = TicTacToeGame.serializeState(state);
    assert.ok('winLine' in s);
    assert.ok('timeLimit' in s);
  });

  it('handlePlayerLeave auto-wins remaining player', () => {
    const state = TicTacToeGame.createState(cfg());
    TicTacToeGame.handlePlayerLeave(state, { id: 'p0' });
    assert.equal(state.winner, 'p1');
  });
});
