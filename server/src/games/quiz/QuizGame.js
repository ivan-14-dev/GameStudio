// Quiz Duel — 2+ players, multiple question types
import { sanitizeString } from '../../../../shared/schemas/validation.js';

const BUILTIN_QUESTIONS = [
  { id: 'q1', type: 'multiple', category: 'general', difficulty: 1, question: 'Quelle est la capitale de la France ?', answers: ['Paris', 'Lyon', 'Marseille', 'Lille'], correctAnswer: 'Paris', timeLimit: 15 },
  { id: 'q2', type: 'truefalse', category: 'science', difficulty: 1, question: 'Le soleil est une étoile.', answers: ['Vrai', 'Faux'], correctAnswer: 'Vrai', timeLimit: 10 },
  { id: 'q3', type: 'multiple', category: 'general', difficulty: 2, question: 'Combien de continents y a-t-il ?', answers: ['5', '6', '7', '8'], correctAnswer: '7', timeLimit: 15 },
  { id: 'q4', type: 'multiple', category: 'science', difficulty: 2, question: 'Quel gaz les plantes absorbent-elles ?', answers: ['Oxygène', 'CO2', 'Azote', 'Hélium'], correctAnswer: 'CO2', timeLimit: 15 },
  { id: 'q5', type: 'truefalse', category: 'general', difficulty: 1, question: 'L\'eau bout à 100°C au niveau de la mer.', answers: ['Vrai', 'Faux'], correctAnswer: 'Vrai', timeLimit: 10 },
  { id: 'q6', type: 'multiple', category: 'history', difficulty: 3, question: 'En quelle année l\'homme a-t-il marché sur la Lune ?', answers: ['1965', '1969', '1972', '1975'], correctAnswer: '1969', timeLimit: 15 },
  { id: 'q7', type: 'multiple', category: 'geography', difficulty: 2, question: 'Quel est le plus long fleuve du monde ?', answers: ['Amazone', 'Nil', 'Yangtsé', 'Mississippi'], correctAnswer: 'Nil', timeLimit: 15 },
  { id: 'q8', type: 'multiple', category: 'science', difficulty: 3, question: 'Quel est l\'élément chimique le plus léger ?', answers: ['Hélium', 'Hydrogène', 'Lithium', 'Carbone'], correctAnswer: 'Hydrogène', timeLimit: 15 },
  { id: 'q9', type: 'multiple', category: 'geography', difficulty: 1, question: 'Quel est le plus grand océan du monde ?', answers: ['Atlantique', 'Pacifique', 'Indien', 'Arctique'], correctAnswer: 'Pacifique', timeLimit: 15 },
  { id: 'q10', type: 'truefalse', category: 'science', difficulty: 1, question: 'La Terre tourne autour du Soleil.', answers: ['Vrai', 'Faux'], correctAnswer: 'Vrai', timeLimit: 10 },
  { id: 'q11', type: 'multiple', category: 'history', difficulty: 2, question: 'Qui a peint la Joconde ?', answers: ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Botticelli'], correctAnswer: 'Léonard de Vinci', timeLimit: 15 },
  { id: 'q12', type: 'multiple', category: 'geography', difficulty: 2, question: 'Quelle est la capitale du Japon ?', answers: ['Pékin', 'Séoul', 'Tokyo', 'Bangkok'], correctAnswer: 'Tokyo', timeLimit: 15 },
  { id: 'q13', type: 'multiple', category: 'science', difficulty: 2, question: 'Combien d\'os a le corps humain adulte ?', answers: ['186', '206', '226', '256'], correctAnswer: '206', timeLimit: 15 },
  { id: 'q14', type: 'truefalse', category: 'general', difficulty: 1, question: 'Un octogone a 8 côtés.', answers: ['Vrai', 'Faux'], correctAnswer: 'Vrai', timeLimit: 10 },
  { id: 'q15', type: 'multiple', category: 'history', difficulty: 3, question: 'Quelle civilisation a construit Machu Picchu ?', answers: ['Aztèques', 'Mayas', 'Incas', 'Olmèques'], correctAnswer: 'Incas', timeLimit: 15 },
  { id: 'q16', type: 'multiple', category: 'science', difficulty: 3, question: 'Quel est le plus grand organe du corps humain ?', answers: ['Le foie', 'Le cerveau', 'La peau', 'Les poumons'], correctAnswer: 'La peau', timeLimit: 15 },
  { id: 'q17', type: 'multiple', category: 'geography', difficulty: 1, question: 'Sur quel continent se trouve l\'Égypte ?', answers: ['Asie', 'Europe', 'Afrique', 'Amérique'], correctAnswer: 'Afrique', timeLimit: 15 },
  { id: 'q18', type: 'multiple', category: 'general', difficulty: 2, question: 'Combien de couleurs y a-t-il dans un arc-en-ciel ?', answers: ['5', '6', '7', '8'], correctAnswer: '7', timeLimit: 15 },
  { id: 'q19', type: 'truefalse', category: 'science', difficulty: 2, question: 'Le son se propage dans le vide.', answers: ['Vrai', 'Faux'], correctAnswer: 'Faux', timeLimit: 10 },
  { id: 'q20', type: 'multiple', category: 'history', difficulty: 2, question: 'Quel pays a offert la Statue de la Liberté aux États-Unis ?', answers: ['Angleterre', 'France', 'Espagne', 'Allemagne'], correctAnswer: 'France', timeLimit: 15 },
  { id: 'q21', type: 'multiple', category: 'science', difficulty: 3, question: 'Quelle planète est la plus proche du Soleil ?', answers: ['Vénus', 'Mars', 'Mercure', 'Terre'], correctAnswer: 'Mercure', timeLimit: 15 },
  { id: 'q22', type: 'multiple', category: 'geography', difficulty: 3, question: 'Quel est le pays le plus peuplé du monde ?', answers: ['États-Unis', 'Inde', 'Chine', 'Indonésie'], correctAnswer: 'Inde', timeLimit: 15 },
  { id: 'q23', type: 'truefalse', category: 'general', difficulty: 2, question: 'La Grande Muraille de Chine est visible depuis l\'espace.', answers: ['Vrai', 'Faux'], correctAnswer: 'Faux', timeLimit: 10 },
  { id: 'q24', type: 'multiple', category: 'science', difficulty: 2, question: 'De quoi est principalement composée l\'atmosphère terrestre ?', answers: ['Oxygène', 'Azote', 'CO2', 'Hélium'], correctAnswer: 'Azote', timeLimit: 15 },
  { id: 'q25', type: 'multiple', category: 'history', difficulty: 3, question: 'En quelle année a commencé la Première Guerre mondiale ?', answers: ['1912', '1914', '1916', '1918'], correctAnswer: '1914', timeLimit: 15 },
  { id: 'q26', type: 'multiple', category: 'geography', difficulty: 1, question: 'Quelle est la monnaie utilisée au Japon ?', answers: ['Yuan', 'Won', 'Yen', 'Baht'], correctAnswer: 'Yen', timeLimit: 15 },
  { id: 'q27', type: 'truefalse', category: 'science', difficulty: 1, question: 'Les diamants sont faits de carbone.', answers: ['Vrai', 'Faux'], correctAnswer: 'Vrai', timeLimit: 10 },
  { id: 'q28', type: 'multiple', category: 'general', difficulty: 2, question: 'Combien de joueurs y a-t-il dans une équipe de football ?', answers: ['9', '10', '11', '12'], correctAnswer: '11', timeLimit: 15 },
  { id: 'q29', type: 'multiple', category: 'science', difficulty: 3, question: 'Quel est le symbole chimique de l\'or ?', answers: ['Or', 'Au', 'Ag', 'Fe'], correctAnswer: 'Au', timeLimit: 15 },
  { id: 'q30', type: 'multiple', category: 'history', difficulty: 2, question: 'Qui a découvert l\'Amérique en 1492 ?', answers: ['Magellan', 'Christophe Colomb', 'Vasco de Gama', 'Marco Polo'], correctAnswer: 'Christophe Colomb', timeLimit: 15 },
];

export default {
  getMetadata() {
    return {
      id: 'quiz',
      name: 'Quiz Duel',
      description: 'Testez vos connaissances en duel',
      icon: '❓',
      minPlayers: 2,
      maxPlayers: 8,
      tickRate: 0,
      categories: ['trivia', 'knowledge'],
    };
  },

  createState(config) {
    const { difficulty } = config;
    const questionCount = config.questionCount || 10;
    const playerIds = (config.players || []).map((p) => p.id);
    const scores = {};
    playerIds.forEach((pid) => { scores[pid] = 0; });

    // Sanitize custom questions if provided
    let pool;
    if (config.customQuestions) {
      pool = config.customQuestions.map((q) => ({
        ...q,
        question: sanitizeString(q.question, 500),
        answers: (q.answers || []).map((a) => sanitizeString(a, 200)),
        correctAnswer: sanitizeString(q.correctAnswer, 200),
        category: sanitizeString(q.category || '', 50),
      }));
    } else {
      pool = [...BUILTIN_QUESTIONS];
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return {
      questions: pool.slice(0, questionCount),
      currentQuestion: 0,
      playerOrder: playerIds,
      scores,
      answers: {},
      questionResults: [],
      winner: null,
      _questionTimer: null,
      questionStartedAt: null,
    };
  },

  validateAction(state, action, player) {
    if (state.winner) return 'Game over';
    if (!action?.answer) return 'Missing answer';
    if (state.answers[player.id]) return 'Already answered';
    return true;
  },

  applyAction(state, action, player) {
    const q = state.questions[state.currentQuestion];
    if (!q) return {};

    state.answers[player.id] = {
      answer: action.answer,
      timestamp: Date.now(),
    };

    // Check if all answered
    if (Object.keys(state.answers).length < state.playerOrder.length) {
      return { waiting: true, answeredCount: Object.keys(state.answers).length };
    }

    // All answered — clear timer and resolve
    if (state._questionTimer) { clearTimeout(state._questionTimer); state._questionTimer = null; }
    return this._resolveQuestion(state);
  },

  checkGameEnd(state) {
    if (state.currentQuestion >= state.questions.length) {
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
      timeLimit: { min: 20, max: 5, curve: 'linear' },
      complexity: { min: 1, max: 5, curve: 'ease-in' },
    };
  },

  serializeState(state) {
    const q = state.questions[state.currentQuestion];
    return {
      currentQuestion: state.currentQuestion,
      totalQuestions: state.questions.length,
      question: q ? {
        type: q.type,
        category: q.category,
        question: q.question,
        answers: q.answers,
        timeLimit: q.timeLimit,
      } : null,
      scores: state.scores,
      playerOrder: state.playerOrder,
      answeredCount: Object.keys(state.answers).length,
      questionResults: state.questionResults,
      winner: state.winner,
    };
  },

  handlePlayerLeave(state, player) {
    state.playerOrder = state.playerOrder.filter((pid) => pid !== player.id);
    // If all remaining players have answered, resolve
    if (Object.keys(state.answers).length >= state.playerOrder.length && state.playerOrder.length > 0) {
      if (state._questionTimer) { clearTimeout(state._questionTimer); state._questionTimer = null; }
      this._resolveQuestion(state);
    }
  },

  destroy(state) {
    if (state?._questionTimer) clearTimeout(state._questionTimer);
  },

  _resolveQuestion(state) {
    const q = state.questions[state.currentQuestion];
    const results = {};
    const timeLimit = (q.timeLimit || 15) * 1000;

    for (const [pid, ans] of Object.entries(state.answers)) {
      const correct = ans.answer === q.correctAnswer;
      // Speed bonus: faster answers get more points (max 15, min 5)
      const elapsed = state.questionStartedAt ? ans.timestamp - state.questionStartedAt : timeLimit;
      const speedBonus = correct ? Math.max(0, Math.round(5 * (1 - elapsed / timeLimit))) : 0;
      const points = correct ? 10 + speedBonus : 0;
      state.scores[pid] += points;
      results[pid] = { correct, answer: ans.answer, points, speedBonus };
    }

    state.questionResults.push({
      question: state.currentQuestion,
      correctAnswer: q.correctAnswer,
      results,
    });

    state.currentQuestion++;
    state.answers = {};
    state.questionStartedAt = Date.now();

    // Set timer for next question
    const nextQ = state.questions[state.currentQuestion];
    if (nextQ) {
      if (state._questionTimer) clearTimeout(state._questionTimer);
      state._questionTimer = setTimeout(() => {
        this._resolveQuestion(state);
      }, (nextQ.timeLimit || 15) * 1000);
    }

    return { questionResolved: true, correctAnswer: q.correctAnswer, results };
  },
};
