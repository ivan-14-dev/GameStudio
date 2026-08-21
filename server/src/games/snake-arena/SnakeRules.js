// Snake Arena — Game rules engine
import { ARENA } from '../../../../shared/constants/snakeArena.js';

/** Check win condition based on game mode */
export function checkWinCondition(state, mode) {
  const alivePlayers = [...state.players.values()].filter(p => p.alive);

  switch (mode) {
    case ARENA.MODES.SURVIVAL:
      if (alivePlayers.length <= 1) {
        return { finished: true, winner: alivePlayers[0]?.id || null };
      }
      return { finished: false };

    case ARENA.MODES.SCORE: {
      const target = state.config?.scoreTarget || 1000;
      const winner = [...state.players.values()].find(p => p.score >= target);
      if (winner) return { finished: true, winner: winner.id };
      if (alivePlayers.length === 0) return { finished: true, winner: null };
      return { finished: false };
    }

    case ARENA.MODES.RACE: {
      const objectives = state.objectives || [];
      const completed = [...state.players.entries()].find(([, p]) =>
        objectives.every(obj => obj.completedBy?.includes(p.id))
      );
      if (completed) return { finished: true, winner: completed[0] };
      if (alivePlayers.length === 0) return { finished: true, winner: null };
      return { finished: false };
    }

    case ARENA.MODES.HUNT: {
      const target = state.config?.eliminationTarget || 5;
      const hunter = [...state.players.values()].find(p => p.stats.eliminations >= target);
      if (hunter) return { finished: true, winner: hunter.id };
      if (alivePlayers.length <= 1) {
        return { finished: true, winner: alivePlayers[0]?.id || null };
      }
      return { finished: false };
    }

    case ARENA.MODES.TREASURE: {
      const target = state.config?.treasureTarget || 3;
      const finder = [...state.players.values()].find(p => p.stats.secretsFound >= target);
      if (finder) return { finished: true, winner: finder.id };
      if (alivePlayers.length === 0) return { finished: true, winner: null };
      return { finished: false };
    }

    case ARENA.MODES.DOMINATION:
      // Timer-based; highest score when timer runs out
      if (state.timer <= 0) {
        let best = null, bestScore = -1;
        for (const [id, p] of state.players) {
          if (p.score > bestScore) { bestScore = p.score; best = id; }
        }
        return { finished: true, winner: best };
      }
      return { finished: false };

    default:
      if (alivePlayers.length <= 1) {
        return { finished: true, winner: alivePlayers[0]?.id || null };
      }
      return { finished: false };
  }
}

/** Check if a player should be eliminated */
export function checkElimination(player) {
  if (!player.alive) return true;
  if (player.body.length <= 0) return true;
  return false;
}

/** Handle head-on combat between two players */
export function handleCombat(player1, player2, mode) {
  const combat = mode?.combat || ARENA.COMBAT.CLASSIC;

  if (combat === ARENA.COMBAT.PEACEFUL) return { deaths: [] };

  if (combat === ARENA.COMBAT.ADVANCED) {
    // Head-on: smaller snake dies; equal = both die
    if (player1.body.length > player2.body.length) return { deaths: [player2.id] };
    if (player2.body.length > player1.body.length) return { deaths: [player1.id] };
    return { deaths: [player1.id, player2.id] };
  }

  // CLASSIC: the one who ran into the other dies
  return { deaths: [player1.id] };
}

/** Check if a player can pass through an obstacle */
export function canPass(player, obstacle) {
  if (!obstacle) return true;
  if (player.powerups?.some(p => p.type === 'GHOST')) return true;
  if (obstacle.type === 'BREAKABLE_WALL' && obstacle.hp <= 0) return true;
  if (obstacle.collapsed) return true;
  return false;
}

/** Check if a direction change is valid */
export function isValidMove(player, direction, state) {
  if (!ARENA.DIRECTIONS[direction]) return false;
  if (ARENA.OPPOSITE[player.direction] === direction) return false;
  return true;
}

export default { checkWinCondition, checkElimination, handleCombat, canPass, isValidMove };
