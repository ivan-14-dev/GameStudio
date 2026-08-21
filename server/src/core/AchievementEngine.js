// Achievement definitions and evaluation
export class AchievementEngine {
  #definitions = new Map();

  constructor() {
    this.#registerDefaults();
  }

  define(id, achievement) {
    this.#definitions.set(id, { id, ...achievement });
  }

  evaluate(profile) {
    const unlocked = [];
    const already = new Set(profile.achievements || []);

    for (const [id, def] of this.#definitions) {
      if (already.has(id)) continue;
      if (def.check(profile)) {
        unlocked.push(def);
        already.add(id);
      }
    }

    if (unlocked.length > 0) {
      profile.achievements = [...already];
    }
    return unlocked;
  }

  getAll() {
    return [...this.#definitions.values()];
  }

  get(id) {
    return this.#definitions.get(id) || null;
  }

  #registerDefaults() {
    const s = (p) => p.stats || {};

    this.define('FIRST_WIN', {
      name: 'Première victoire',
      description: 'Gagner une partie',
      icon: '🏆',
      check: (p) => (s(p).wins || 0) >= 1,
    });
    this.define('TEN_WINS', {
      name: '10 victoires',
      description: 'Gagner 10 parties',
      icon: '🔥',
      check: (p) => (s(p).wins || 0) >= 10,
    });
    this.define('WIN_STREAK_5', {
      name: 'Série de 5',
      description: '5 victoires consécutives',
      icon: '⚡',
      check: (p) => (s(p).bestWinStreak || 0) >= 5,
    });
    this.define('WIN_STREAK_10', {
      name: 'Inarrêtable',
      description: '10 victoires consécutives',
      icon: '💎',
      check: (p) => (s(p).bestWinStreak || 0) >= 10,
    });
    this.define('PLAY_100_GAMES', {
      name: 'Vétéran',
      description: 'Jouer 100 parties',
      icon: '🎮',
      check: (p) => (s(p).gamesPlayed || 0) >= 100,
    });
    this.define('PLAY_WITH_3_PLAYERS', {
      name: 'En bande',
      description: 'Jouer avec 3+ joueurs',
      icon: '👥',
      check: (p) => (s(p).maxPlayersInGame || 0) >= 3,
    });
  }
}
