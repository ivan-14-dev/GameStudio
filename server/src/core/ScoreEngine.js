// Central score calculation engine
export class ScoreEngine {
  calculate(rawScore, context = {}) {
    const { speed = 0, combo = 0, difficulty = 1, perfect = false } = context;

    let score = rawScore;

    // Speed bonus: up to +50%
    if (speed > 0) score += Math.round(rawScore * Math.min(speed, 1) * 0.5);

    // Combo bonus: +10% per combo level, capped at +100%
    if (combo > 0) score += Math.round(rawScore * Math.min(combo * 0.1, 1));

    // Difficulty multiplier: level/10, minimum 1x
    const diffMult = Math.max(1, difficulty / 10);
    score = Math.round(score * diffMult);

    // Perfect bonus: +25%
    if (perfect) score = Math.round(score * 1.25);

    return Math.max(0, score);
  }

  calculateXP(result) {
    const { won, score = 0, difficulty = 1, playerCount = 2 } = result;
    let xp = 10; // base participation XP

    if (won) xp += 25;
    xp += Math.round(score / 100);
    xp += Math.round(difficulty * 2);
    xp += (playerCount - 2) * 5; // bonus for larger games

    return Math.max(1, xp);
  }
}
