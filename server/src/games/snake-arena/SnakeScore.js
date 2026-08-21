// Snake Arena — Score management
import { ARENA } from '../../../../shared/constants/snakeArena.js';

/** Add score to a player with combo multiplier */
export function addScore(player, amount, reason) {
  const multiplier = getMultiplier(player);
  const finalAmount = Math.round(amount * multiplier);
  player.score += finalAmount;
  return finalAmount;
}

/** Update combo state after an action (food eaten, etc.) */
export function updateCombo(player, timestamp) {
  const now = timestamp || Date.now();
  if (player.combo.lastTime && now - player.combo.lastTime > ARENA.COMBO_TIMEOUT_MS) {
    resetCombo(player);
  }
  player.combo.count++;
  player.combo.lastTime = now;

  // Upgrade multiplier at thresholds
  for (let i = ARENA.COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
    if (player.combo.count >= ARENA.COMBO_THRESHOLDS[i]) {
      player.combo.multiplier = ARENA.COMBO_MULTIPLIERS[i];
      break;
    }
  }
}

/** Reset combo to baseline */
export function resetCombo(player) {
  player.combo.count = 0;
  player.combo.multiplier = 1;
  player.combo.lastTime = 0;
}

/** Get current total multiplier (combo * powerup bonuses) */
export function getMultiplier(player) {
  let mult = player.combo.multiplier || 1;
  if (player.powerups?.some(p => p.type === 'DOUBLE_SCORE')) mult *= 2;
  return mult;
}

/** Calculate final scores for all players */
export function calculateFinalScores(state) {
  const results = {};
  for (const [id, player] of state.players) {
    const base = player.score;
    const foodBonus = player.stats.foodEaten * 2;
    const explorationBonus = player.stats.secretsFound * 50;
    const eliminationBonus = player.stats.eliminations * 100;
    const survivalBonus = player.alive ? 200 : 0;
    const lengthBonus = player.body.length * 5;
    results[id] = base + foodBonus + explorationBonus + eliminationBonus + survivalBonus + lengthBonus;
  }
  return results;
}

export default { addScore, updateCombo, resetCombo, getMultiplier, calculateFinalScores };
