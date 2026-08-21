import { EVENTS } from '../../../shared/constants/events.js';
import { ROOM_STATUS } from '../../../shared/constants/room.js';
import { ConnectionManager } from './ConnectionManager.js';
import { RateLimiter } from '../security/RateLimiter.js';
import { ActionValidator } from '../security/ActionValidator.js';

// Main WebSocket gateway — routes all real-time communication
export class WebSocketGateway {
  #connections;
  #rateLimiter;
  #validator;
  #roomManager;
  #gameEngine;
  #gameRegistry;
  #eventBus;
  #progressionEngine;
  #achievementEngine;

  constructor({ roomManager, gameEngine, gameRegistry, eventBus, progressionEngine, achievementEngine }) {
    this.#connections = new ConnectionManager();
    this.#rateLimiter = new RateLimiter({ maxPerWindow: 60, windowMs: 1000 });
    this.#validator = new ActionValidator();
    this.#roomManager = roomManager;
    this.#gameEngine = gameEngine;
    this.#gameRegistry = gameRegistry;
    this.#eventBus = eventBus;
    this.#progressionEngine = progressionEngine;
    this.#achievementEngine = achievementEngine;

    this.#setupEventListeners();
  }

  handleConnection(socket, playerId, playerName) {
    // If player already connected, do a proper reconnect (preserves room)
    if (this.#connections.isConnected(playerId)) {
      this.#connections.reconnect(playerId, socket);
    } else {
      this.#connections.add(playerId, socket, null);
    }

    socket.on('message', (raw) => this.#onMessage(socket, raw));
    socket.on('close', () => this.#onClose(socket));
    socket.on('pong', () => this.#connections.markAlive(playerId));

    this.#connections.send(playerId, { type: EVENTS.CONNECT, playerId });
  }

  start() {
    this.#connections.startHeartbeat((playerId, roomId) => {
      this.#handleDisconnect(playerId, roomId);
    });
  }

  stop() {
    this.#connections.stopHeartbeat();
  }

  #onMessage(socket, raw) {
    const playerId = this.#connections.getPlayerId(socket);
    if (!playerId) return;

    if (!this.#rateLimiter.check(playerId)) {
      this.#connections.send(playerId, { type: EVENTS.ERROR, error: 'Rate limited' });
      return;
    }

    const { valid, data, error } = this.#validator.validate(raw.toString());
    if (!valid) {
      this.#connections.send(playerId, { type: EVENTS.ERROR, error });
      return;
    }

    this.#route(playerId, data);
  }

  #route(playerId, msg) {
    switch (msg.type) {
      case EVENTS.ROOM_CREATE: return this.#handleRoomCreate(playerId, msg);
      case EVENTS.ROOM_JOIN: return this.#handleRoomJoin(playerId, msg);
      case EVENTS.ROOM_LEAVE: return this.#handleRoomLeave(playerId);
      case EVENTS.PLAYER_READY: return this.#handlePlayerReady(playerId, true);
      case EVENTS.PLAYER_UNREADY: return this.#handlePlayerReady(playerId, false);
      case EVENTS.GAME_ACTION: return this.#handleGameAction(playerId, msg);
      case EVENTS.GAME_REMATCH: return this.#handleRematch(playerId);
      case EVENTS.GAME_PAUSE: return this.#handlePause(playerId);
      case EVENTS.GAME_RESUME: return this.#handleResume(playerId);
      case EVENTS.HEARTBEAT: return this.#connections.markAlive(playerId);
      case EVENTS.RECONNECT: return this.#handleReconnect(playerId, msg);
      default:
        this.#connections.send(playerId, { type: EVENTS.ERROR, error: 'Unknown message type' });
    }
  }

  #handleRoomCreate(playerId, msg) {
    const room = this.#roomManager.create({
      gameId: msg.gameId,
      hostId: playerId,
      hostName: msg.playerName || 'Player',
      maxPlayers: msg.maxPlayers,
      gameConfig: msg.gameConfig,
      difficulty: msg.difficulty,
    });

    this.#connections.setRoom(playerId, room.roomId);
    this.#connections.send(playerId, {
      type: EVENTS.ROOM_CREATE,
      room: this.#serializeRoom(room),
    });
  }

  #handleRoomJoin(playerId, msg) {
    const result = this.#roomManager.join(msg.roomCode, {
      id: playerId,
      name: msg.playerName || 'Player',
    });

    if (result.error) {
      this.#connections.send(playerId, { type: EVENTS.ROOM_ERROR, error: result.error });
      return;
    }

    const room = result.room;
    this.#connections.setRoom(playerId, room.roomId);

    // Send room state to joiner
    this.#connections.send(playerId, {
      type: EVENTS.ROOM_JOIN,
      room: this.#serializeRoom(room),
    });

    // Notify others with full room state so they can update the player list
    this.#connections.broadcast(room.roomId, {
      type: EVENTS.ROOM_UPDATE,
      room: this.#serializeRoom(room),
    }, playerId);
  }

  #handleRoomLeave(playerId) {
    const roomId = this.#connections.getPlayerRoom(playerId);
    if (!roomId) return;

    this.#roomManager.leave(roomId, playerId);
    this.#connections.setRoom(playerId, null);

    const room = this.#roomManager.get(roomId);
    if (room) {
      this.#connections.broadcast(roomId, {
        type: EVENTS.ROOM_UPDATE,
        room: this.#serializeRoom(room),
      });
    }
  }

  #handlePlayerReady(playerId, ready) {
    const roomId = this.#connections.getPlayerRoom(playerId);
    if (!roomId) return;

    const room = this.#roomManager.setReady(roomId, playerId, ready);
    if (!room) return;

    this.#connections.broadcast(roomId, {
      type: EVENTS.ROOM_UPDATE,
      room: this.#serializeRoom(room),
    });

    // Auto-start when all ready
    if (room.status === ROOM_STATUS.READY) {
      this.#startGame(room);
    }
  }

  async #startGame(room) {
    const startedRoom = this.#roomManager.startGame(room.roomId);
    if (!startedRoom) return;

    const gameModule = await this.#gameRegistry.get(room.gameId);
    if (!gameModule) {
      this.#connections.broadcast(room.roomId, {
        type: EVENTS.GAME_ERROR,
        error: 'Game not found',
      });
      return;
    }

    // Solo play: add bot if game requires an opponent
    if (startedRoom.players.length === 1 && gameModule.getBotAction) {
      this.#roomManager.addBot(room.roomId);
    }

    await this.#gameEngine.createSession(startedRoom, gameModule);

    this.#gameEngine.startCountdown(room.roomId,
      (count) => {
        this.#connections.broadcast(room.roomId, {
          type: EVENTS.GAME_COUNTDOWN,
          count,
        });
      },
      () => {
        this.#roomManager.setPlaying(room.roomId);
        const state = this.#gameEngine.getState(room.roomId);
        this.#connections.broadcast(room.roomId, {
          type: EVENTS.GAME_START,
          state,
        });
      },
    );
  }

  #handleGameAction(playerId, msg) {
    const roomId = this.#connections.getPlayerRoom(playerId);
    if (!roomId) return;

    const result = this.#gameEngine.processAction(roomId, playerId, msg.action);

    if (!result.valid) {
      this.#connections.send(playerId, {
        type: EVENTS.GAME_ERROR,
        error: result.error,
      });
      return;
    }

    // Broadcast action result to all players in room
    this.#connections.broadcast(roomId, {
      type: EVENTS.GAME_ACTION,
      playerId,
      action: msg.action,
      result: result.result,
      scores: result.scores,
    });
  }

  #handleRematch(playerId) {
    const roomId = this.#connections.getPlayerRoom(playerId);
    if (!roomId) return;

    const room = this.#roomManager.rematch(roomId);
    if (!room) {
      this.#connections.send(playerId, { type: EVENTS.GAME_ERROR, error: 'Cannot rematch' });
      return;
    }

    this.#gameEngine.destroySession(roomId);
    this.#connections.broadcast(roomId, {
      type: EVENTS.GAME_REMATCH_ACCEPTED,
      room: this.#serializeRoom(room),
    });
  }

  #handlePause(playerId) {
    const roomId = this.#connections.getPlayerRoom(playerId);
    if (!roomId) return;
    const room = this.#roomManager.get(roomId);
    if (!room || room.hostId !== playerId) {
      this.#connections.send(playerId, { type: EVENTS.GAME_ERROR, error: 'Only host can pause' });
      return;
    }
    if (this.#gameEngine.pauseGame(roomId)) {
      this.#connections.broadcast(roomId, { type: EVENTS.GAME_PAUSE });
    }
  }

  #handleResume(playerId) {
    const roomId = this.#connections.getPlayerRoom(playerId);
    if (!roomId) return;
    const room = this.#roomManager.get(roomId);
    if (!room || room.hostId !== playerId) {
      this.#connections.send(playerId, { type: EVENTS.GAME_ERROR, error: 'Only host can resume' });
      return;
    }
    if (this.#gameEngine.resumeGame(roomId)) {
      this.#connections.broadcast(roomId, { type: EVENTS.GAME_RESUME });
    }
  }

  #handleReconnect(playerId, msg) {
    const room = this.#roomManager.findRoomByPlayer(playerId);
    if (!room) {
      this.#connections.send(playerId, { type: EVENTS.ERROR, error: 'No active room' });
      return;
    }

    this.#roomManager.markReconnected(room.roomId, playerId);
    this.#connections.setRoom(playerId, room.roomId);

    const state = this.#gameEngine.handlePlayerReconnect(room.roomId, playerId);

    this.#connections.send(playerId, {
      type: EVENTS.PLAYER_RECONNECTED,
      room: this.#serializeRoom(room),
      state,
    });

    this.#connections.broadcast(room.roomId, {
      type: EVENTS.PLAYER_RECONNECTED,
      playerId,
    }, playerId);
  }

  #handleDisconnect(playerId, roomId) {
    if (roomId) {
      this.#roomManager.markDisconnected(roomId, playerId);
      this.#gameEngine.handlePlayerDisconnect(roomId, playerId);
      this.#connections.broadcast(roomId, {
        type: EVENTS.PLAYER_DISCONNECTED,
        playerId,
      });
    }
    this.#rateLimiter.remove(playerId);
  }

  #onClose(socket) {
    const playerId = this.#connections.getPlayerId(socket);
    if (!playerId) return;
    // Only disconnect if this socket is still the active one for this player
    const currentSocket = this.#connections.getSocket(playerId);
    if (currentSocket !== socket) {
      // Stale socket closed after reconnect — just clean up the mapping
      this.#connections.removeStaleSocket(socket);
      return;
    }
    const roomId = this.#connections.getPlayerRoom(playerId);
    this.#connections.remove(socket);
    this.#handleDisconnect(playerId, roomId);
  }

  #setupEventListeners() {
    this.#eventBus.on(EVENTS.GAME_FINISHED, (results) => {
      this.#connections.broadcast(results.roomId, {
        type: EVENTS.GAME_FINISHED,
        ...results,
      });
      this.#roomManager.finish(results.roomId);

      // Process progression for all players in the room
      const room = this.#roomManager.get(results.roomId);
      if (room) {
        for (const player of room.players) {
          const profile = player._profile || { level: 1, totalXP: 0, stats: {}, achievements: [] };
          const won = results.winner === player.id;
          const score = results.scores?.[player.id] || 0;

          this.#progressionEngine.recordResult(profile, results.gameId, { won, score });

          const xpGained = 10 + (won ? 25 : 0) + Math.round(score / 100);
          const levelUps = this.#progressionEngine.addXP(profile, results.gameId, xpGained);

          if (levelUps.length > 0) {
            this.#connections.send(player.id, {
              type: EVENTS.LEVEL_UP,
              levelUps,
            });
          }

          const achievements = this.#achievementEngine.evaluate(profile);
          if (achievements.length > 0) {
            this.#connections.send(player.id, {
              type: EVENTS.ACHIEVEMENT_UNLOCKED,
              achievements: achievements.map((a) => ({ id: a.id, name: a.name, icon: a.icon })),
            });
          }

          player._profile = profile;
        }
      }

      // Cleanup session
      setTimeout(() => this.#gameEngine.destroySession(results.roomId), 5000);
    });

    this.#eventBus.on(EVENTS.GAME_TICK, ({ roomId, data }) => {
      this.#connections.broadcast(roomId, {
        type: EVENTS.GAME_TICK,
        data,
      });
    });

    this.#eventBus.on('bot:action', ({ roomId, playerId, action, result, scores }) => {
      this.#connections.broadcast(roomId, {
        type: EVENTS.GAME_ACTION,
        playerId,
        action,
        result,
        scores,
      });
    });
  }

  #serializeRoom(room) {
    return {
      roomId: room.roomId,
      code: room.code,
      gameId: room.gameId,
      hostId: room.hostId,
      status: room.status,
      maxPlayers: room.maxPlayers,
      difficulty: room.difficulty,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        connected: p.connected,
      })),
    };
  }
}
