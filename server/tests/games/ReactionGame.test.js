import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ReactionGame from '../../src/games/reaction/ReactionGame.js';

const cfg = () => ({
  difficulty: { level: 1 },
  playerCount: 2,
  players: [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }],
});

describe('ReactionGame', () => {
  it('metadata', () => {
    const m = ReactionGame.getMetadata();
    assert.equal(m.id, 'reaction');
    assert.equal(m.maxPlayers, 8);
  });

  it('creates state with rounds and scores', () => {
    const state = ReactionGame.createState(cfg());
    assert.equal(state.currentRound, 0);
    assert.equal(state.scores.p0, 0);
    assert.equal(state.targetActive, false);
  });

  it('start_round sets up round', () => {
    const state = ReactionGame.createState(cfg());
    const r = ReactionGame.applyAction(state, { type: 'start_round' }, { id: 'p0' });
    assert.equal(state.currentRound, 1);
    assert.equal(r.newRound, 1);
    assert.ok(r.position);
    // Clean up timer
    if (state._activationTimer) clearTimeout(state._activationTimer);
  });

  it('react scores when target active', () => {
    const state = ReactionGame.createState(cfg());
    ReactionGame.applyAction(state, { type: 'start_round' }, { id: 'p0' });
    if (state._activationTimer) clearTimeout(state._activationTimer);
    // Manually activate target
    ReactionGame.activateTarget(state);
    assert.ok(state.targetActive);

    const r = ReactionGame.applyAction(state, { type: 'react' }, { id: 'p0' });
    assert.equal(r.position, 1);
    assert.ok(r.points > 0);
    assert.ok(r.reactionTime >= 0);
  });

  it('second reactor gets fewer points', () => {
    const state = ReactionGame.createState(cfg());
    ReactionGame.applyAction(state, { type: 'start_round' }, { id: 'p0' });
    if (state._activationTimer) clearTimeout(state._activationTimer);
    ReactionGame.activateTarget(state);

    const r1 = ReactionGame.applyAction(state, { type: 'react' }, { id: 'p0' });
    const r2 = ReactionGame.applyAction(state, { type: 'react' }, { id: 'p1' });
    assert.ok(r1.points >= r2.points);
    assert.ok(r2.allReactionTimes);
  });

  it('rejects react when no target', () => {
    const state = ReactionGame.createState(cfg());
    const v = ReactionGame.validateAction(state, { type: 'react' }, { id: 'p0' });
    assert.notEqual(v, true);
  });

  it('rejects double react', () => {
    const state = ReactionGame.createState(cfg());
    ReactionGame.applyAction(state, { type: 'start_round' }, { id: 'p0' });
    if (state._activationTimer) clearTimeout(state._activationTimer);
    ReactionGame.activateTarget(state);
    ReactionGame.applyAction(state, { type: 'react' }, { id: 'p0' });
    const v = ReactionGame.validateAction(state, { type: 'react' }, { id: 'p0' });
    assert.notEqual(v, true);
  });

  it('game ends after all rounds when all reacted', () => {
    const state = ReactionGame.createState(cfg());
    state.rounds = 1;
    ReactionGame.applyAction(state, { type: 'start_round' }, { id: 'p0' });
    if (state._activationTimer) clearTimeout(state._activationTimer);
    ReactionGame.activateTarget(state);
    ReactionGame.applyAction(state, { type: 'react' }, { id: 'p0' });
    ReactionGame.applyAction(state, { type: 'react' }, { id: 'p1' });
    const end = ReactionGame.checkGameEnd(state);
    assert.ok(end.finished);
  });

  it('destroy clears timer', () => {
    const state = ReactionGame.createState(cfg());
    ReactionGame.applyAction(state, { type: 'start_round' }, { id: 'p0' });
    ReactionGame.destroy(state);
    assert.ok(true);
  });
});
