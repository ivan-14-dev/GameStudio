// Snake Duel — 2-4 players competitive snake
const DIRECTIONS = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const OPPOSITE = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const COLORS = ['#4ade80', '#f472b6', '#60a5fa', '#facc15'];

export default {
  getMetadata() {
    return {
      id: 'snake',
      name: 'Snake Duel',
      description: 'Compétition de serpents multijoueur',
      icon: '🐍',
      minPlayers: 2,
      maxPlayers: 4,
      tickRate: 10,
      categories: ['arcade', 'action'],
    };
  },

  createState(config) {
    const { difficulty, playerCount } = config;
    const size = difficulty.boardSize || 20;
    const spawns = this._getSpawnPositions(size, playerCount);

    const snakes = {};
    const players = config.players || [];
    for (let i = 0; i < playerCount; i++) {
      const pid = players[i]?.id || `p${i}`;
      snakes[pid] = {
        body: [spawns[i]],
        direction: 'RIGHT',
        alive: true,
        score: 0,
        color: COLORS[i % COLORS.length],
      };
    }

    return {
      size,
      snakes,
      food: this._spawnFood(size, snakes),
      obstacles: difficulty.obstacleCount > 0 ? this._generateObstacles(size, difficulty.obstacleCount) : [],
      tickInterval: Math.max(80, 300 - (difficulty.speed || 1) * 25),
      tickCount: 0,
    };
  },

  validateAction(state, action, player) {
    if (!action?.direction) return 'Missing direction';
    if (!DIRECTIONS[action.direction]) return 'Invalid direction';
    const snake = state.snakes[player.id];
    if (!snake?.alive) return 'Snake is dead';
    if (action.direction === OPPOSITE[snake.direction]) return 'Cannot reverse';
    return true;
  },

  applyAction(state, action, player) {
    const snake = state.snakes[player.id];
    if (!snake?.alive) return {};
    snake.direction = action.direction;
    return { applied: true };
  },

  tick(state) {
    state.tickCount++;
    const results = [];

    for (const [pid, snake] of Object.entries(state.snakes)) {
      if (!snake.alive) continue;

      const dir = DIRECTIONS[snake.direction];
      const head = snake.body[0];
      const newHead = [head[0] + dir[0], head[1] + dir[1]];

      // Wall collision
      if (newHead[0] < 0 || newHead[0] >= state.size || newHead[1] < 0 || newHead[1] >= state.size) {
        snake.alive = false;
        results.push({ type: 'death', playerId: pid, reason: 'wall' });
        continue;
      }

      // Obstacle collision
      if (state.obstacles.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
        snake.alive = false;
        results.push({ type: 'death', playerId: pid, reason: 'obstacle' });
        continue;
      }

      // Self/other snake collision
      let collided = false;
      for (const [oid, other] of Object.entries(state.snakes)) {
        if (!other.alive) continue;
        const checkBody = oid === pid ? other.body.slice(0, -1) : other.body;
        if (checkBody.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
          snake.alive = false;
          collided = true;
          results.push({ type: 'death', playerId: pid, reason: 'collision' });
          break;
        }
      }
      if (collided) continue;

      snake.body.unshift(newHead);

      // Food check
      if (state.food && state.food[0] === newHead[0] && state.food[1] === newHead[1]) {
        snake.score += 10;
        state.food = this._spawnFood(state.size, state.snakes);
        results.push({ type: 'eat', playerId: pid, scoreChange: 10 });
      } else {
        snake.body.pop();
      }
    }

    const alive = Object.entries(state.snakes).filter(([, s]) => s.alive);
    const finished = alive.length <= 1;

    return {
      positions: Object.fromEntries(
        Object.entries(state.snakes).map(([pid, s]) => [pid, { body: s.body, head: s.body[0], length: s.body.length, alive: s.alive }])
      ),
      food: state.food,
      events: results,
      finished,
      winner: finished && alive.length === 1 ? alive[0][0] : null,
    };
  },

  checkGameEnd(state) {
    const alive = Object.entries(state.snakes).filter(([, s]) => s.alive);
    if (alive.length <= 1) {
      return { finished: true, winner: alive[0]?.[0] || null };
    }
    return { finished: false };
  },

  calculateScore(state) {
    const scores = {};
    for (const [pid, snake] of Object.entries(state.snakes)) {
      scores[pid] = snake.score;
    }
    return scores;
  },

  getDifficulty(level) {
    return {
      speed: { min: 3, max: 15, curve: 'ease-in' },
      boardSize: { min: 15, max: 30, curve: 'linear' },
      obstacleCount: { min: 0, max: 25, curve: 'ease-in' },
      spawnRate: { min: 1, max: 3, curve: 'linear' },
    };
  },

  serializeState(state) {
    return {
      size: state.size,
      snakes: Object.fromEntries(
        Object.entries(state.snakes).map(([pid, s]) => [pid, {
          body: s.body, direction: s.direction, alive: s.alive, score: s.score, color: s.color,
        }])
      ),
      food: state.food,
      obstacles: state.obstacles,
    };
  },

  handlePlayerJoin(state, player) {
    // Already handled in createState
  },

  handlePlayerLeave(state, player) {
    const snake = state.snakes[player.id];
    if (snake) snake.alive = false;
  },

  handlePlayerReconnect(state, player) {
    // State preserved, client will re-render
  },

  destroy() {},

  // Private helpers
  _getSpawnPositions(size, count) {
    const margin = 3;
    return [
      [margin, margin],
      [size - margin - 1, size - margin - 1],
      [size - margin - 1, margin],
      [margin, size - margin - 1],
    ].slice(0, count);
  },

  _spawnFood(size, snakes) {
    const occupied = new Set();
    for (const snake of Object.values(snakes)) {
      for (const [x, y] of snake.body) occupied.add(`${x},${y}`);
    }
    if (occupied.size >= size * size) return [0, 0];
    let x, y;
    do {
      x = Math.floor(Math.random() * size);
      y = Math.floor(Math.random() * size);
    } while (occupied.has(`${x},${y}`));
    return [x, y];
  },

  _generateObstacles(size, count) {
    const obstacles = [];
    const margin = 5;
    for (let i = 0; i < count; i++) {
      obstacles.push([
        margin + Math.floor(Math.random() * (size - margin * 2)),
        margin + Math.floor(Math.random() * (size - margin * 2)),
      ]);
    }
    return obstacles;
  },
};
