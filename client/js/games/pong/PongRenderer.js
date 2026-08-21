import { GameLoop } from '../../engine/GameLoop.js';
import { InputManager } from '../../engine/InputManager.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  let gameState = state;
  const input = new InputManager(container);
  let localPaddleY = null; // for prediction
  const PADDLE_SPEED = 8;

  function resize() {
    canvas.width = Math.min(container.clientWidth, 600);
    canvas.height = Math.round(canvas.width * 0.75);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Determine paddle orientation
  const myPaddle = state.paddles?.[playerId];
  const isHorizontal = myPaddle?.side === 'top' || myPaddle?.side === 'bottom';
  const moveA = isHorizontal ? 'left' : 'up';
  const moveB = isHorizontal ? 'right' : 'down';

  // Controls
  const touchIntervals = [];
  if (isHorizontal) {
    input.bindKeyboard({ ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right' });
    input.on('left', () => { onAction({ move: 'left' }); applyLocalPrediction('left'); });
    input.on('right', () => { onAction({ move: 'right' }); applyLocalPrediction('right'); });
  } else {
    input.bindKeyboard({ ArrowUp: 'up', ArrowDown: 'down', w: 'up', s: 'down' });
    input.on('up', () => { onAction({ move: 'up' }); applyLocalPrediction('up'); });
    input.on('down', () => { onAction({ move: 'down' }); applyLocalPrediction('down'); });
  }

  function applyLocalPrediction(dir) {
    if (!gameState.paddles?.[playerId]) return;
    const p = gameState.paddles[playerId];
    if (dir === 'up') localPaddleY = Math.max(0, (localPaddleY ?? p.y) - PADDLE_SPEED);
    else if (dir === 'down') localPaddleY = Math.min((gameState.height || 600) - (p.height || 100), (localPaddleY ?? p.y) + PADDLE_SPEED);
    else if (dir === 'left') localPaddleY = Math.max(0, (localPaddleY ?? p.x) - PADDLE_SPEED); // reuse localPaddleY for X
    else if (dir === 'right') localPaddleY = Math.min((gameState.width || 800) - (p.width || 100), (localPaddleY ?? p.x) + PADDLE_SPEED);
  }

  // Touch buttons
  const btnA = document.createElement('button');
  btnA.className = 'btn btn-secondary';
  btnA.textContent = isHorizontal ? '◀' : '▲';
  btnA.style.cssText = 'flex:1;min-height:52px;font-size:1.5rem';
  const btnB = document.createElement('button');
  btnB.className = 'btn btn-secondary';
  btnB.textContent = isHorizontal ? '▶' : '▼';
  btnB.style.cssText = 'flex:1;min-height:52px;font-size:1.5rem';

  for (const [btn, dir] of [[btnA, moveA], [btnB, moveB]]) {
    let intervalId = null;
    btn.addEventListener('pointerdown', () => {
      onAction({ move: dir });
      applyLocalPrediction(dir);
      intervalId = setInterval(() => {
        onAction({ move: dir });
        applyLocalPrediction(dir);
      }, 50);
      touchIntervals.push(intervalId);
    });
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
  }

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:8px;max-width:300px;margin:0 auto';
  wrap.appendChild(btnA);
  wrap.appendChild(btnB);
  controlsContainer.appendChild(wrap);

  function render() {
    const sx = canvas.width / (gameState.width || 800);
    const sy = canvas.height / (gameState.height || 600);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center line
    ctx.strokeStyle = '#374151';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ball
    if (gameState.ball) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(gameState.ball.x * sx, gameState.ball.y * sy, 8, 0, Math.PI * 2);
      ctx.fill();
      // Ball trail
      ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.beginPath();
      ctx.arc(gameState.ball.x * sx, gameState.ball.y * sy, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Paddles
    const colors = ['#6c63ff', '#f472b6', '#4ade80', '#60a5fa'];
    let i = 0;
    for (const [pid, paddle] of Object.entries(gameState.paddles || {})) {
      ctx.fillStyle = pid === playerId ? '#6c63ff' : colors[i % colors.length];
      let drawX = paddle.x;
      let drawY = paddle.y;
      if (pid === playerId && localPaddleY != null) {
        if (isHorizontal) drawX = localPaddleY; // reusing localPaddleY for X
        else drawY = localPaddleY;
      }
      ctx.fillRect(
        drawX * sx, drawY * sy,
        (paddle.width || 15) * sx, (paddle.height || 100) * sy,
      );
      i++;
    }

    // Score display on canvas
    if (gameState.scores) {
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      const entries = Object.entries(gameState.scores);
      const scoreText = entries.map(([, s]) => s).join(' - ');
      ctx.fillText(scoreText, canvas.width / 2, 32);
    }
  }

  const loop = new GameLoop(() => {}, render);
  loop.start();

  return {
    onAction(msg) {},
    onTick(data) {
      if (data?.ball) gameState.ball = data.ball;
      if (data?.paddles) {
        for (const [pid, p] of Object.entries(data.paddles)) {
          if (gameState.paddles[pid]) {
            if (p.y != null) gameState.paddles[pid].y = p.y;
            if (p.x != null) gameState.paddles[pid].x = p.x;
            if (pid === playerId) {
              localPaddleY = isHorizontal ? (p.x ?? gameState.paddles[pid].x) : (p.y ?? gameState.paddles[pid].y);
            }
          }
        }
      }
      if (data?.scores) {
        const prevScores = { ...gameState.scores };
        gameState.scores = data.scores;
        for (const [pid, score] of Object.entries(data.scores)) {
          if (score > (prevScores[pid] || 0)) {
            if (pid === playerId) {
              actionFeedback.scoreChange(1, canvas);
              actionFeedback.playerMood('happy', canvas);
            } else {
              actionFeedback.playerMood('worried', canvas);
            }
          }
        }
      }
    },
    onSync(st) { gameState = st; },
    destroy() {
      loop.stop();
      input.destroy();
      ro.disconnect();
      touchIntervals.forEach((id) => clearInterval(id));
    },
  };
}

export default { create };
