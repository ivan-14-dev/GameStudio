import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import RPSGame from '../../src/games/rps/RPSGame.js';

const cfg = () => ({
  difficulty: { level: 1 },
  playerCount: 2,
  players: [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }],
});

describe('RPSGame', () => {
  it('metadata', () => {
    const m = RPSGame.getMetadata();
    assert.equal(m.id, 'rps');
    assert.equal(m.maxPlayers, 8);
  });

  it('creates state with rounds and scores', () => {
    const state = RPSGame.createState(cfg());
    assert.ok(state.rounds >= 3);
    assert.equal(state.scores.p0, 0);
    assert.equal(state.scores.p1, 0);
    assert.equal(state.currentRound, 0);
  });

  it('validates choice', () => {
    const state = RPSGame.createState(cfg());
    assert.equal(RPSGame.validateAction(state, { choice: 'rock' }, { id: 'p0' }), true);
    assert.notEqual(RPSGame.validateAction(state, { choice: 'banana' }, { id: 'p0' }), true);
    assert.notEqual(RPSGame.validateAction(state, {}, { id: 'p0' }), true);
  });

  it('rejects double choice', () => {
    const state = RPSGame.createState(cfg());
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
    assert.notEqual(RPSGame.validateAction(state, { choice: 'paper' }, { id: 'p0' }), true);
  });

  it('first player waits, resolves on second', () => {
    const state = RPSGame.createState(cfg());
    const r1 = RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
    assert.ok(r1.waiting);
    assert.equal(r1.answeredCount, 1);

    const r2 = RPSGame.applyAction(state, { choice: 'scissors' }, { id: 'p1' });
    assert.ok(r2.roundResult);
    assert.equal(state.currentRound, 1);
    assert.ok(state.scores.p0 > 0);
  });

  it('rock beats scissors', () => {
    const state = RPSGame.createState(cfg());
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
    RPSGame.applyAction(state, { choice: 'scissors' }, { id: 'p1' });
    assert.ok(state.scores.p0 > 0);
    assert.equal(state.scores.p1, 0);
  });

  it('scissors beats paper', () => {
    const state = RPSGame.createState(cfg());
    RPSGame.applyAction(state, { choice: 'scissors' }, { id: 'p0' });
    RPSGame.applyAction(state, { choice: 'paper' }, { id: 'p1' });
    assert.ok(state.scores.p0 > 0);
  });

  it('paper beats rock', () => {
    const state = RPSGame.createState(cfg());
    RPSGame.applyAction(state, { choice: 'paper' }, { id: 'p0' });
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p1' });
    assert.ok(state.scores.p0 > 0);
  });

  it('draw gives no points', () => {
    const state = RPSGame.createState(cfg());
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p1' });
    assert.equal(state.scores.p0, 0);
    assert.equal(state.scores.p1, 0);
  });

  it('game ends after all rounds', () => {
    const state = RPSGame.createState(cfg());
    state.rounds = 1;
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
    RPSGame.applyAction(state, { choice: 'scissors' }, { id: 'p1' });
    const end = RPSGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('combo bonus after 3 consecutive wins', () => {
    const state = RPSGame.createState(cfg());
    state.rounds = 5;
    for (let i = 0; i < 3; i++) {
      RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
      RPSGame.applyAction(state, { choice: 'scissors' }, { id: 'p1' });
    }
    assert.ok(state.scores.p0 > 3);
  });

  it('serializeState includes waitingFor', () => {
    const state = RPSGame.createState(cfg());
    RPSGame.applyAction(state, { choice: 'rock' }, { id: 'p0' });
    const s = RPSGame.serializeState(state);
    assert.ok(s.waitingFor.includes('p1'));
    assert.ok(!s.waitingFor.includes('p0'));
  });
});
