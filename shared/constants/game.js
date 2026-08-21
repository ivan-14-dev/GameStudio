export const GAME_STATUS = Object.freeze({
  IDLE: 'IDLE',
  INITIALIZING: 'INITIALIZING',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  ROUND_END: 'ROUND_END',
  FINISHED: 'FINISHED',
});

export const PLAYER_STATUS = Object.freeze({
  CONNECTED: 'CONNECTED',
  READY: 'READY',
  PLAYING: 'PLAYING',
  DISCONNECTED: 'DISCONNECTED',
  ELIMINATED: 'ELIMINATED',
  SPECTATING: 'SPECTATING',
});

export const DIFFICULTY_PARAMS = Object.freeze([
  'speed',
  'timeLimit',
  'complexity',
  'obstacleCount',
  'spawnRate',
  'boardSize',
  'choiceCount',
  'precision',
  'visibility',
]);

export const MAX_LEVEL = 50;
