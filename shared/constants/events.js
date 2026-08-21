// All WebSocket event types used by client and server
export const EVENTS = Object.freeze({
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  HEARTBEAT: 'heartbeat',
  PONG: 'pong',

  // Room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_CLOSED: 'room:closed',
  ROOM_ERROR: 'room:error',

  // Player
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_READY: 'player:ready',
  PLAYER_UNREADY: 'player:unready',
  PLAYER_DISCONNECTED: 'player:disconnected',
  PLAYER_RECONNECTED: 'player:reconnected',
  PLAYER_KICKED: 'player:kicked',

  // Game flow
  GAME_COUNTDOWN: 'game:countdown',
  GAME_START: 'game:start',
  GAME_ACTION: 'game:action',
  GAME_STATE_SYNC: 'game:state_sync',
  GAME_TICK: 'game:tick',
  GAME_ROUND_END: 'game:round_end',
  GAME_FINISHED: 'game:finished',
  GAME_ERROR: 'game:error',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_REMATCH: 'game:rematch',
  GAME_REMATCH_ACCEPTED: 'game:rematch_accepted',

  // Score & progression
  SCORE_UPDATE: 'score:update',
  XP_GAINED: 'xp:gained',
  LEVEL_UP: 'level:up',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',

  // Content
  PACK_SHARE: 'pack:share',
  PACK_IMPORT: 'pack:import',

  // System
  ERROR: 'error',
  NOTIFICATION: 'notification',
});
