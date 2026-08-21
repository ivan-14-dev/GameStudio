// Tic Tac Toe — 2+ players, variable board sizes
const SYMBOLS = ['X', 'O', '△', '□'];

export default {
  getMetadata() {
    return {
      id: 'tictactoe',
      name: 'Tic Tac Toe',
      description: 'Morpion multijoueur avec grilles variables',
      icon: '❌',
      minPlayers: 1,
      maxPlayers: 4,
      tickRate: 0,
      categories: ['strategy', 'classic'],
    };
  },

  createState(config) {
    const { difficulty, playerCount } = config;
    const size = config.boardSize || (difficulty.level <= 10 ? 3 : difficulty.level <= 25 ? 4 : 5);
    const winLength = config.winLength || Math.min(size, difficulty.level <= 10 ? 3 : difficulty.level <= 30 ? 4 : 5);

    const playerIds = (config.players || []).map((p) => p.id);
    const playerMap = {};
    playerIds.forEach((pid, i) => { playerMap[pid] = SYMBOLS[i % SYMBOLS.length]; });

    return {
      size,
      winLength,
      board: Array.from({ length: size }, () => Array(size).fill(null)),
      currentTurn: 0,
      playerOrder: playerIds,
      playerSymbols: playerMap,
      moves: 0,
      timeLimit: difficulty.timeLimit || null,
      winner: null,
    };
  },

  validateAction(state, action, player) {
    if (state.winner) return 'Game is over';
    const currentPid = state.playerOrder[state.currentTurn % state.playerOrder.length];
    if (player.id !== currentPid) return 'Not your turn';
    const { row, col } = action;
    if (row == null || col == null) return 'Missing row/col';
    if (row < 0 || row >= state.size || col < 0 || col >= state.size) return 'Out of bounds';
    if (state.board[row][col] !== null) return 'Cell occupied';
    return true;
  },

  applyAction(state, action, player) {
    const { row, col } = action;
    state.board[row][col] = state.playerSymbols[player.id];
    state.moves++;
    state.currentTurn++;
    return { row, col, symbol: state.playerSymbols[player.id] };
  },

  checkGameEnd(state) {
    for (const [pid, symbol] of Object.entries(state.playerSymbols)) {
      const winLine = this._getWinLine(state.board, symbol, state.winLength, state.size);
      if (winLine) {
        state.winner = pid;
        state.winLine = winLine;
        return { finished: true, winner: pid };
      }
    }
    if (state.moves >= state.size * state.size) {
      return { finished: true, winner: null, reason: 'draw' };
    }
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
    return {
      timeLimit: { min: 60, max: 15, curve: 'linear' },
    };
  },

  serializeState(state) {
    return {
      size: state.size, winLength: state.winLength, board: state.board,
      currentTurn: state.currentTurn, playerOrder: state.playerOrder,
      playerSymbols: state.playerSymbols, winner: state.winner,
      winLine: state.winLine || null,
      timeLimit: state.timeLimit || null,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
    if (state.playerOrder.length <= 1) {
      state.winner = state.playerOrder[0] || null;
    }
  },

  destroy() {},

  getBotAction(state, botId) {
    const idx = state.currentTurn % state.playerOrder.length;
    if (state.playerOrder[idx] !== botId || state.winner) return null;
    const empty = [];
    for (let r = 0; r < state.size; r++) for (let c = 0; c < state.size; c++) if (state.board[r][c] === null) empty.push({ row: r, col: c });
    if (empty.length === 0) return null;
    const mid = Math.floor(state.size / 2);
    if (state.board[mid][mid] === null) return { row: mid, col: mid };
    return empty[Math.floor(Math.random() * empty.length)];
  },

  _getWinLine(board, symbol, winLen, size) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== symbol) continue;
        for (const [dr, dc] of dirs) {
          const cells = [];
          for (let i = 0; i < winLen; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= size || nc < 0 || nc >= size || board[nr][nc] !== symbol) break;
            cells.push([nr, nc]);
          }
          if (cells.length >= winLen) return cells;
        }
      }
    }
    return null;
  },
};
