import { ROOM_STATUS, ROOM_DEFAULTS } from '../../../shared/constants/room.js';
import { EVENTS } from '../../../shared/constants/events.js';

export class RoomManager {
  #rooms = new Map();
  #codeIndex = new Map(); // code -> roomId
  #eventBus;

  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  create({ gameId, hostId, hostName, maxPlayers, gameConfig = {}, difficulty = 1 }) {
    const roomId = crypto.randomUUID();
    const code = this.#generateCode();

    const room = {
      roomId,
      code,
      gameId,
      hostId,
      status: ROOM_STATUS.WAITING,
      maxPlayers: Math.min(maxPlayers || ROOM_DEFAULTS.MAX_PLAYERS, ROOM_DEFAULTS.MAX_PLAYERS),
      players: [{
        id: hostId,
        name: hostName,
        ready: false,
        joinedAt: Date.now(),
        connected: true,
      }],
      gameConfig,
      difficulty,
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
    };

    this.#rooms.set(roomId, room);
    this.#codeIndex.set(code, roomId);

    this.#eventBus.emit(EVENTS.ROOM_CREATE, { roomId, code });
    return room;
  }

  join(code, player) {
    const roomId = this.#codeIndex.get(code.toUpperCase());
    if (!roomId) return { error: 'Room not found' };

    const room = this.#rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.status !== ROOM_STATUS.WAITING) return { error: 'Game already started' };
    if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };
    if (room.players.some((p) => p.id === player.id)) return { error: 'Already in room' };

    room.players.push({
      id: player.id,
      name: player.name,
      ready: false,
      joinedAt: Date.now(),
      connected: true,
    });

    this.#eventBus.emit(EVENTS.PLAYER_JOINED, { roomId, player: { id: player.id, name: player.name } });
    return { room };
  }

  leave(roomId, playerId) {
    const room = this.#rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    this.#eventBus.emit(EVENTS.PLAYER_LEFT, { roomId, playerId });

    if (room.players.length === 0) {
      this.#close(roomId);
    } else if (playerId === room.hostId) {
      room.hostId = room.players[0].id;
    }
  }

  setReady(roomId, playerId, ready = true) {
    const room = this.#rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;
    player.ready = ready;

    this.#eventBus.emit(ready ? EVENTS.PLAYER_READY : EVENTS.PLAYER_UNREADY, { roomId, playerId });

    if (room.players.length >= ROOM_DEFAULTS.MIN_PLAYERS && room.players.every((p) => p.ready)) {
      room.status = ROOM_STATUS.READY;
    } else if (room.status === ROOM_STATUS.READY) {
      room.status = ROOM_STATUS.WAITING;
    }

    return room;
  }

  addBot(roomId) {
    const room = this.#rooms.get(roomId);
    if (!room) return;
    const n = room.players.filter(p => p.id.startsWith('bot-')).length + 1;
    room.players.push({ id: `bot-${n}`, name: `🤖 Bot ${n}`, ready: true, joinedAt: Date.now(), connected: true, isBot: true });
  }

  startGame(roomId) {
    const room = this.#rooms.get(roomId);
    if (!room || room.status !== ROOM_STATUS.READY) return null;

    room.status = ROOM_STATUS.STARTING;
    room.startedAt = Date.now();
    return room;
  }

  setPlaying(roomId) {
    const room = this.#rooms.get(roomId);
    if (room) room.status = ROOM_STATUS.PLAYING;
  }

  finish(roomId) {
    const room = this.#rooms.get(roomId);
    if (!room) return;
    room.status = ROOM_STATUS.FINISHED;
    room.finishedAt = Date.now();
  }

  rematch(roomId) {
    const room = this.#rooms.get(roomId);
    if (!room || room.status !== ROOM_STATUS.FINISHED) return null;
    room.status = ROOM_STATUS.WAITING;
    room.startedAt = null;
    room.finishedAt = null;
    room.players.forEach((p) => { p.ready = false; });
    return room;
  }

  markDisconnected(roomId, playerId) {
    const room = this.#rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.connected = false;
  }

  markReconnected(roomId, playerId) {
    const room = this.#rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.connected = true;
  }

  get(roomId) {
    return this.#rooms.get(roomId) || null;
  }

  getByCode(code) {
    const roomId = this.#codeIndex.get(code.toUpperCase());
    return roomId ? this.#rooms.get(roomId) : null;
  }

  findRoomByPlayer(playerId) {
    for (const room of this.#rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) return room;
    }
    return null;
  }

  #close(roomId) {
    const room = this.#rooms.get(roomId);
    if (room) {
      this.#codeIndex.delete(room.code);
      this.#rooms.delete(roomId);
      this.#eventBus.emit(EVENTS.ROOM_CLOSED, { roomId });
    }
  }

  #generateCode() {
    const chars = ROOM_DEFAULTS.CODE_CHARS;
    let code;
    do {
      code = '';
      for (let i = 0; i < ROOM_DEFAULTS.CODE_LENGTH; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.#codeIndex.has(code));
    return code;
  }

  // Periodic cleanup of stale rooms
  cleanup(maxAgeMs = ROOM_DEFAULTS.IDLE_TIMEOUT_MS) {
    const now = Date.now();
    for (const [roomId, room] of this.#rooms) {
      if (room.status === ROOM_STATUS.FINISHED || room.status === ROOM_STATUS.CLOSED) {
        if (now - (room.finishedAt || room.createdAt) > maxAgeMs) this.#close(roomId);
      } else if (room.status === ROOM_STATUS.WAITING) {
        if (now - room.createdAt > maxAgeMs) this.#close(roomId);
      }
    }
  }
}
