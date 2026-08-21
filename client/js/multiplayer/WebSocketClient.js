import { EVENTS } from '../shared/constants/events.js';
import { eventBus } from '../core/EventBus.js';
import { Store } from '../core/Store.js';

// WebSocket client with auto-reconnect and heartbeat
export class WebSocketClient {
  #ws = null;
  #url;
  #playerId;
  #playerName;
  #reconnectTimer = null;
  #heartbeatTimer = null;
  #reconnectAttempts = 0;
  #maxReconnectAttempts = 5;

  get connected() {
    return this.#ws?.readyState === WebSocket.OPEN;
  }

  get playerId() {
    return this.#playerId;
  }

  connect(url, playerName) {
    const player = Store.getPlayer();
    if (!player.name && playerName) {
      player.name = playerName;
      Store.savePlayer(player);
    }

    this.#playerId = player.id;
    this.#playerName = playerName || player.name || 'Player';
    this.#url = `${url}?name=${encodeURIComponent(this.#playerName)}&playerId=${this.#playerId}`;
    this.#doConnect();
  }

  #doConnect() {
    if (this.#ws) {
      try { this.#ws.close(); } catch { /* ignore */ }
    }

    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#reconnectAttempts = 0;
      this.#startHeartbeat();
      eventBus.emit('ws:connected', { playerId: this.#playerId });
    };

    this.#ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        eventBus.emit(msg.type, msg);
        eventBus.emit('ws:message', msg);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    this.#ws.onclose = () => {
      this.#stopHeartbeat();
      eventBus.emit('ws:disconnected');
      this.#scheduleReconnect();
    };

    this.#ws.onerror = () => {
      eventBus.emit('ws:error', { message: 'Connection error' });
    };
  }

  send(data) {
    if (!this.connected) return false;
    this.#ws.send(JSON.stringify(data));
    return true;
  }

  // Room operations
  createRoom(gameId, options = {}) {
    return this.send({
      type: EVENTS.ROOM_CREATE,
      gameId,
      playerName: this.#playerName,
      ...options,
    });
  }

  joinRoom(roomCode) {
    return this.send({
      type: EVENTS.ROOM_JOIN,
      roomCode: roomCode.toUpperCase(),
      playerName: this.#playerName,
    });
  }

  leaveRoom() {
    return this.send({ type: EVENTS.ROOM_LEAVE });
  }

  setReady(ready = true) {
    return this.send({ type: ready ? EVENTS.PLAYER_READY : EVENTS.PLAYER_UNREADY });
  }

  sendAction(action) {
    return this.send({ type: EVENTS.GAME_ACTION, action });
  }

  requestRematch() {
    return this.send({ type: EVENTS.GAME_REMATCH });
  }

  disconnect() {
    this.#reconnectAttempts = this.#maxReconnectAttempts;
    this.#stopHeartbeat();
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    if (this.#ws) this.#ws.close();
  }

  #startHeartbeat() {
    this.#heartbeatTimer = setInterval(() => {
      this.send({ type: EVENTS.HEARTBEAT });
    }, 15_000);
  }

  #stopHeartbeat() {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = null;
    }
  }

  #scheduleReconnect() {
    if (this.#reconnectAttempts >= this.#maxReconnectAttempts) return;
    const delay = Math.min(1000 * 2 ** this.#reconnectAttempts, 10_000);
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectAttempts++;
      this.#doConnect();
    }, delay);
  }
}

export const wsClient = new WebSocketClient();
