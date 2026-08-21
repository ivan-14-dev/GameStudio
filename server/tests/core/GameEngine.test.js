import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { DifficultyEngine } from '../../src/core/DifficultyEngine.js';
import { ScoreEngine } from '../../src/core/ScoreEngine.js';
import { EventBus } from '../../src/core/EventBus.js';
import { GAME_STATUS, PLAYER_STATUS } from '../../../shared/constants/game.js';

function makeFakeGame(overrides = {}) {
  return {
    getMetadata: () => ({ id: 'test', tickRate: 0, ...overrides.meta }),
    createState: (cfg) => ({ board: [], moves: 0, ...overrides.state }),
    validateAction: () => true,
    applyAction: (s) => { s.moves++; return { applied: true }; },
    checkGameEnd: () => ({ finished: false }),
    calculateScore: () => ({}),
    serializeState: (s) => ({ ...s }),
    handlePlayerJoin: () => {},
    handlePlayerLeave: () => {},
    handlePlayerReconnect: () => {},
    getDifficulty: () => null,
    destroy: () => {},
    ...overrides,
  };
}

function makeRoom(players = 2) {
  const ps = Array.from({ length: players }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
  return { roomId: 'room1', gameId: 'test', difficulty: 1, players: ps, gameConfig: {} };
}

describe('GameEngine', () => {
  let engine, eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    engine = new GameEngine({
      eventBus,
      difficultyEngine: new DifficultyEngine(),
      scoreEngine: new ScoreEngine(),
    });
  });

  it('creates a session', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    assert.equal(session.status, GAME_STATUS.INITIALIZING);
    assert.equal(session.players.size, 2);
  });

  it('getState returns serialized state', async () => {
    const game = makeFakeGame();
    await engine.createSession(makeRoom(), game);
    const state = engine.getState('room1');
    assert.ok(state);
    assert.equal(state.moves, 0);
  });

  it('processAction validates and applies', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();
    for (const p of session.players.values()) p.status = PLAYER_STATUS.PLAYING;

    const result = engine.processAction('room1', 'p0', { type: 'move' });
    assert.ok(result.valid);
  });

  it('rejects action when game not active', async () => {
    const game = makeFakeGame();
    await engine.createSession(makeRoom(), game);
    const result = engine.processAction('room1', 'p0', {});
    assert.equal(result.valid, false);
  });

  it('rejects action from eliminated player', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();
    session.players.get('p0').status = PLAYER_STATUS.ELIMINATED;

    const result = engine.processAction('room1', 'p0', {});
    assert.equal(result.valid, false);
    assert.match(result.error, /not active/i);
  });

  it('rejects action from spectating player', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();
    session.players.get('p0').status = PLAYER_STATUS.SPECTATING;

    const result = engine.processAction('room1', 'p0', {});
    assert.equal(result.valid, false);
  });

  it('rejects invalid actions', async () => {
    const game = makeFakeGame({ validateAction: () => 'bad move' });
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();
    for (const p of session.players.values()) p.status = PLAYER_STATUS.PLAYING;

    const result = engine.processAction('room1', 'p0', {});
    assert.equal(result.valid, false);
    assert.equal(result.error, 'bad move');
  });

  it('finishes game when checkGameEnd returns finished', async () => {
    let finished = false;
    eventBus.on('game:finished', () => { finished = true; });

    const game = makeFakeGame({
      checkGameEnd: () => ({ finished: true, winner: 'p0' }),
    });
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();
    for (const p of session.players.values()) p.status = PLAYER_STATUS.PLAYING;

    engine.processAction('room1', 'p0', {});
    assert.equal(session.status, GAME_STATUS.FINISHED);
    assert.ok(finished);
  });

  it('handles player disconnect', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;

    engine.handlePlayerDisconnect('room1', 'p0');
    assert.equal(session.players.get('p0').status, PLAYER_STATUS.DISCONNECTED);
  });

  it('handles player reconnect', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;

    engine.handlePlayerDisconnect('room1', 'p0');
    const state = engine.handlePlayerReconnect('room1', 'p0');
    assert.equal(session.players.get('p0').status, PLAYER_STATUS.PLAYING);
    assert.ok(state);
  });

  it('setSpectating changes player status', async () => {
    const game = makeFakeGame();
    const session = await engine.createSession(makeRoom(), game);
    engine.setSpectating('room1', 'p0');
    assert.equal(session.players.get('p0').status, PLAYER_STATUS.SPECTATING);
  });

  it('pause and resume', async () => {
    const game = makeFakeGame({ meta: { tickRate: 10 } });
    const session = await engine.createSession(makeRoom(), game);
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();

    assert.ok(engine.pauseGame('room1'));
    assert.ok(session.paused);
    assert.equal(session.tickTimer, null);

    assert.ok(engine.resumeGame('room1'));
    assert.equal(session.paused, false);
    assert.equal(session.status, GAME_STATUS.PLAYING);

    engine.destroySession('room1');
  });

  it('destroySession cleans up', async () => {
    const game = makeFakeGame();
    await engine.createSession(makeRoom(), game);
    engine.destroySession('room1');
    assert.equal(engine.getState('room1'), null);
  });

  it('auto-registers difficulty config from game module', async () => {
    const diffEngine = new DifficultyEngine();
    const eng = new GameEngine({ eventBus, difficultyEngine: diffEngine, scoreEngine: new ScoreEngine() });
    const game = makeFakeGame({
      getDifficulty: () => ({ speed: { min: 1, max: 10, curve: 'linear' } }),
    });
    await eng.createSession(makeRoom(), game);
    const diff = diffEngine.get('test', 5);
    assert.ok(diff.speed > 1);
  });
});
