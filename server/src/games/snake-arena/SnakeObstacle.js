// Snake Arena — Obstacle management
import { ARENA } from '../../../../shared/constants/snakeArena.js';

let obstacleIdCounter = 0;

/** Create obstacles based on map data and level */
export function createObstacles(map, level, rng) {
  const obstacles = [];

  if (level < 6) return obstacles;

  // Moving walls at level 16+
  if (level >= 16) {
    const count = Math.min(Math.floor((level - 15) / 2) + 1, 6);
    for (let i = 0; i < count; i++) {
      const pos = findOpenPosition(map, rng);
      if (!pos) continue;
      obstacles.push({
        id: `obs_${++obstacleIdCounter}`,
        x: pos[0], y: pos[1], type: 'MOVING_WALL',
        dx: rng() > 0.5 ? 1 : -1, dy: 0,
        moveInterval: 10 + Math.floor(rng() * 10),
        lastMove: 0,
      });
    }
  }

  // Breakable walls at level 11+
  if (level >= 11) {
    const count = Math.floor(level / 3);
    for (let i = 0; i < count; i++) {
      const pos = findOpenPosition(map, rng);
      if (!pos) continue;
      obstacles.push({
        id: `obs_${++obstacleIdCounter}`,
        x: pos[0], y: pos[1], type: 'BREAKABLE_WALL',
        hp: 3, maxHp: 3,
      });
    }
  }

  // Traps at level 16+
  if (level >= 16) {
    const count = Math.floor((level - 15) / 2) + 2;
    for (let i = 0; i < count; i++) {
      const pos = findOpenPosition(map, rng);
      if (!pos) continue;
      obstacles.push({
        id: `obs_${++obstacleIdCounter}`,
        x: pos[0], y: pos[1], type: 'TRAP',
        triggered: false, damage: 3,
      });
    }
  }

  // Rotating obstacles at level 21+
  if (level >= 21) {
    const count = Math.floor((level - 20) / 3) + 1;
    for (let i = 0; i < count; i++) {
      const pos = findOpenPosition(map, rng);
      if (!pos) continue;
      obstacles.push({
        id: `obs_${++obstacleIdCounter}`,
        x: pos[0], y: pos[1], type: 'ROTATING_OBSTACLE',
        angle: 0, rotationSpeed: 1, radius: 2,
        arms: generateArms(pos[0], pos[1], 2),
      });
    }
  }

  return obstacles;
}

/** Update dynamic obstacles each tick */
export function updateObstacles(obstacles, tickCount, map) {
  for (const obs of obstacles) {
    if (obs.type === 'MOVING_WALL' && tickCount - obs.lastMove >= obs.moveInterval) {
      const newX = obs.x + obs.dx;
      const newY = obs.y + obs.dy;
      const size = map.cells.length;
      if (newX > 0 && newX < size - 1 && newY > 0 && newY < size - 1 && map.cells[newY][newX] === 0) {
        obs.x = newX; obs.y = newY;
      } else {
        obs.dx = -obs.dx; obs.dy = -obs.dy;
      }
      obs.lastMove = tickCount;
    }

    if (obs.type === 'ROTATING_OBSTACLE') {
      obs.angle = (obs.angle + obs.rotationSpeed) % 360;
      obs.arms = generateArms(obs.x, obs.y, obs.radius, obs.angle);
    }

    if (obs.type === 'COLLAPSING_BLOCK' && obs.collapseAt && tickCount >= obs.collapseAt) {
      obs.collapsed = true;
    }
  }
}

/** Damage a breakable obstacle */
export function damageObstacle(obstacle, amount) {
  if (obstacle.type !== 'BREAKABLE_WALL') return false;
  obstacle.hp -= amount;
  return obstacle.hp <= 0;
}

/** Check if an obstacle is passable (e.g., ghost powerup) */
export function isPassable(obstacle, player) {
  if (!obstacle) return true;
  if (obstacle.collapsed) return true;
  if (player.powerups?.some(p => p.type === 'GHOST')) return true;
  if (obstacle.type === 'TRAP' && obstacle.triggered) return true;
  return false;
}

function findOpenPosition(map, rng) {
  const size = map.cells.length;
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(rng() * (size - 4)) + 2;
    const y = Math.floor(rng() * (size - 4)) + 2;
    if (map.cells[y][x] === 0) return [x, y];
  }
  return null;
}

function generateArms(cx, cy, radius, angle = 0) {
  const arms = [];
  const rad = (angle * Math.PI) / 180;
  for (let i = 0; i < 4; i++) {
    const a = rad + (i * Math.PI) / 2;
    for (let r = 1; r <= radius; r++) {
      arms.push([cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r)]);
    }
  }
  return arms;
}

export default { createObstacles, updateObstacles, damageObstacle, isPassable };
