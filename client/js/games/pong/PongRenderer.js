import { GameLoop } from '../../engine/GameLoop.js';
import { InputManager } from '../../engine/InputManager.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';
import { addFullscreenBtn, acquireWakeLock, isMobileDevice } from '../shared/gameUtils.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('pong-container', 'game-container');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;
  const cleanups = [];

  let gameState = state;
  const input = new InputManager(container);
  let localPaddleY = null;
  const PADDLE_SPEED = 8;

  function resize() {
    const maxW = container.clientWidth;
    const maxH = window.innerHeight * 0.6;
    const w = Math.min(maxW, 600);
    const h = Math.round(w * 0.75);
    canvas.width = w * dpr;
    canvas.height = Math.min(h, maxH) * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = Math.min(h, maxH) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const myPaddle = state.paddles?.[playerId];
  const isHorizontal = myPaddle?.side === 'top' || myPaddle?.side === 'bottom';
  const moveA = isHorizontal ? 'left' : 'up';
  const moveB = isHorizontal ? 'right' : 'down';

  function applyLocalPrediction(dir) {
    if (!gameState.paddles?.[playerId]) return;
    const p = gameState.paddles[playerId];
    if (dir === 'up') localPaddleY = Math.max(0, (localPaddleY ?? p.y) - PADDLE_SPEED);
    else if (dir === 'down') localPaddleY = Math.min((gameState.height || 600) - (p.height || 100), (localPaddleY ?? p.y) + PADDLE_SPEED);
    else if (dir === 'left') localPaddleY = Math.max(0, (localPaddleY ?? p.x) - PADDLE_SPEED);
    else if (dir === 'right') localPaddleY = Math.min((gameState.width || 800) - (p.width || 100), (localPaddleY ?? p.x) + PADDLE_SPEED);
  }

  // Keyboard (QWERTY + AZERTY)
  if (isHorizontal) {
    input.bindKeyboard({ ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', q: 'left' });
    input.on('left', () => { onAction({ move: 'left' }); applyLocalPrediction('left'); });
    input.on('right', () => { onAction({ move: 'right' }); applyLocalPrediction('right'); });
  } else {
    input.bindKeyboard({ ArrowUp: 'up', ArrowDown: 'down', w: 'up', s: 'down', z: 'up' });
    input.on('up', () => { onAction({ move: 'up' }); applyLocalPrediction('up'); });
    input.on('down', () => { onAction({ move: 'down' }); applyLocalPrediction('down'); });
  }
  input.bindSwipe();

  // Touch buttons
  const touchIntervals = [];
  const wrap = document.createElement('div');
  wrap.className = 'pong-controls';
  for (const [label, dir] of [[isHorizontal ? '◀' : '▲', moveA], [isHorizontal ? '▶' : '▼', moveB]]) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = label;
    let intervalId = null;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onAction({ move: dir }); applyLocalPrediction(dir);
      intervalId = setInterval(() => { onAction({ move: dir }); applyLocalPrediction(dir); }, 50);
      touchIntervals.push(intervalId);
    });
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
    wrap.appendChild(btn);
  }
  controlsContainer.appendChild(wrap);

  // Fullscreen + wake lock
  const fsCleanup = addFullscreenBtn(container);
  if (fsCleanup) cleanups.push(fsCleanup);
  const releaseWakeLock = acquireWakeLock();

  // Gyroscope for paddle (mobile)
  if (isMobileDevice() && window.DeviceOrientationEvent) {
    let gyroEnabled = false, gyroCal = null, lastDir = null;
    const gyroBtn = document.createElement('button');
    gyroBtn.className = 'game-fullscreen-btn';
    gyroBtn.textContent = '📱';
    gyroBtn.title = 'Gyroscope';
    gyroBtn.style.cssText = 'position:absolute;top:8px;left:8px;z-index:50';
    container.appendChild(gyroBtn);

    function handleOri(e) {
      if (!gyroEnabled) return;
      const { beta, gamma } = e;
      if (beta == null || gamma == null) return;
      if (!gyroCal) { gyroCal = { beta, gamma }; return; }
      const val = isHorizontal ? (gamma - gyroCal.gamma) : (beta - gyroCal.beta);
      let dir = null;
      if (Math.abs(val) > 12) {
        if (isHorizontal) dir = val > 0 ? 'right' : 'left';
        else dir = val > 0 ? 'down' : 'up';
      }
      if (dir && dir !== lastDir) {
        lastDir = dir;
        onAction({ move: dir }); applyLocalPrediction(dir);
        input.vibrate(10);
      }
    }

    gyroBtn.addEventListener('click', () => {
      if (gyroEnabled) {
        gyroEnabled = false; gyroCal = null;
        gyroBtn.style.background = '';
        window.removeEventListener('deviceorientation', handleOri);
      } else {
        gyroCal = null; lastDir = null;
        const start = () => { gyroEnabled = true; gyroBtn.style.background = 'var(--color-primary)'; window.addEventListener('deviceorientation', handleOri); };
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().then(p => { if (p === 'granted') start(); }).catch(() => {});
        } else start();
      }
    });
    cleanups.push(() => window.removeEventListener('deviceorientation', handleOri));
  }

  function render() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const sx = w / (gameState.width || 800);
    const sy = h / (gameState.height || 600);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = '#374151';
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.setLineDash([]);

    // Ball with glow
    if (gameState.ball) {
      const bx = gameState.ball.x * sx, by = gameState.ball.y * sy;
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(bx, by, 8 * Math.min(sx, sy), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
      ctx.beginPath(); ctx.arc(bx, by, 14 * Math.min(sx, sy), 0, Math.PI * 2); ctx.fill();
    }

    // Paddles
    const colors = ['#6c63ff', '#f472b6', '#4ade80', '#60a5fa'];
    let i = 0;
    for (const [pid, paddle] of Object.entries(gameState.paddles || {})) {
      const isMe = pid === playerId;
      ctx.fillStyle = isMe ? '#6c63ff' : colors[i % colors.length];
      if (isMe) { ctx.shadowColor = '#6c63ff'; ctx.shadowBlur = 10; }
      let drawX = paddle.x, drawY = paddle.y;
      if (isMe && localPaddleY != null) {
        if (isHorizontal) drawX = localPaddleY; else drawY = localPaddleY;
      }
      ctx.beginPath();
      ctx.roundRect(drawX * sx, drawY * sy, (paddle.width || 15) * sx, (paddle.height || 100) * sy, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      i++;
    }

    // Score
    if (gameState.scores) {
      ctx.font = `bold ${Math.max(18, w * 0.04)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(Object.values(gameState.scores).join(' - '), w / 2, 32);
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
            if (pid === playerId) localPaddleY = isHorizontal ? (p.x ?? gameState.paddles[pid].x) : (p.y ?? gameState.paddles[pid].y);
          }
        }
      }
      if (data?.scores) {
        const prev = { ...gameState.scores };
        gameState.scores = data.scores;
        for (const [pid, score] of Object.entries(data.scores)) {
          if (score > (prev[pid] || 0)) {
            if (pid === playerId) { actionFeedback.scoreChange(1, canvas); actionFeedback.playerMood('happy', canvas); }
            else actionFeedback.playerMood('worried', canvas);
          }
        }
      }
    },
    onSync(st) { gameState = st; },
    destroy() {
      loop.stop(); input.destroy(); ro.disconnect();
      touchIntervals.forEach(id => clearInterval(id));
      container.classList.remove('pong-container', 'game-container');
      releaseWakeLock();
      for (const fn of cleanups) fn();
    },
  };
}

export default { create };
