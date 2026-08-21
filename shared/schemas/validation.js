// Lightweight validation helpers — no external deps
const isString = (v) => typeof v === 'string';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validateAction(msg) {
  if (!isObject(msg)) return 'Message must be an object';
  if (!isString(msg.type) || msg.type.length === 0) return 'Missing action type';
  if (!isString(msg.playerId)) return 'Missing playerId';
  return null;
}

export function validateRoomCreate(msg) {
  if (!isObject(msg)) return 'Message must be an object';
  if (!isString(msg.gameId)) return 'Missing gameId';
  if (msg.maxPlayers !== undefined && (!isNumber(msg.maxPlayers) || msg.maxPlayers < 2 || msg.maxPlayers > 16)) {
    return 'maxPlayers must be 2–16';
  }
  return null;
}

export function validateRoomJoin(msg) {
  if (!isObject(msg)) return 'Message must be an object';
  if (!isString(msg.roomCode) || msg.roomCode.length < 4) return 'Invalid room code';
  if (!isString(msg.playerName) || msg.playerName.length < 1 || msg.playerName.length > 20) {
    return 'Player name must be 1–20 chars';
  }
  return null;
}

export function sanitizeString(str, maxLen = 200) {
  if (!isString(str)) return '';
  return str.slice(0, maxLen).replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
