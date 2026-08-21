// Reaction game — 2+ players, first to tap wins each round
export default {
  getMetadata() {
    return {
      id: 'reaction',
      name: 'Réaction',
      description: 'Soyez le plus rapide à réagir',
      icon: '⚡',
      minPlayers: 2,
      maxPlayers: 8,
      tickRate: 0,
      categories: ['arcade', 'reflex'],
    };
  },

  createState(config) {
    const { difficulty } = config;
    const rounds = config.rounds || 10;
    const playerIds = (config.players || []).map((p) => p.id);
    const scores = {};
    playerIds.forEach((pid) => { scores[pid] = 0; });

    return {
      rounds,
      currentRound: 0,
      playerOrder: playerIds,
      scores,
      targetActive: false,
      targetAppearedAt: null,
      targetPosition: null,
      targetSize: Math.max(30, 80 - (difficulty.level || 1)),
      roundReacted: [],
      hasFake: (difficulty.level || 1) > 15,
      isFake: false,
      roundResults: [],
      winner: null,
      _activationTimer: null,
    };
  },

  validateAction(state, action, player) {
    if (state.winner) return 'Game over';
    if (action.type === 'react') {
      if (!state.targetActive) return 'No target';
      if (state.isFake) return false;
      if (state.roundReacted.includes(player.id)) return 'Already reacted';
      return true;
    }
    if (action.type === 'start_round') return true;
    return 'Invalid action';
  },

  applyAction(state, action, player) {
    if (action.type === 'start_round') {
      state.currentRound++;
      state.targetActive = false;
      state.targetAppearedAt = null;
      state.roundReacted = [];
      state.reactionTimes = {};
      state.isFake = state.hasFake && Math.random() < 0.2;

      const delay = 1000 + Math.floor(Math.random() * 3000);
      state.targetPosition = {
        x: 10 + Math.floor(Math.random() * 80),
        y: 10 + Math.floor(Math.random() * 80),
      };

      // Schedule target activation on server
      if (state._activationTimer) clearTimeout(state._activationTimer);
      state._activationTimer = setTimeout(() => {
        this.activateTarget(state);
      }, delay);

      return { newRound: state.currentRound, delay, position: state.targetPosition, isFake: state.isFake };
    }

    if (action.type === 'react') {
      // Use server-side timestamp for cheat prevention
      const reactionTime = state.targetAppearedAt ? Date.now() - state.targetAppearedAt : 0;
      state.roundReacted.push(player.id);
      if (!state.reactionTimes) state.reactionTimes = {};
      state.reactionTimes[player.id] = reactionTime;

      const position = state.roundReacted.length;
      const points = Math.max(1, 10 - (position - 1) * 2);
      state.scores[player.id] += points;

      // Include all reaction times when all have reacted
      const allReacted = state.roundReacted.length >= state.playerOrder.length;
      return { position, reactionTime, points, scoreChange: points, allReactionTimes: allReacted ? { ...state.reactionTimes } : null };
    }

    return {};
  },

  activateTarget(state) {
    state.targetActive = true;
    state.targetAppearedAt = Date.now();
  },

  checkGameEnd(state) {
    if (state.currentRound >= state.rounds && state.roundReacted.length >= state.playerOrder.length) {
      let best = null, bestScore = -1;
      for (const [pid, s] of Object.entries(state.scores)) {
        if (s > bestScore) { bestScore = s; best = pid; }
      }
      state.winner = best;
      return { finished: true, winner: best };
    }
    return { finished: false };
  },

  calculateScore(state) {
    return { ...state.scores };
  },

  getDifficulty() {
    return {
      speed: { min: 1, max: 10, curve: 'linear' },
      precision: { min: 80, max: 30, curve: 'ease-in' },
    };
  },

  serializeState(state) {
    return {
      rounds: state.rounds, currentRound: state.currentRound,
      scores: state.scores, playerOrder: state.playerOrder,
      targetActive: state.targetActive, targetPosition: state.targetPosition,
      targetSize: state.targetSize, winner: state.winner,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
  },

  destroy(state) {
    if (state?._activationTimer) clearTimeout(state._activationTimer);
  },
};
