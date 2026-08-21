import { MAX_LEVEL } from '../../../shared/constants/game.js';

// Compute difficulty parameters for any game at any level
export class DifficultyEngine {
  // Each game registers its own difficulty curve via config
  #configs = new Map();

  register(gameId, config) {
    this.#configs.set(gameId, config);
  }

  get(gameId, level) {
    const clamped = Math.max(1, Math.min(level, MAX_LEVEL));
    const config = this.#configs.get(gameId);
    if (!config) return this.#defaultCurve(clamped);
    return this.#compute(config, clamped);
  }

  #compute(config, level) {
    const t = (level - 1) / (MAX_LEVEL - 1); // 0..1
    const result = {};
    for (const [key, range] of Object.entries(config)) {
      const { min, max, curve = 'linear' } = range;
      result[key] = this.#interpolate(min, max, t, curve);
    }
    result.level = level;
    return result;
  }

  #interpolate(min, max, t, curve) {
    let v;
    switch (curve) {
      case 'ease-in':
        v = t * t;
        break;
      case 'ease-out':
        v = 1 - (1 - t) * (1 - t);
        break;
      case 'ease-in-out':
        v = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        break;
      case 'step':
        v = Math.floor(t * 10) / 10;
        break;
      default: // linear
        v = t;
    }
    const val = min + (max - min) * v;
    return Number.isInteger(min) && Number.isInteger(max) ? Math.round(val) : Math.round(val * 100) / 100;
  }

  #defaultCurve(level) {
    const t = (level - 1) / (MAX_LEVEL - 1);
    return {
      level,
      speed: Math.round(1 + t * 9),
      timeLimit: Math.round(60 - t * 45),
      complexity: Math.round(1 + t * 9),
      obstacleCount: Math.round(t * 20),
      spawnRate: Math.round((1 + t * 4) * 100) / 100,
      boardSize: Math.round(5 + t * 15),
    };
  }
}
