// Player statistics aggregation
export class StatisticsEngine {
  getPlayerStats(profile) {
    const s = profile.stats || {};
    const gamesPlayed = s.gamesPlayed || 0;
    const wins = s.wins || 0;

    return {
      gamesPlayed,
      wins,
      losses: s.losses || 0,
      winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
      bestScore: s.bestScore || 0,
      bestWinStreak: s.bestWinStreak || 0,
      currentWinStreak: s.winStreak || 0,
      totalXP: profile.totalXP || 0,
      level: profile.level || 1,
      gameLevels: profile.gameLevels || {},
      favoriteGame: this.#findFavorite(profile),
    };
  }

  #findFavorite(profile) {
    const gameLevels = profile.gameLevels || {};
    let best = null;
    let bestXP = 0;
    for (const [gameId, data] of Object.entries(gameLevels)) {
      if (data.xp > bestXP) {
        bestXP = data.xp;
        best = gameId;
      }
    }
    return best;
  }
}
