// Snake Arena — Main game module
import { ARENA, SNAKE_EVENTS } from '../../../../shared/constants/snakeArena.js';
import SnakeWorld from './SnakeWorld.js';
import SnakeMap from './SnakeMap.js';
import SnakePhysics from './SnakePhysics.js';
import SnakeCollision from './SnakeCollision.js';
import SnakeFood from './SnakeFood.js';
import SnakeObstacle from './SnakeObstacle.js';
import SnakePortal from './SnakePortal.js';
import SnakePowerup from './SnakePowerup.js';
import SnakeEventEngine from './SnakeEventEngine.js';
import SnakeRules from './SnakeRules.js';
import SnakeScore from './SnakeScore.js';
import SnakeLevel from './SnakeLevel.js';

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export default {
  getMetadata() {
    return {
      id: 'snake-arena',
      name: 'Snake Arena',
      description: 'Arène de serpents multijoueur avec pouvoirs et événements dynamiques',
      icon: '🐍',
      minPlayers: 2,
      maxPlayers: 8,
      tickRate: 10,
      categories: ['arcade', 'action', 'strategy'],
    };
  },

  createState(config) {
    const { difficulty, playerCount, players = [] } = config;
    const seed = config.seed || Date.now();
    const rng = mulberry32(seed);
    const level = difficulty?.level || 1;
    const mode = config.mode || ARENA.MODES.SURVIVAL;

    const levelConfig = SnakeLevel.getLevelConfig(level);
    const mapSize = levelConfig.mapSize;

    // Generate map
    const mapData = SnakeMap.generate(seed, mapSize, level);

    // Create world
    const world = new SnakeWorld(mapSize);
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        world.setCellAt(x, y, mapData.cells[y][x]);
      }
    }
    for (const [key, val] of mapData.terrain) {
      const [tx, ty] = key.split(',').map(Number);
      world.setTerrain(tx, ty, val);
    }

    // Spawn players at safe positions
    const playerMap = new Map();
    for (let i = 0; i < playerCount; i++) {
      const pid = players[i]?.id || `p${i}`;
      const name = players[i]?.name || `Player ${i + 1}`;
      const spawn = mapData.spawns[i % mapData.spawns.length];
      // Face toward center of map
      const cx = mapSize / 2, cy = mapSize / 2;
      const dx = cx - spawn.x, dy = cy - spawn.y;
      let direction;
      if (Math.abs(dx) >= Math.abs(dy)) {
        direction = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        direction = dy > 0 ? 'DOWN' : 'UP';
      }
      playerMap.set(pid, {
        id: pid,
        name,
        color: ARENA.COLORS[i % ARENA.COLORS.length],
        body: [[spawn.x, spawn.y]],
        direction,
        alive: true,
        score: 0,
        length: 1,
        powerups: [],
        combo: { count: 0, multiplier: 1, lastTime: 0 },
        stats: { foodEaten: 0, secretsFound: 0, eliminations: 0, exploration: 0 },
        status: 'active',
        _terrainSpeedMod: 1.0,
      });
    }

    // Create obstacles
    const obstacles = SnakeObstacle.createObstacles(mapData, level, rng);

    // Create portals
    const portals = SnakePortal.createPortals(mapData);

    // Event engine
    const eventEngine = new SnakeEventEngine(seed + 1);

    // Build state
    const state = {
      gameId: config.gameId || `arena_${seed}`,
      roomId: config.roomId || null,
      mode,
      seed,
      level,
      mapSize,
      map: { cells: mapData.cells, walls: mapData.walls, terrain: mapData.terrain },
      players: playerMap,
      food: [],
      powerups: [],
      portals,
      secrets: mapData.secrets.map(s => ({ ...s, found: false })),
      obstacles,
      events: { active: [], history: [] },
      objectives: [],
      tickCount: 0,
      timer: config.timer || 0,
      config: {
        combat: config.combat || ARENA.COMBAT.CLASSIC,
        scoreTarget: config.scoreTarget || 1000,
        eliminationTarget: config.eliminationTarget || 5,
        treasureTarget: config.treasureTarget || 3,
        ...levelConfig,
      },
      _world: world,
      _eventEngine: eventEngine,
      _rng: rng,
    };

    // Initial food
    const foodCount = Math.floor(mapSize * mapSize * (levelConfig.foodDensity || 0.003));
    SnakeFood.spawnFood(state, Math.min(foodCount, 50), rng);

    return state;
  },

  validateAction(state, action, player) {
    if (!action?.type) return 'Missing action type';

    if (action.type === 'direction') {
      if (!ARENA.DIRECTIONS[action.direction]) return 'Invalid direction';
      const snake = state.players.get(player.id);
      if (!snake?.alive) return 'Snake is dead';
      if (ARENA.OPPOSITE[snake.direction] === action.direction) return 'Cannot reverse';
      // Rate limit: max 1 direction change per tick
      const now = Date.now();
      if (snake._lastDirChange && now - snake._lastDirChange < 50) return 'Too fast';
      snake._lastDirChange = now;
      return true;
    }

    if (action.type === 'use_powerup') {
      const snake = state.players.get(player.id);
      if (!snake?.alive) return 'Snake is dead';
      if (!snake.powerups.length) return 'No powerups available';
      return true;
    }

    return 'Unknown action type';
  },

  applyAction(state, action, player) {
    const snake = state.players.get(player.id);
    if (!snake?.alive) return {};

    if (action.type === 'direction') {
      snake.direction = action.direction;
      return { applied: true };
    }

    if (action.type === 'use_powerup') {
      // Activate held powerup — handled in tick
      snake._pendingPowerup = action.powerupId || null;
      return { applied: true };
    }

    return {};
  },

  tick(state) {
    state.tickCount++;
    const results = [];
    const rng = state._rng;

    // Update terrain effects
    for (const [, player] of state.players) {
      if (!player.alive) continue;
      const head = player.body[0];
      const terrain = state._world.getTerrainAt(head[0], head[1]);
      SnakePhysics.applyTerrain(player, terrain);
    }

    // Move snakes
    for (const [pid, player] of state.players) {
      if (!player.alive) continue;
      if (!SnakePhysics.shouldMoveThisTick(player, state.tickCount)) continue;

      const newHead = SnakePhysics.moveSnake(player, state);
      player.body.unshift(newHead);

      // Trim tail to match length
      while (player.body.length > player.length) {
        player.body.pop();
      }
    }

    // Check all collisions
    const SPAWN_PROTECTION_TICKS = 30; // 3 seconds of invincibility
    const collisions = SnakeCollision.checkAll(state);
    for (const col of collisions) {
      const player = state.players.get(col.playerId);
      if (!player) continue;

      // Skip lethal collisions during spawn protection
      const isProtected = state.tickCount <= SPAWN_PROTECTION_TICKS;

      switch (col.type) {
        case 'wall':
        case 'self':
          if (!SnakePowerup.hasActivePowerup(player, 'GHOST') && !isProtected) {
            player.alive = false;
            player.status = 'eliminated';
            results.push({ type: SNAKE_EVENTS.PLAYER_ELIMINATED, playerId: col.playerId, reason: col.type });
          } else if (isProtected && col.type === 'wall') {
            // Bounce: reverse direction and undo the move
            const opposites = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
            player.direction = opposites[player.direction] || 'RIGHT';
            player.body[0] = player.body.length > 1 ? [...player.body[1]] : [Math.floor(state.mapSize / 2), Math.floor(state.mapSize / 2)];
          }
          break;

        case 'obstacle':
          if (!SnakeObstacle.isPassable(col.obstacle, player) && !isProtected) {
            if (col.obstacle.type === 'BREAKABLE_WALL') {
              const destroyed = SnakeObstacle.damageObstacle(col.obstacle, 1);
              if (destroyed) results.push({ type: SNAKE_EVENTS.OBSTACLE_DESTROYED, obstacle: col.obstacle });
            }
            player.alive = false;
            player.status = 'eliminated';
            results.push({ type: SNAKE_EVENTS.PLAYER_ELIMINATED, playerId: col.playerId, reason: 'obstacle' });
          }
          break;

        case 'snake': {
          const other = state.players.get(col.otherId);
          if (!other) break;
          if (col.hitHead && !isProtected) {
            const { deaths } = SnakeRules.handleCombat(player, other, state.config);
            for (const did of deaths) {
              const dead = state.players.get(did);
              if (dead) {
                dead.alive = false;
                dead.status = 'eliminated';
                const killer = did === col.playerId ? col.otherId : col.playerId;
                const killerPlayer = state.players.get(killer);
                if (killerPlayer) killerPlayer.stats.eliminations++;
                results.push({ type: SNAKE_EVENTS.PLAYER_ELIMINATED, playerId: did, reason: 'combat' });
              }
            }
          } else {
            player.alive = false;
            player.status = 'eliminated';
            other.stats.eliminations++;
            results.push({ type: SNAKE_EVENTS.PLAYER_ELIMINATED, playerId: col.playerId, reason: 'collision' });
          }
          break;
        }

        case 'food':
          SnakeScore.updateCombo(player, Date.now());
          SnakeFood.collectFood(player, col.food, state);
          SnakeScore.addScore(player, col.food.points, 'food');
          player.length = Math.max(1, player.length + col.food.growth);
          results.push({ type: SNAKE_EVENTS.FOOD_COLLECTED, playerId: col.playerId, food: col.food });
          break;

        case 'powerup':
          SnakePowerup.collectPowerup(player, col.powerup, state);
          results.push({ type: SNAKE_EVENTS.POWERUP_COLLECTED, playerId: col.playerId, powerup: col.powerup });
          break;

        case 'portal':
          if (SnakePortal.enterPortal(player, col.portal, state.tickCount)) {
            results.push({ type: SNAKE_EVENTS.PORTAL_ENTERED, playerId: col.playerId, portal: col.portal });
          }
          break;

        case 'secret':
          col.secret.found = true;
          player.stats.secretsFound++;
          SnakeScore.addScore(player, col.secret.reward, 'secret');
          results.push({ type: SNAKE_EVENTS.SECRET_FOUND, playerId: col.playerId, secret: col.secret });
          break;

        case 'trap':
          col.trap.triggered = true;
          // Shrink player
          const shrink = col.trap.damage || 3;
          player.body.splice(Math.max(1, player.body.length - shrink));
          player.length = player.body.length;
          SnakeScore.resetCombo(player);
          results.push({ type: SNAKE_EVENTS.TRAP_TRIGGERED, playerId: col.playerId });
          break;
      }
    }

    // Update dynamic obstacles
    SnakeObstacle.updateObstacles(state.obstacles, state.tickCount, state.map);

    // Update portals
    SnakePortal.updatePortals(state.portals, state.tickCount);

    // Update active powerups
    SnakePowerup.updatePowerups(state.players, state.tickCount);

    // Respawn food if needed
    const targetFood = Math.floor(state.mapSize * state.mapSize * (state.config.foodDensity || 0.003));
    if (state.food.length < targetFood * 0.5) {
      SnakeFood.spawnFood(state, Math.min(5, targetFood - state.food.length), rng);
    }

    // Spawn powerups occasionally
    if (state.config.features?.includes('powerups') && state.tickCount % 100 === 0 && state.powerups.length < 5) {
      SnakePowerup.spawnPowerup(state, rng);
    }

    // Process dynamic events
    if (state._eventEngine) {
      const eventResults = state._eventEngine.update(state, state.tickCount);
      for (const er of eventResults) {
        if (er.action === 'start') {
          state.events.active.push(er.event);
          applyEventEffect(er.event, state, rng);
          results.push({ type: SNAKE_EVENTS.EVENT_STARTED, event: er.event });
        } else {
          state.events.active = state.events.active.filter(e => e.id !== er.event.id);
          state.events.history.push(er.event);
          results.push({ type: SNAKE_EVENTS.EVENT_ENDED, event: er.event });
        }
      }
    }

    // Timer
    if (state.timer > 0) state.timer--;

    // Check game end
    const endCheck = this.checkGameEnd(state);

    // Build positions snapshot for clients
    const positions = {};
    for (const [pid, p] of state.players) {
      positions[pid] = {
        body: p.body,
        direction: p.direction,
        alive: p.alive,
        score: p.score,
        length: p.length,
        color: p.color,
        combo: p.combo,
      };
    }

    return {
      tickCount: state.tickCount,
      positions,
      food: state.food.map(f => ({ x: f.x, y: f.y, type: f.type })),
      powerups: state.powerups.filter(p => !p.collected).map(p => ({ x: p.x, y: p.y, type: p.type })),
      portals: state.portals.filter(p => p.active).map(p => ({ x: p.x, y: p.y, id: p.id })),
      obstacles: state.obstacles,
      events: results,
      timer: state.timer,
      level: state.level,
      finished: endCheck.finished,
      winner: endCheck.winner,
    };
  },

  checkGameEnd(state) {
    return SnakeRules.checkWinCondition(state, state.mode);
  },

  calculateScore(state) {
    return SnakeScore.calculateFinalScores(state);
  },

  serializeState(state) {
    const players = {};
    for (const [id, p] of state.players) {
      players[id] = {
        id: p.id, name: p.name, color: p.color,
        body: p.body, direction: p.direction,
        alive: p.alive, score: p.score, length: p.length,
        powerups: p.powerups.map(pu => ({ type: pu.type, expiresAt: pu.expiresAt })),
        combo: p.combo, stats: p.stats, status: p.status,
      };
    }
    return {
      gameId: state.gameId, roomId: state.roomId,
      mode: state.mode, level: state.level, mapSize: state.mapSize,
      map: { cells: state.map.cells, walls: state.map.walls },
      players, food: state.food, powerups: state.powerups.filter(p => !p.collected),
      portals: state.portals.filter(p => p.active),
      secrets: state.secrets.filter(s => !s.found),
      obstacles: state.obstacles,
      events: { active: state.events.active },
      objectives: state.objectives,
      tickCount: state.tickCount, timer: state.timer,
    };
  },

  getDifficulty() {
    return {
      level: { min: 1, max: 50, curve: 'linear' },
      speed: { min: 1, max: 20, curve: 'ease-in' },
      foodDensity: { min: 0.001, max: 0.005, curve: 'linear' },
      obstacleCount: { min: 0, max: 40, curve: 'ease-in' },
    };
  },

  handlePlayerJoin(state, player) {
    if (state.players.has(player.id)) return;
    const spawn = findSafeSpawn(state);
    const cx = state.mapSize / 2, cy = state.mapSize / 2;
    const dx = cx - spawn.x, dy = cy - spawn.y;
    let direction;
    if (Math.abs(dx) >= Math.abs(dy)) {
      direction = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      direction = dy > 0 ? 'DOWN' : 'UP';
    }
    state.players.set(player.id, {
      id: player.id,
      name: player.name || 'Player',
      color: ARENA.COLORS[state.players.size % ARENA.COLORS.length],
      body: [[spawn.x, spawn.y]],
      direction,
      alive: true, score: 0, length: 1,
      powerups: [],
      combo: { count: 0, multiplier: 1, lastTime: 0 },
      stats: { foodEaten: 0, secretsFound: 0, eliminations: 0, exploration: 0 },
      status: 'active',
      _terrainSpeedMod: 1.0,
    });
  },

  handlePlayerLeave(state, player) {
    const snake = state.players.get(player.id);
    if (snake) {
      snake.alive = false;
      snake.status = 'disconnected';
    }
  },

  handlePlayerReconnect(state, player) {
    const snake = state.players.get(player.id);
    if (snake) {
      snake.status = snake.alive ? 'active' : 'eliminated';
    }
  },

  destroy() {},
};

/** Apply event side-effects to the game state */
function applyEventEffect(event, state, rng) {
  switch (event.type) {
    case 'FOOD_RUSH':
      SnakeFood.spawnFood(state, 20, rng);
      break;
    case 'GOLDEN_FOOD':
      SnakeFood.spawnFood(state, 5, rng);
      break;
    case 'SPEED_WAVE':
      for (const [, p] of state.players) {
        if (p.alive) p._terrainSpeedMod = 1.5;
      }
      break;
    case 'PORTAL_SHIFT':
      SnakePortal.updatePortals(state.portals, state.tickCount);
      break;
    default:
      break;
  }
}

function findSafeSpawn(state) {
  const rng = state._rng;
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(rng() * (state.mapSize - 10)) + 5;
    const y = Math.floor(rng() * (state.mapSize - 10)) + 5;
    if (state.map.cells[y]?.[x] !== 0) continue;
    let safe = true;
    for (const [, p] of state.players) {
      for (const [bx, by] of p.body) {
        if (Math.abs(bx - x) < 5 && Math.abs(by - y) < 5) { safe = false; break; }
      }
      if (!safe) break;
    }
    if (safe) return { x, y };
  }
  return { x: Math.floor(state.mapSize / 2), y: Math.floor(state.mapSize / 2) };
}
