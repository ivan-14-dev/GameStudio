// Manages all WebSocket connections, heartbeat, and reconnection
export class ConnectionManager {
  #connections = new Map(); // playerId -> { socket, roomId, lastPing, alive }
  #socketToPlayer = new Map(); // socket -> playerId
  #heartbeatInterval = null;
  #heartbeatMs;
  #timeoutMs;

  constructor({ heartbeatMs = 30_000, timeoutMs = 300_000 } = {}) {
    this.#heartbeatMs = heartbeatMs;
    this.#timeoutMs = timeoutMs;
  }

  add(playerId, socket, roomId) {
    this.#connections.set(playerId, { socket, roomId, lastPing: Date.now(), alive: true });
    this.#socketToPlayer.set(socket, playerId);
  }

  remove(socket) {
    const playerId = this.#socketToPlayer.get(socket);
    if (playerId) {
      this.#connections.delete(playerId);
      this.#socketToPlayer.delete(socket);
    }
    return playerId;
  }

  getSocket(playerId) {
    return this.#connections.get(playerId)?.socket || null;
  }

  getPlayerId(socket) {
    return this.#socketToPlayer.get(socket) || null;
  }

  removeStaleSocket(socket) {
    this.#socketToPlayer.delete(socket);
  }

  getPlayerRoom(playerId) {
    return this.#connections.get(playerId)?.roomId || null;
  }

  setRoom(playerId, roomId) {
    const conn = this.#connections.get(playerId);
    if (conn) conn.roomId = roomId;
  }

  markAlive(playerId) {
    const conn = this.#connections.get(playerId);
    if (conn) { conn.alive = true; conn.lastPing = Date.now(); }
  }

  // Replace socket on reconnection, preserve roomId
  reconnect(playerId, newSocket) {
    const old = this.#connections.get(playerId);
    const roomId = old?.roomId || null;

    if (old?.socket) {
      this.#socketToPlayer.delete(old.socket);
      try { old.socket.close(); } catch { /* ignore */ }
    }

    this.#connections.set(playerId, { socket: newSocket, roomId, lastPing: Date.now(), alive: true });
    this.#socketToPlayer.set(newSocket, playerId);
    return roomId;
  }

  isConnected(playerId) {
    return this.#connections.has(playerId);
  }

  // Send to one player
  send(playerId, data) {
    const conn = this.#connections.get(playerId);
    if (!conn?.socket) return false;
    try {
      conn.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  // Send to all players in a room
  broadcast(roomId, data, excludePlayerId) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    for (const [pid, conn] of this.#connections) {
      if (conn.roomId === roomId && pid !== excludePlayerId) {
        try { conn.socket.send(msg); } catch { /* drop silently */ }
      }
    }
  }

  startHeartbeat(onTimeout) {
    this.#heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [pid, conn] of this.#connections) {
        if (!conn.alive && now - conn.lastPing > this.#timeoutMs) {
          onTimeout(pid, conn.roomId);
          continue;
        }
        conn.alive = false;
        try { conn.socket.ping(); } catch { /* will timeout next cycle */ }
      }
    }, this.#heartbeatMs);
  }

  stopHeartbeat() {
    if (this.#heartbeatInterval) {
      clearInterval(this.#heartbeatInterval);
      this.#heartbeatInterval = null;
    }
  }

  get size() {
    return this.#connections.size;
  }
}
