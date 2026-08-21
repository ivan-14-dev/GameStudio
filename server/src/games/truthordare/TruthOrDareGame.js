// Truth or Dare — 2+ players, customizable content
import { sanitizeString } from '../../../../shared/schemas/validation.js';

const BUILTIN_TRUTHS = [
  { category: 'funny', difficulty: 1, text: 'Quel est ton moment le plus gênant ?' },
  { category: 'deep', difficulty: 2, text: 'Quel est ton plus grand rêve ?' },
  { category: 'couple', difficulty: 1, text: 'Quel est ton meilleur souvenir avec une personne proche ?' },
  { category: 'personal', difficulty: 2, text: 'Quelle est ta plus grande peur ?' },
  { category: 'funny', difficulty: 1, text: 'Quel est le surnom le plus drôle qu\'on t\'ait donné ?' },
  { category: 'memory', difficulty: 1, text: 'Quel est ton meilleur souvenir d\'enfance ?' },
  { category: 'deep', difficulty: 3, text: 'Si tu pouvais changer une chose dans ta vie, ce serait quoi ?' },
  { category: 'couple', difficulty: 2, text: 'Quel compliment te touche le plus ?' },
  { category: 'funny', difficulty: 1, text: 'Quelle est la chose la plus bizarre que tu aies mangée ?' },
  { category: 'personal', difficulty: 1, text: 'Quel est ton talent caché ?' },
  { category: 'deep', difficulty: 2, text: 'Quel conseil donnerais-tu à ton toi de 10 ans ?' },
  { category: 'funny', difficulty: 1, text: 'Quel est le mensonge le plus drôle que tu aies raconté ?' },
  { category: 'couple', difficulty: 2, text: 'Décris ton partenaire idéal en 3 mots.' },
  { category: 'personal', difficulty: 2, text: 'Quel est le truc le plus courageux que tu aies fait ?' },
  { category: 'memory', difficulty: 1, text: 'Quel est le dernier film qui t\'a fait pleurer ?' },
  { category: 'deep', difficulty: 3, text: 'Si tu pouvais vivre une époque, laquelle choisirais-tu ?' },
  { category: 'funny', difficulty: 1, text: 'Quelle est ta danse la plus ridicule ?' },
  { category: 'personal', difficulty: 2, text: 'Quel est le meilleur cadeau que tu aies reçu ?' },
  { category: 'memory', difficulty: 1, text: 'Raconte une anecdote drôle de voyage.' },
  { category: 'deep', difficulty: 2, text: 'Quelle est la leçon la plus importante que tu aies apprise ?' },
  { category: 'funny', difficulty: 1, text: 'Quel est le plat que tu rates à chaque fois ?' },
  { category: 'couple', difficulty: 1, text: 'Quelle est la chose la plus romantique qu\'on ait faite pour toi ?' },
  { category: 'personal', difficulty: 3, text: 'Si tu pouvais maîtriser un instrument, lequel serait-ce ?' },
  { category: 'memory', difficulty: 2, text: 'Quel est ton souvenir le plus marquant de l\'école ?' },
  { category: 'funny', difficulty: 1, text: 'Quelle est ta pire habitude ?' },
];

const BUILTIN_DARES = [
  { category: 'funny', difficulty: 1, text: 'Fais ton meilleur accent étranger.' },
  { category: 'creative', difficulty: 2, text: 'Invente une chanson en 30 secondes.' },
  { category: 'challenge', difficulty: 1, text: 'Fais 10 pompes.' },
  { category: 'funny', difficulty: 1, text: 'Imite un animal pendant 15 secondes.' },
  { category: 'creative', difficulty: 2, text: 'Dessine quelque chose les yeux fermés.' },
  { category: 'challenge', difficulty: 3, text: 'Tiens en équilibre sur un pied pendant 30 secondes.' },
  { category: 'funny', difficulty: 1, text: 'Fais ta meilleure imitation d\'un personnage célèbre.' },
  { category: 'creative', difficulty: 2, text: 'Raconte une blague en moins de 10 secondes.' },
  { category: 'challenge', difficulty: 1, text: 'Fais le tour de la pièce en marchant comme un crabe.' },
  { category: 'funny', difficulty: 1, text: 'Parle avec un accent pendant 2 minutes.' },
  { category: 'creative', difficulty: 2, text: 'Invente un slogan publicitaire pour un objet à côté de toi.' },
  { category: 'challenge', difficulty: 2, text: 'Fais 20 squats.' },
  { category: 'funny', difficulty: 1, text: 'Mime un film et les autres doivent deviner.' },
  { category: 'creative', difficulty: 3, text: 'Compose un poème en 1 minute.' },
  { category: 'challenge', difficulty: 1, text: 'Ne parle qu\'en chuchotant pendant 3 tours.' },
  { category: 'funny', difficulty: 2, text: 'Fais une grimace et tiens-la pendant 10 secondes.' },
  { category: 'creative', difficulty: 2, text: 'Invente un nouveau mot et sa définition.' },
  { category: 'challenge', difficulty: 2, text: 'Fais la planche pendant 20 secondes.' },
  { category: 'funny', difficulty: 1, text: 'Chante le refrain de ta chanson préférée.' },
  { category: 'challenge', difficulty: 3, text: 'Fais 5 burpees.' },
];

export default {
  getMetadata() {
    return {
      id: 'truthordare',
      name: 'Action ou Vérité',
      description: 'Le jeu classique avec du contenu personnalisable',
      icon: '🎭',
      minPlayers: 1,
      maxPlayers: 12,
      tickRate: 0,
      categories: ['party', 'social'],
    };
  },

  createState(config) {
    const { difficulty } = config;
    const rounds = config.rounds || 20;
    const mode = config.mode || 'TRUTH_OR_DARE'; // TRUTH, DARE, TRUTH_OR_DARE
    const categories = config.categories || [];
    const playerIds = (config.players || []).map((p) => p.id);

    let truths = config.customTruths
      ? config.customTruths.map((t) => ({ ...t, text: sanitizeString(t.text, 500), category: sanitizeString(t.category || '', 50) }))
      : [...BUILTIN_TRUTHS];
    let dares = config.customDares
      ? config.customDares.map((d) => ({ ...d, text: sanitizeString(d.text, 500), category: sanitizeString(d.category || '', 50) }))
      : [...BUILTIN_DARES];

    if (categories.length > 0) {
      truths = truths.filter((t) => categories.includes(t.category));
      dares = dares.filter((d) => categories.includes(d.category));
    }

    return {
      mode,
      rounds,
      currentRound: 0,
      playerOrder: playerIds,
      currentPlayerIdx: 0,
      truths,
      dares,
      currentChallenge: null,
      scores: Object.fromEntries(playerIds.map((pid) => [pid, 0])),
      history: [],
      winner: null,
    };
  },

  validateAction(state, action, player) {
    if (state.winner) return 'Game over';
    const currentPid = state.playerOrder[state.currentPlayerIdx % state.playerOrder.length];

    if (action.type === 'choose') {
      if (player.id !== currentPid) return 'Not your turn';
      if (!['truth', 'dare'].includes(action.choice)) return 'Choose truth or dare';
      if (state.mode === 'TRUTH' && action.choice !== 'truth') return 'Mode is truth only';
      if (state.mode === 'DARE' && action.choice !== 'dare') return 'Mode is dare only';
      return true;
    }

    if (action.type === 'done' || action.type === 'skip') {
      if (player.id !== currentPid) return 'Not your turn';
      return true;
    }

    if (action.type === 'vote') {
      if (player.id === currentPid) return 'Cannot vote for yourself';
      if (!state.currentChallenge) return 'No active challenge';
      return true;
    }

    return 'Invalid action';
  },

  applyAction(state, action, player) {
    if (action.type === 'choose') {
      const pool = action.choice === 'truth' ? state.truths : state.dares;
      if (pool.length === 0) return { error: 'No more challenges' };
      const idx = Math.floor(Math.random() * pool.length);
      state.currentChallenge = { ...pool[idx], choiceType: action.choice };
      return { challenge: state.currentChallenge };
    }

    if (action.type === 'done') {
      state.scores[player.id] += 10;
      state.history.push({
        round: state.currentRound,
        playerId: player.id,
        challenge: state.currentChallenge,
        completed: true,
        votes: state.votes || {},
      });
      state.currentRound++;
      state.currentPlayerIdx++;
      state.currentChallenge = null;
      state.votes = {};
      return { completed: true, scoreChange: 10 };
    }

    if (action.type === 'skip') {
      state.scores[player.id] -= 5;
      state.history.push({
        round: state.currentRound,
        playerId: player.id,
        challenge: state.currentChallenge,
        completed: false,
      });
      state.currentRound++;
      state.currentPlayerIdx++;
      state.currentChallenge = null;
      state.votes = {};
      return { skipped: true, scoreChange: -5 };
    }

    if (action.type === 'vote') {
      if (!state.votes) state.votes = {};
      state.votes[player.id] = action.vote === 'yes';
      const totalVoters = state.playerOrder.length - 1;
      const voteCount = Object.keys(state.votes).length;
      return { voted: true, voter: player.id, voteValue: action.vote === 'yes', voteCount, totalVoters };
    }

    return {};
  },

  checkGameEnd(state) {
    if (state.currentRound >= state.rounds) {
      let best = null, bestScore = -Infinity;
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
    return { complexity: { min: 1, max: 5, curve: 'linear' } };
  },

  serializeState(state) {
    return {
      mode: state.mode, rounds: state.rounds,
      currentRound: state.currentRound,
      currentPlayer: state.playerOrder[state.currentPlayerIdx % state.playerOrder.length],
      playerOrder: state.playerOrder, scores: state.scores,
      currentChallenge: state.currentChallenge,
      history: state.history.slice(-5),
      winner: state.winner,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
  },

  destroy() {},
};
