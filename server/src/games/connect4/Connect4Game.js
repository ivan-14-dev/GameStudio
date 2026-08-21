// Connect Four — 2-4 players, variable board
const COLORS = ['🔴', '🟡', '🔵', '🟢'];

export default {
  getMetadata() {
    return {
      id: 'connect4',
      name: 'Puissance 4',
      description: 'Alignez 4 jetons avant vos adversaires',
      icon: '🔴',
      minPlayers: 1,
      maxPlayers: 4,
      tickRate: 0,
      categories: ['strategy', 'classic'],
    };
  },

  createState(config) {
    const { difficulty, playerCount } = config;
    const cols = config.cols || (difficulty.level <= 15 ? 7 : difficulty.level <= 30 ? 8 : 9);
    const rows = config.rows || (difficulty.level <= 15 ? 6 : difficulty.level <= 30 ? 7 : 8);
    const connectN = config.connectN || 4;

    const playerIds = (config.players || []).map((p) => p.id);
    const playerColors = {};
    playerIds.forEach((pid, i) => { playerColors[pid] = COLORS[i % COLORS.length]; });

    return {
      rows, cols, connectN,
      board: Array.from({ length: rows }, () => Array(cols).fill(null)),
      currentTurn: 0,
      playerOrder: playerIds,
      playerColors,
      lastMove: null,
      timeLimit: difficulty.timeLimit || null,
      winner: null,
    };
  },

  validateAction(state, action, player) {
    if (state.winner) return 'Game over';
    const currentPid = state.playerOrder[state.currentTurn % state.playerOrder.length];
    if (player.id !== currentPid) return 'Not your turn';
    const { col } = action;
    if (col == null || col < 0 || col >= state.cols) return 'Invalid column';
    if (state.board[0][col] !== null) return 'Column full';
    return true;
  },

  applyAction(state, action, player) {
    const { col } = action;
    // Drop to lowest empty row
    for (let row = state.rows - 1; row >= 0; row--) {
      if (state.board[row][col] === null) {
        state.board[row][col] = player.id;
        state.lastMove = { row, col, playerId: player.id };
        state.currentTurn++;
        return { row, col, color: state.playerColors[player.id] };
      }
    }
    return {};
  },

  checkGameEnd(state) {
    if (!state.lastMove) return { finished: false };
    const { row, col, playerId } = state.lastMove;

    const winLine = this._getWinLine(state.board, row, col, playerId, state.connectN, state.rows, state.cols);
    if (winLine) {
      state.winner = playerId;
      state.winLine = winLine;
      return { finished: true, winner: playerId };
    }

    const full = state.board[0].every((cell) => cell !== null);
    if (full) return { finished: true, winner: null, reason: 'draw' };

    return { finished: false };
  },

  calculateScore(state) {
    const scores = {};
    for (const pid of state.playerOrder) {
      scores[pid] = state.winner === pid ? 100 : 0;
    }
    return scores;
  },

  getDifficulty() {
    return { timeLimit: { min: 60, max: 15, curve: 'linear' } };
  },

  serializeState(state) {
    return {
      rows: state.rows, cols: state.cols, connectN: state.connectN,
      board: state.board, currentTurn: state.currentTurn,
      playerOrder: state.playerOrder, playerColors: state.playerColors,
      lastMove: state.lastMove, winner: state.winner,
      winLine: state.winLine || null,
      timeLimit: state.timeLimit || null,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
    if (state.playerOrder.length <= 1) state.winner = state.playerOrder[0] || null;
  },

  destroy() {},

  getBotAction(state, botId) {
    const idx = state.currentTurn % state.playerOrder.length;
    if (state.playerOrder[idx] !== botId || state.winner) return null;
    const valid = [];
    for (let c = 0; c < state.cols; c++) if (state.board[0][c] === null) valid.push(c);
    if (valid.length === 0) return null;
    // Prefer center columns
    valid.sort((a, b) => Math.abs(a - state.cols / 2) - Math.abs(b - state.cols / 2));
    const pick = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * valid.length);
    return { col: valid[pick] };
  },

  _getWinLine(board, row, col, pid, n, rows, cols) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      const cells = [[row, col]];
      for (let d = -1; d <= 1; d += 2) {
        for (let i = 1; i < n; i++) {
          const r = row + dr * i * d, c = col + dc * i * d;
          if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== pid) break;
          cells.push([r, c]);
        }
      }
      if (cells.length >= n) return cells;
    }
    return null;
  },
};
