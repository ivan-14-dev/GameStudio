import { GAME_STATUS, PLAYER_STATUS } from '../../../shared/constants/game.js';
import { EVENTS } from '../../../shared/constants/events.js';

// Central game engine — orchestrates games via GameModule interface
export class GameEngine {
  #eventBus;
  #difficultyEngine;
  #scoreEngine;
  #sessions = new Map(); // roomId -> GameSession

  constructor({ eventBus, difficultyEngine, scoreEngine }) {
    this.#eventBus = eventBus;
    this.#difficultyEngine = difficultyEngine;
    this.#scoreEngine = scoreEngine;
  }

  async createSession(room, gameModule) {
    // Auto-register game difficulty config if available
    const diffConfig = gameModule.getDifficulty?.();
    if (diffConfig) this.#difficultyEngine.register(room.gameId, diffConfig);

    const difficulty = this.#difficultyEngine.get(room.gameId, room.difficulty || 1);
    const config = { ...room.gameConfig, difficulty, playerCount: room.players.length, players: room.players };

    const state = gameModule.createState(config);
    const session = {
      roomId: room.roomId,
      gameId: room.gameId,
      gameModule,
      status: GAME_STATUS.INITIALIZING,
      state,
      config,
      players: new Map(),
      scores: {},
      startedAt: null,
      finishedAt: null,
      tickTimer: null,
      roundTimer: null,
      turnTimer: null,
      paused: false,
    };

    // Init players
    for (const p of room.players) {
      session.players.set(p.id, {
        id: p.id,
        name: p.name,
        status: PLAYER_STATUS.READY,
        score: 0,
      });
      session.scores[p.id] = 0;
      gameModule.handlePlayerJoin?.(session.state, p);
    }

    this.#sessions.set(room.roomId, session);
    return session;
  }

  startCountdown(roomId, onTick, onComplete) {
    const session = this.#sessions.get(roomId);
    if (!session) return;

    session.status = GAME_STATUS.COUNTDOWN;
    let count = 3;
    onTick(count);

    session.tickTimer = setInterval(() => {
      count--;
      if (count > 0) {
        onTick(count);
      } else {
        clearInterval(session.tickTimer);
        session.tickTimer = null;
        this.#startGame(session);
        onComplete();
      }
    }, 1000);
  }

  #startGame(session) {
    session.status = GAME_STATUS.PLAYING;
    session.startedAt = Date.now();
    this.#eventBus.emit(EVENTS.GAME_START, { roomId: session.roomId });

    // If the game defines a tick rate or interval, start a server tick loop
    const tickRate = session.gameModule.getMetadata?.().tickRate;
    const interval = session.state.tickInterval || (tickRate > 0 ? 1000 / tickRate : 0);
    if (interval > 0) {
      session.tickTimer = setInterval(() => {
        this.#tick(session);
      }, interval);
    }

    // If there's a time limit, set a timer
    if (session.config.difficulty?.timeLimit > 0) {
      session.roundTimer = setTimeout(() => {
        this.#timeUp(session);
      }, session.config.difficulty.timeLimit * 1000);
    }
  }

  processAction(roomId, playerId, action) {
    const session = this.#sessions.get(roomId);
    if (!session || session.status !== GAME_STATUS.PLAYING) return { valid: false, error: 'Game not active' };

    const player = session.players.get(playerId);
    if (!player || player.status === PLAYER_STATUS.ELIMINATED || player.status === PLAYER_STATUS.SPECTATING) {
      return { valid: false, error: 'Player not active' };
    }

    const validation = session.gameModule.validateAction(session.state, action, player);
    if (validation !== true && validation !== null && validation !== undefined) {
      return { valid: false, error: typeof validation === 'string' ? validation : 'Invalid action' };
    }

    const result = session.gameModule.applyAction(session.state, action, player);

    // Check for score changes
    if (result?.scoreChange) {
      const computed = this.#scoreEngine.calculate(result.scoreChange, {
        difficulty: session.config.difficulty?.level || 1,
        combo: result.combo || 0,
        speed: result.speedBonus || 0,
        perfect: result.perfect || false,
      });
      session.scores[playerId] = (session.scores[playerId] || 0) + computed;
      player.score = session.scores[playerId];
    }

    // Check game end
    const endResult = session.gameModule.checkGameEnd(session.state);
    if (endResult?.finished) {
      this.#finishGame(session, endResult);
    }

    // Reset turn timer for turn-based games
    this.#resetTurnTimer(session);

    // Schedule bot actions for turn-based/simultaneous games
    this.#scheduleBotActions(session);

    return { valid: true, result, scores: { ...session.scores } };
  }

  #tick(session) {
    if (session.status !== GAME_STATUS.PLAYING) return;

    // Bot actions for tick-based games (before movement)
    this.#applyBotActions(session);

    const tickResult = session.gameModule.tick?.(session.state);
    if (tickResult) {
      this.#eventBus.emit(EVENTS.GAME_TICK, { roomId: session.roomId, data: tickResult });

      if (tickResult.finished) {
        this.#finishGame(session, tickResult);
      }
    }
  }

  #timeUp(session) {
    const endResult = session.gameModule.checkGameEnd(session.state) || {};
    this.#finishGame(session, { ...endResult, reason: 'time_up' });
  }

  #finishGame(session, endResult) {
    session.status = GAME_STATUS.FINISHED;
    session.finishedAt = Date.now();
    this.#cleanup(session);

    const finalScores = session.gameModule.calculateScore?.(session.state) || session.scores;

    const results = {
      roomId: session.roomId,
      gameId: session.gameId,
      scores: finalScores,
      winner: endResult.winner || this.#determineWinner(finalScores),
      reason: endResult.reason || 'game_end',
      duration: session.finishedAt - session.startedAt,
    };

    this.#eventBus.emit(EVENTS.GAME_FINISHED, results);
    return results;
  }

  #determineWinner(scores) {
    let best = null;
    let bestScore = -Infinity;
    for (const [pid, s] of Object.entries(scores)) {
      if (s > bestScore) { bestScore = s; best = pid; }
    }
    return best;
  }

  handlePlayerDisconnect(roomId, playerId) {
    const session = this.#sessions.get(roomId);
    if (!session) return;
    const player = session.players.get(playerId);
    if (player) {
      player.status = PLAYER_STATUS.DISCONNECTED;
      session.gameModule.handlePlayerLeave?.(session.state, player);
    }

    // Auto-pause if all players disconnected in a tick-based game
    const connected = [...session.players.values()].filter((p) => p.status !== PLAYER_STATUS.DISCONNECTED && p.status !== PLAYER_STATUS.ELIMINATED && p.status !== PLAYER_STATUS.SPECTATING);
    if (connected.length === 0 && session.tickTimer) {
      session.status = GAME_STATUS.ROUND_END;
      this.#cleanup(session);
    }
  }

  setSpectating(roomId, playerId) {
    const session = this.#sessions.get(roomId);
    if (!session) return;
    const player = session.players.get(playerId);
    if (player) player.status = PLAYER_STATUS.SPECTATING;
  }

  handlePlayerReconnect(roomId, playerId) {
    const session = this.#sessions.get(roomId);
    if (!session) return null;
    const player = session.players.get(playerId);
    if (player) {
      player.status = PLAYER_STATUS.PLAYING;
      session.gameModule.handlePlayerReconnect?.(session.state, player);
    }
    return session.gameModule.serializeState?.(session.state) || session.state;
  }

  getState(roomId) {
    const session = this.#sessions.get(roomId);
    if (!session) return null;
    return session.gameModule.serializeState?.(session.state) || session.state;
  }

  destroySession(roomId) {
    const session = this.#sessions.get(roomId);
    if (!session) return;
    this.#cleanup(session);
    session.gameModule.destroy?.(session.state);
    this.#sessions.delete(roomId);
  }

  #resetTurnTimer(session) {
    if (session.turnTimer) { clearTimeout(session.turnTimer); session.turnTimer = null; }
    const turnTime = session.state?.timeLimit || session.config.difficulty?.timeLimit;
    if (turnTime && turnTime > 0 && !session.gameModule.getMetadata?.().tickRate) {
      session.turnTimer = setTimeout(() => {
        this.#eventBus.emit(EVENTS.GAME_TICK, { roomId: session.roomId, data: { turnTimeout: true } });
        const endResult = session.gameModule.checkGameEnd?.(session.state) || {};
        if (endResult.finished) this.#finishGame(session, { ...endResult, reason: 'time_up' });
      }, turnTime * 1000);
    }
  }

  pauseGame(roomId) {
    const session = this.#sessions.get(roomId);
    if (!session || session.status !== GAME_STATUS.PLAYING) return false;
    session.paused = true;
    session.status = GAME_STATUS.ROUND_END;
    if (session.tickTimer) { clearInterval(session.tickTimer); session.tickTimer = null; }
    if (session.turnTimer) { clearTimeout(session.turnTimer); session.turnTimer = null; }
    this.#eventBus.emit(EVENTS.GAME_PAUSE, { roomId });
    return true;
  }

  resumeGame(roomId) {
    const session = this.#sessions.get(roomId);
    if (!session || !session.paused) return false;
    session.paused = false;
    session.status = GAME_STATUS.PLAYING;
    const tickRate = session.gameModule.getMetadata?.().tickRate;
    const interval = session.state.tickInterval || (tickRate > 0 ? 1000 / tickRate : 0);
    if (interval > 0) {
      session.tickTimer = setInterval(() => this.#tick(session), interval);
    }
    this.#resetTurnTimer(session);
    this.#eventBus.emit(EVENTS.GAME_RESUME, { roomId });
    return true;
  }

  #cleanup(session) {
    if (session.tickTimer) { clearInterval(session.tickTimer); session.tickTimer = null; }
    if (session.roundTimer) { clearTimeout(session.roundTimer); session.roundTimer = null; }
    if (session.turnTimer) { clearTimeout(session.turnTimer); session.turnTimer = null; }
  }

  #applyBotActions(session) {
    if (!session.gameModule.getBotAction) return;
    for (const [pid] of session.players) {
      if (!pid.startsWith('bot-')) continue;
      const action = session.gameModule.getBotAction(session.state, pid);
      if (action) {
        const player = session.players.get(pid);
        const v = session.gameModule.validateAction(session.state, action, player);
        if (v === true || v == null) {
          session.gameModule.applyAction(session.state, action, player);
        }
      }
    }
  }

  #scheduleBotActions(session) {
    if (!session.gameModule.getBotAction || session.status !== GAME_STATUS.PLAYING) return;
    const meta = session.gameModule.getMetadata?.();
    if ((meta?.tickRate > 0 || session.state.tickInterval) && meta?.id !== 'rps' && meta?.id !== 'quiz') return;
    for (const [pid] of session.players) {
      if (!pid.startsWith('bot-')) continue;
      setTimeout(() => {
        const s = this.#sessions.get(session.roomId);
        if (!s || s.status !== GAME_STATUS.PLAYING) return;
        const action = s.gameModule.getBotAction(s.state, pid);
        if (action) {
          const result = this.processAction(s.roomId, pid, action);
          if (result.valid) {
            this.#eventBus.emit('bot:action', { roomId: s.roomId, playerId: pid, action, result: result.result, scores: result.scores });
          }
        }
      }, 600 + Math.random() * 1200);
    }
  }
}
