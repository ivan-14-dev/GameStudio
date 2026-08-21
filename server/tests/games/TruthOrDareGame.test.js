import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import TruthOrDareGame from '../../src/games/truthordare/TruthOrDareGame.js';

const cfg = () => ({
  difficulty: { level: 1 },
  playerCount: 3,
  rounds: 3,
  players: [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }, { id: 'p2', name: 'C' }],
});

describe('TruthOrDareGame', () => {
  it('metadata', () => {
    const m = TruthOrDareGame.getMetadata();
    assert.equal(m.id, 'truthordare');
    assert.equal(m.maxPlayers, 12);
  });

  it('creates state with truths and dares', () => {
    const state = TruthOrDareGame.createState(cfg());
    assert.ok(state.truths.length >= 20);
    assert.ok(state.dares.length >= 15);
    assert.equal(state.rounds, 3);
    assert.equal(state.currentRound, 0);
  });

  it('validates choose on correct turn', () => {
    const state = TruthOrDareGame.createState(cfg());
    assert.equal(TruthOrDareGame.validateAction(state, { type: 'choose', choice: 'truth' }, { id: 'p0' }), true);
    assert.notEqual(TruthOrDareGame.validateAction(state, { type: 'choose', choice: 'truth' }, { id: 'p1' }), true);
  });

  it('rejects invalid choice', () => {
    const state = TruthOrDareGame.createState(cfg());
    assert.notEqual(TruthOrDareGame.validateAction(state, { type: 'choose', choice: 'banana' }, { id: 'p0' }), true);
  });

  it('mode TRUTH rejects dare choice', () => {
    const c = cfg();
    c.mode = 'TRUTH';
    const state = TruthOrDareGame.createState(c);
    assert.notEqual(TruthOrDareGame.validateAction(state, { type: 'choose', choice: 'dare' }, { id: 'p0' }), true);
  });

  it('choose returns a challenge', () => {
    const state = TruthOrDareGame.createState(cfg());
    const r = TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'truth' }, { id: 'p0' });
    assert.ok(r.challenge);
    assert.ok(r.challenge.text);
    assert.equal(r.challenge.choiceType, 'truth');
    assert.ok(state.currentChallenge);
  });

  it('done scores +10 and advances', () => {
    const state = TruthOrDareGame.createState(cfg());
    TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'truth' }, { id: 'p0' });
    const r = TruthOrDareGame.applyAction(state, { type: 'done' }, { id: 'p0' });
    assert.ok(r.completed);
    assert.equal(r.scoreChange, 10);
    assert.equal(state.scores.p0, 10);
    assert.equal(state.currentRound, 1);
    assert.equal(state.currentChallenge, null);
  });

  it('skip scores -5 and advances', () => {
    const state = TruthOrDareGame.createState(cfg());
    TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'dare' }, { id: 'p0' });
    const r = TruthOrDareGame.applyAction(state, { type: 'skip' }, { id: 'p0' });
    assert.ok(r.skipped);
    assert.equal(r.scoreChange, -5);
    assert.equal(state.scores.p0, -5);
  });

  it('vote works for non-active player', () => {
    const state = TruthOrDareGame.createState(cfg());
    TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'truth' }, { id: 'p0' });
    const r = TruthOrDareGame.applyAction(state, { type: 'vote', vote: 'yes' }, { id: 'p1' });
    assert.ok(r.voted);
    assert.equal(r.voteCount, 1);
    assert.equal(r.totalVoters, 2);
  });

  it('active player cannot vote for self', () => {
    const state = TruthOrDareGame.createState(cfg());
    TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'truth' }, { id: 'p0' });
    const v = TruthOrDareGame.validateAction(state, { type: 'vote' }, { id: 'p0' });
    assert.notEqual(v, true);
  });

  it('done clears votes', () => {
    const state = TruthOrDareGame.createState(cfg());
    TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'truth' }, { id: 'p0' });
    TruthOrDareGame.applyAction(state, { type: 'vote', vote: 'yes' }, { id: 'p1' });
    TruthOrDareGame.applyAction(state, { type: 'done' }, { id: 'p0' });
    assert.deepEqual(state.votes, {});
  });

  it('game ends after all rounds', () => {
    const state = TruthOrDareGame.createState(cfg());
    state.currentRound = 3;
    state.scores.p0 = 30;
    const end = TruthOrDareGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('history records completed challenges', () => {
    const state = TruthOrDareGame.createState(cfg());
    TruthOrDareGame.applyAction(state, { type: 'choose', choice: 'dare' }, { id: 'p0' });
    TruthOrDareGame.applyAction(state, { type: 'done' }, { id: 'p0' });
    assert.equal(state.history.length, 1);
    assert.ok(state.history[0].completed);
  });

  it('sanitizes custom content', () => {
    const c = cfg();
    c.customTruths = [{ text: '<b>bold</b>', category: 'test' }];
    const state = TruthOrDareGame.createState(c);
    assert.ok(!state.truths[0].text.includes('<b>'));
  });

  it('serializeState shows current player', () => {
    const state = TruthOrDareGame.createState(cfg());
    const s = TruthOrDareGame.serializeState(state);
    assert.equal(s.currentPlayer, 'p0');
  });
});
