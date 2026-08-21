// Player progression — XP, levels, per-game levels
export class ProgressionEngine {
  // XP required for each player level (level 1 = 0 XP)
  xpForLevel(level) {
    return Math.round(100 * level * (1 + level * 0.1));
  }

  addXP(profile, gameId, xpGained) {
    profile.totalXP = (profile.totalXP || 0) + xpGained;
    profile.gameLevels = profile.gameLevels || {};
    profile.gameLevels[gameId] = profile.gameLevels[gameId] || { xp: 0, level: 1 };

    const gameData = profile.gameLevels[gameId];
    gameData.xp += xpGained;

    const levelUps = [];

    // Check global level up
    while (profile.totalXP >= this.xpForLevel((profile.level || 1) + 1)) {
      profile.level = (profile.level || 1) + 1;
      levelUps.push({ type: 'global', level: profile.level });
    }

    // Check game-specific level up
    while (gameData.xp >= this.xpForLevel(gameData.level + 1)) {
      gameData.level += 1;
      levelUps.push({ type: 'game', gameId, level: gameData.level });
    }

    return levelUps;
  }

  getProgress(profile) {
    const level = profile.level || 1;
    const currentXP = profile.totalXP || 0;
    const needed = this.xpForLevel(level + 1);
    const prevNeeded = this.xpForLevel(level);
    const progress = needed > prevNeeded ? (currentXP - prevNeeded) / (needed - prevNeeded) : 0;
    return { level, currentXP, needed, progress: Math.min(1, Math.max(0, progress)) };
  }

  recordResult(profile, gameId, result) {
    profile.stats = profile.stats || {};
    profile.stats.gamesPlayed = (profile.stats.gamesPlayed || 0) + 1;

    if (result.won) {
      profile.stats.wins = (profile.stats.wins || 0) + 1;
      profile.stats.winStreak = (profile.stats.winStreak || 0) + 1;
      profile.stats.bestWinStreak = Math.max(profile.stats.bestWinStreak || 0, profile.stats.winStreak);
    } else {
      profile.stats.losses = (profile.stats.losses || 0) + 1;
      profile.stats.winStreak = 0;
    }

    if (result.score > (profile.stats.bestScore || 0)) {
      profile.stats.bestScore = result.score;
    }
  }
}
