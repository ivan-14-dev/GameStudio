import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import MemoryGame from '../../src/games/memory/MemoryGame.js';

const cfg = () => ({
  difficulty: { level: 1, timeLimit: 60 },
  playerCount: 2,
  players: [{ id: 'p0', name: 'A' }, { id: 'p1', name: 'B' }],
});

describe('MemoryGame', () => {
  it('metadata', () => {
    const m = MemoryGame.getMetadata();
    assert.equal(m.id, 'memory');
  });

  it('creates state with pairs', () => {
    const state = MemoryGame.createState(cfg());
    assert.ok(state.cards.length >= 12);
    assert.equal(state.cards.length % 2, 0);
    assert.equal(state.pairsFound, 0);
    assert.ok(state.totalPairs >= 6);
  });

  it('validates correct turn and index', () => {
    const state = MemoryGame.createState(cfg());
    assert.equal(MemoryGame.validateAction(state, { index: 0 }, { id: 'p0' }), true);
    assert.notEqual(MemoryGame.validateAction(state, { index: 0 }, { id: 'p1' }), true);
  });

  it('rejects invalid index', () => {
    const state = MemoryGame.createState(cfg());
    assert.notEqual(MemoryGame.validateAction(state, { index: -1 }, { id: 'p0' }), true);
    assert.notEqual(MemoryGame.validateAction(state, { index: 999 }, { id: 'p0' }), true);
  });

  it('first flip returns card', () => {
    const state = MemoryGame.createState(cfg());
    const r = MemoryGame.applyAction(state, { index: 0 }, { id: 'p0' });
    assert.equal(r.flipped, 0);
    assert.ok(r.card);
    assert.ok(state.revealed[0]);
  });

  it('matching pair scores', () => {
    const state = MemoryGame.createState(cfg());
    // Find a matching pair
    const firstCard = state.cards[0];
    const matchIdx = state.cards.indexOf(firstCard, 1);
    assert.ok(matchIdx > 0);

    MemoryGame.applyAction(state, { index: 0 }, { id: 'p0' });
    const r = MemoryGame.applyAction(state, { index: matchIdx }, { id: 'p0' });
    assert.ok(r.match);
    assert.equal(state.scores.p0, 10);
    assert.equal(state.pairsFound, 1);
    assert.ok(state.matched[0]);
    assert.ok(state.matched[matchIdx]);
  });

  it('non-matching sets pending flip', () => {
    const state = MemoryGame.createState(cfg());
    // Find two different cards
    let idx1 = 0, idx2 = 1;
    while (state.cards[idx2] === state.cards[idx1] && idx2 < state.cards.length) idx2++;

    MemoryGame.applyAction(state, { index: idx1 }, { id: 'p0' });
    const r = MemoryGame.applyAction(state, { index: idx2 }, { id: 'p0' });
    assert.equal(r.match, false);
    assert.ok(state.pendingFlip);
    assert.ok(state.pendingFlip.hideAt > Date.now());
  });

  it('rejects action during pending flip', () => {
    const state = MemoryGame.createState(cfg());
    let idx1 = 0, idx2 = 1;
    while (state.cards[idx2] === state.cards[idx1]) idx2++;

    MemoryGame.applyAction(state, { index: idx1 }, { id: 'p0' });
    MemoryGame.applyAction(state, { index: idx2 }, { id: 'p0' });
    // Now pending flip is active, next player should wait
    const v = MemoryGame.validateAction(state, { index: 3 }, { id: 'p1' });
    assert.notEqual(v, true);
  });

  it('auto-clears pending flip after timeout', () => {
    const state = MemoryGame.createState(cfg());
    let idx1 = 0, idx2 = 1;
    while (state.cards[idx2] === state.cards[idx1]) idx2++;

    MemoryGame.applyAction(state, { index: idx1 }, { id: 'p0' });
    MemoryGame.applyAction(state, { index: idx2 }, { id: 'p0' });
    // Force timeout
    state.pendingFlip.hideAt = Date.now() - 1;
    const v = MemoryGame.validateAction(state, { index: 3 }, { id: 'p1' });
    assert.equal(v, true);
    assert.equal(state.pendingFlip, null);
    assert.equal(state.revealed[idx1], false);
    assert.equal(state.revealed[idx2], false);
  });

  it('game ends when all pairs found', () => {
    const state = MemoryGame.createState(cfg());
    state.pairsFound = state.totalPairs;
    state.scores.p0 = 50;
    const end = MemoryGame.checkGameEnd(state);
    assert.ok(end.finished);
    assert.equal(end.winner, 'p0');
  });

  it('serializeState hides unflipped cards', () => {
    const state = MemoryGame.createState(cfg());
    const s = MemoryGame.serializeState(state);
    assert.ok(s.visibleCards.every(c => c === null));
    assert.ok(s.totalPairs > 0);
  });
});
