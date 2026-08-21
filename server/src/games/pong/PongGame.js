// Pong Duel — 2-4 players
const CANVAS_W = 800;
const CANVAS_H = 600;
const PADDLE_W = 15;
const BALL_RADIUS = 8;
const MAX_BALL_SPEED = 12;
const NETWORK_TICK_DIVISOR = 3; // send network updates every 3rd tick

export default {
  getMetadata() {
    return {
      id: 'pong',
      name: 'Pong Duel',
      description: 'Le classique revisité en multijoueur',
      icon: '🏓',
      minPlayers: 2,
      maxPlayers: 4,
      tickRate: 60,
      categories: ['arcade', 'sport'],
    };
  },

  createState(config) {
    const { difficulty, playerCount } = config;
    const paddleH = Math.max(40, 120 - (difficulty.level || 1) * 2);
    const ballSpeed = 3 + (difficulty.speed || 1) * 0.5;

    const paddles = {};
    const scores = {};
    const positions = this._getPositions(playerCount);

    for (let i = 0; i < playerCount; i++) {
      const pid = config.players?.[i]?.id || `p${i}`;
      const pos = positions[i];
      if (pos.horizontal) {
        // Horizontal paddle (top/bottom)
        paddles[pid] = {
          x: pos.x,
          y: pos.y,
          width: paddleH, // swap dimensions for horizontal
          height: PADDLE_W,
          side: pos.side,
        };
      } else {
        paddles[pid] = {
          x: pos.x,
          y: CANVAS_H / 2 - paddleH / 2,
          width: PADDLE_W,
          height: paddleH,
          side: pos.side,
        };
      }
      scores[pid] = 0;
    }

    return {
      width: CANVAS_W,
      height: CANVAS_H,
      paddles,
      scores,
      ball: { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: ballSpeed, vy: ballSpeed * 0.7 },
      ballSpeed,
      maxScore: Math.max(5, 15 - Math.floor((difficulty.level || 1) / 5)),
      paused: false,
      tickCount: 0,
    };
  },

  validateAction(state, action, player) {
    if (!action?.move) return 'Invalid move';
    const paddle = state.paddles[player.id];
    if (!paddle) return 'No paddle';
    // Horizontal paddles (top/bottom) use left/right, vertical paddles (left/right) use up/down
    if (paddle.side === 'top' || paddle.side === 'bottom') {
      if (!['left', 'right'].includes(action.move)) return 'Invalid move';
    } else {
      if (!['up', 'down'].includes(action.move)) return 'Invalid move';
    }
    return true;
  },

  applyAction(state, action, player) {
    const paddle = state.paddles[player.id];
    if (!paddle) return {};
    const speed = 8;
    if (paddle.side === 'top' || paddle.side === 'bottom') {
      if (action.move === 'left') paddle.x = Math.max(0, paddle.x - speed);
      if (action.move === 'right') paddle.x = Math.min(state.width - paddle.width, paddle.x + speed);
    } else {
      if (action.move === 'up') paddle.y = Math.max(0, paddle.y - speed);
      if (action.move === 'down') paddle.y = Math.min(state.height - paddle.height, paddle.y + speed);
    }
    return { applied: true };
  },

  tick(state) {
    if (state.paused) return null;
    state.tickCount = (state.tickCount || 0) + 1;

    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;

    const hasTopBottom = Object.values(state.paddles).some(p => p.side === 'top' || p.side === 'bottom');

    // Wall bounce only on sides without paddles
    if (!hasTopBottom) {
      if (ball.y - BALL_RADIUS <= 0) { ball.vy = Math.abs(ball.vy); ball.y = BALL_RADIUS; }
      if (ball.y + BALL_RADIUS >= state.height) { ball.vy = -Math.abs(ball.vy); ball.y = state.height - BALL_RADIUS; }
    }

    // Paddle collision
    for (const [pid, paddle] of Object.entries(state.paddles)) {
      if (ball.x + BALL_RADIUS >= paddle.x && ball.x - BALL_RADIUS <= paddle.x + paddle.width &&
          ball.y + BALL_RADIUS >= paddle.y && ball.y - BALL_RADIUS <= paddle.y + paddle.height) {
        if (paddle.side === 'top' || paddle.side === 'bottom') {
          ball.vy = -ball.vy;
          ball.y = paddle.side === 'top' ? paddle.y + paddle.height + BALL_RADIUS : paddle.y - BALL_RADIUS;
          const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
          ball.vx = hitPos * state.ballSpeed * 2;
          const speedMult = Math.min(Math.abs(ball.vy) * 1.02, MAX_BALL_SPEED);
          ball.vy = ball.vy > 0 ? speedMult : -speedMult;
        } else {
          ball.vx = -ball.vx;
          ball.x = ball.vx > 0 ? paddle.x + paddle.width + BALL_RADIUS : paddle.x - BALL_RADIUS;
          const hitPos = (ball.y - paddle.y) / paddle.height - 0.5;
          ball.vy = hitPos * state.ballSpeed * 2;
          const speedMult = Math.min(Math.abs(ball.vx) * 1.02, MAX_BALL_SPEED);
          ball.vx = ball.vx > 0 ? speedMult : -speedMult;
        }
      }
    }

    // Scoring — ball exits any edge
    let scorer = null;
    const exited = ball.x <= 0 || ball.x >= state.width || ball.y <= 0 || ball.y >= state.height;
    if (exited) {
      // Determine which side the ball exited from, and give points to the opposite side
      let scoringSide;
      if (ball.x <= 0) scoringSide = 'right';
      else if (ball.x >= state.width) scoringSide = 'left';
      else if (ball.y <= 0) scoringSide = 'bottom';
      else scoringSide = 'top';

      for (const [pid, paddle] of Object.entries(state.paddles)) {
        if (paddle.side === scoringSide) {
          state.scores[pid]++;
          scorer = pid;
          break;
        }
      }
      // Reset ball
      ball.x = state.width / 2;
      ball.y = state.height / 2;
      ball.vx = state.ballSpeed * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = state.ballSpeed * 0.7 * (Math.random() > 0.5 ? 1 : -1);
    }

    // Check max score
    const finished = Object.values(state.scores).some((s) => s >= state.maxScore);
    let winner = null;
    if (finished) {
      let best = 0;
      for (const [pid, s] of Object.entries(state.scores)) {
        if (s > best) { best = s; winner = pid; }
      }
    }

    // Only send network updates every Nth tick (or on score events)
    if (!scorer && !finished && state.tickCount % NETWORK_TICK_DIVISOR !== 0) return null;

    return {
      ball: { x: ball.x, y: ball.y },
      paddles: Object.fromEntries(Object.entries(state.paddles).map(([pid, p]) => [pid, { y: p.y, x: p.x }])),
      scores: state.scores,
      scorer,
      finished,
      winner,
    };
  },

  checkGameEnd(state) {
    for (const [pid, s] of Object.entries(state.scores)) {
      if (s >= state.maxScore) return { finished: true, winner: pid };
    }
    return { finished: false };
  },

  calculateScore(state) {
    return { ...state.scores };
  },

  getDifficulty() {
    return {
      speed: { min: 2, max: 12, curve: 'ease-in' },
      boardSize: { min: 10, max: 10 },
    };
  },

  serializeState(state) {
    return {
      width: state.width, height: state.height,
      paddles: state.paddles, ball: state.ball, scores: state.scores,
    };
  },

  handlePlayerLeave(state, player) {
    delete state.paddles[player.id];
  },

  destroy() {},

  _getPositions(count) {
    const positions = [
      { x: 10, side: 'left' },
      { x: CANVAS_W - PADDLE_W - 10, side: 'right' },
      { x: CANVAS_W / 2 - 50, y: 10, side: 'top', horizontal: true },
      { x: CANVAS_W / 2 - 50, y: CANVAS_H - PADDLE_W - 10, side: 'bottom', horizontal: true },
    ];
    return positions.slice(0, count);
  },
};
