// Memory Duel — 2-4 players, find matching pairs
const CARD_SETS = [
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌸', '🌺', '🌻', '🌷', '🌹', '🪻', '🌼', '💐',
  '🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨',
  '⭐', '🌙', '☀️', '🌈', '❄️', '🔥', '💧', '⚡',
];

export default {
  getMetadata() {
    return {
      id: 'memory',
      name: 'Memory Duel',
      description: 'Trouvez les paires avant vos adversaires',
      icon: '🧠',
      minPlayers: 1,
      maxPlayers: 4,
      tickRate: 0,
      categories: ['puzzle', 'memory'],
    };
  },

  createState(config) {
    const { difficulty, playerCount } = config;
    const pairCount = Math.min(CARD_SETS.length, 6 + Math.floor((difficulty.level || 1) / 3));
    const selected = CARD_SETS.slice(0, pairCount);
    const cards = [...selected, ...selected];

    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const playerIds = (config.players || []).map((p) => p.id);
    const scores = {};
    playerIds.forEach((pid) => { scores[pid] = 0; });

    return {
      cards,
      revealed: Array(cards.length).fill(false),
      matched: Array(cards.length).fill(false),
      flipped: [], // indices currently flipped (max 2)
      currentTurn: 0,
      playerOrder: playerIds,
      scores,
      pairsFound: 0,
      totalPairs: pairCount,
      timeLimit: difficulty.timeLimit || null,
      pendingFlip: null,
      flipTimeout: null,
    };
  },

  validateAction(state, action, player) {
    // Auto-clear pending flip if timeout has passed
    if (state.pendingFlip) {
      if (Date.now() >= state.pendingFlip.hideAt) {
        const [a, b] = state.pendingFlip.indices;
        state.revealed[a] = false;
        state.revealed[b] = false;
        state.flipped = [];
        state.pendingFlip = null;
      } else {
        return 'Wait for flip reset';
      }
    }
    const currentPid = state.playerOrder[state.currentTurn % state.playerOrder.length];
    if (player.id !== currentPid) return 'Not your turn';
    if (action.index == null) return 'Missing card index';
    const idx = action.index;
    if (idx < 0 || idx >= state.cards.length) return 'Invalid index';
    if (state.matched[idx]) return 'Already matched';
    if (state.flipped.includes(idx)) return 'Already flipped';
    if (state.flipped.length >= 2) return 'Wait for flip reset';
    return true;
  },

  applyAction(state, action, player) {
    const idx = action.index;
    state.flipped.push(idx);
    state.revealed[idx] = true;

    if (state.flipped.length === 2) {
      const [a, b] = state.flipped;
      if (state.cards[a] === state.cards[b]) {
        // Match found
        state.matched[a] = true;
        state.matched[b] = true;
        state.scores[player.id] += 10;
        state.pairsFound++;
        state.flipped = [];
        return { match: true, indices: [a, b], card: state.cards[a], scoreChange: 10 };
      }
      // No match — server handles flip timeout to prevent desync
      const result = { match: false, indices: [a, b], cards: [state.cards[a], state.cards[b]] };
      // Keep cards revealed for 1s, then hide them
      state.pendingFlip = { indices: [a, b], hideAt: Date.now() + 1000 };
      state.currentTurn++;
      return result;
    }

    return { flipped: idx, card: state.cards[idx] };
  },

  checkGameEnd(state) {
    if (state.pairsFound >= state.totalPairs) {
      let best = null, bestScore = -1;
      for (const [pid, s] of Object.entries(state.scores)) {
        if (s > bestScore) { bestScore = s; best = pid; }
      }
      return { finished: true, winner: best };
    }
    return { finished: false };
  },

  calculateScore(state) {
    return { ...state.scores };
  },

  getDifficulty() {
    return {
      complexity: { min: 6, max: 24, curve: 'linear' },
      timeLimit: { min: 120, max: 30, curve: 'ease-in' },
    };
  },

  serializeState(state) {
    return {
      cardCount: state.cards.length,
      revealed: state.revealed,
      matched: state.matched,
      // Only send card values for revealed/matched cards
      visibleCards: state.cards.map((c, i) => (state.revealed[i] || state.matched[i]) ? c : null),
      currentTurn: state.currentTurn,
      playerOrder: state.playerOrder,
      scores: state.scores,
      pairsFound: state.pairsFound,
      totalPairs: state.totalPairs,
      timeLimit: state.timeLimit || null,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
  },

  destroy() {},
};
