// Rock Paper Scissors — 2+ players, rounds, combos
const CHOICES = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const ICONS = { rock: '🪨', paper: '📄', scissors: '✂️' };

export default {
  getMetadata() {
    return {
      id: 'rps',
      name: 'Pierre Feuille Ciseaux',
      description: 'Le classique en multijoueur avec rounds et combos',
      icon: '✊',
      minPlayers: 2,
      maxPlayers: 8,
      tickRate: 0,
      categories: ['party', 'classic'],
    };
  },

  createState(config) {
    const { difficulty } = config;
    const rounds = config.rounds || Math.max(3, 7 - Math.floor((difficulty.level || 1) / 10));
    const timePerRound = Math.max(3, 10 - Math.floor((difficulty.level || 1) / 8));
    const playerIds = (config.players || []).map((p) => p.id);

    const scores = {};
    const combos = {};
    playerIds.forEach((pid) => { scores[pid] = 0; combos[pid] = 0; });

    return {
      rounds,
      currentRound: 0,
      timePerRound,
      playerOrder: playerIds,
      scores,
      combos,
      choices: {},
      roundResults: [],
      winner: null,
    };
  },

  validateAction(state, action, player) {
    if (state.winner) return 'Game over';
    if (!action?.choice || !CHOICES.includes(action.choice)) return 'Invalid choice';
    if (state.choices[player.id]) return 'Already chose';
    return true;
  },

  applyAction(state, action, player) {
    state.choices[player.id] = action.choice;

    // Check if all players have chosen
    if (Object.keys(state.choices).length < state.playerOrder.length) {
      return { waiting: true, answeredCount: Object.keys(state.choices).length };
    }

    // Resolve round
    return this._resolveRound(state);
  },

  checkGameEnd(state) {
    if (state.currentRound >= state.rounds) {
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
    return { timeLimit: { min: 10, max: 3, curve: 'linear' } };
  },

  serializeState(state) {
    return {
      rounds: state.rounds, currentRound: state.currentRound,
      timePerRound: state.timePerRound, scores: state.scores,
      playerOrder: state.playerOrder,
      roundResults: state.roundResults,
      waitingFor: state.playerOrder.filter((pid) => !state.choices[pid]),
      winner: state.winner,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
    delete state.scores[player.id];
  },

  destroy() {},

  _resolveRound(state) {
    const choices = state.choices;
    const winners = [];

    // Each player vs each other
    for (const pid of state.playerOrder) {
      let wins = 0;
      for (const oid of state.playerOrder) {
        if (pid === oid) continue;
        if (BEATS[choices[pid]] === choices[oid]) wins++;
      }
      if (wins > 0) winners.push({ id: pid, wins });
    }

    // Award points
    for (const w of winners) {
      state.scores[w.id] += w.wins;
      state.combos[w.id]++;
      // Combo bonus
      if (state.combos[w.id] >= 3) state.scores[w.id] += state.combos[w.id];
    }

    // Reset combos for losers
    for (const pid of state.playerOrder) {
      if (!winners.some((w) => w.id === pid)) state.combos[pid] = 0;
    }

    const roundResult = {
      round: state.currentRound,
      choices: { ...choices },
      winners: winners.map((w) => w.id),
    };
    state.roundResults.push(roundResult);
    state.currentRound++;
    state.choices = {};

    return { roundResult };
  },
};
