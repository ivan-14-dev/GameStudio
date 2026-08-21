import { GameLoop } from '../../engine/GameLoop.js';
import { InputManager } from '../../engine/InputManager.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';

const DIR_ARROWS = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('snake-container');
  const canvas = document.createElement('canvas');
  canvas.className = 'snake-canvas';
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;

  const hud = document.createElement('div');
  hud.className = 'snake-hud';
  container.appendChild(hud);

  const input = new InputManager(container);
  let gameState = state;
  let localSnakes = structuredClone(state.snakes || {});
  let deathAnimations = {};
  let spectating = false;
  let gyroEnabled = false;
  let gyroCalibration = null;
  const cleanups = [];

  // --- Responsive canvas sizing ---
  function resize() {
    const maxW = container.clientWidth;
    const maxH = window.innerHeight * 0.65;
    const size = Math.min(maxW, maxH);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener('resize', resize);
  cleanups.push(() => window.removeEventListener('resize', resize));

  // --- Keyboard (PC) + AZERTY ---
  const dirMap = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' };
  for (const dir of ['up', 'down', 'left', 'right']) {
    input.on(dir, () => {
      onAction({ direction: dirMap[dir] });
      input.vibrate(10);
    });
  }
  input.bindKeyboard({
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    z: 'up', q: 'left',
  });
  input.bindSwipe();

  // --- D-Pad (mobile, hidden on desktop via CSS) ---
  const dpad = document.createElement('div');
  dpad.className = 'snake-dpad';
  const layout = [
    [null, 'UP', null],
    ['LEFT', null, 'RIGHT'],
    [null, 'DOWN', null],
  ];
  for (const row of layout) {
    for (const d of row) {
      if (!d) {
        const spacer = document.createElement('div');
        spacer.className = 'snake-dpad-spacer';
        dpad.appendChild(spacer);
        continue;
      }
      const btn = document.createElement('button');
      btn.className = 'snake-dpad-btn';
      btn.textContent = DIR_ARROWS[d];
      btn.setAttribute('aria-label', d);
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        onAction({ direction: d });
        input.vibrate(10);
      });
      dpad.appendChild(btn);
    }
  }
  controlsContainer.appendChild(dpad);

  // --- Fullscreen button (mobile) ---
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobile && document.fullscreenEnabled) {
    const fsBtn = document.createElement('button');
    fsBtn.className = 'snake-hud-btn';
    fsBtn.textContent = '⛶';
    fsBtn.title = 'Plein écran';
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen().catch(() => {});
      }
    });
    hud.appendChild(fsBtn);

    const onFsChange = () => {
      fsBtn.textContent = document.fullscreenElement ? '✕' : '⛶';
      setTimeout(resize, 100);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    cleanups.push(() => document.removeEventListener('fullscreenchange', onFsChange));
  }

  // --- Gyroscope / tilt controls (mobile) ---
  const gyroIndicator = document.createElement('div');
  gyroIndicator.className = 'snake-gyro-indicator';
  gyroIndicator.textContent = '📱 Gyroscope actif';
  container.appendChild(gyroIndicator);

  if (isMobile && window.DeviceOrientationEvent) {
    const gyroBtn = document.createElement('button');
    gyroBtn.className = 'snake-hud-btn';
    gyroBtn.textContent = '📱';
    gyroBtn.title = 'Contrôle gyroscope';
    gyroBtn.addEventListener('click', () => {
      if (gyroEnabled) disableGyro(); else enableGyro();
    });
    hud.appendChild(gyroBtn);

    let lastGyroDir = null;
    const gyroThreshold = 15;

    function handleOrientation(e) {
      if (!gyroEnabled) return;
      const { beta, gamma } = e;
      if (beta == null || gamma == null) return;
      if (!gyroCalibration) { gyroCalibration = { beta, gamma }; return; }

      const dBeta = beta - gyroCalibration.beta;
      const dGamma = gamma - gyroCalibration.gamma;

      let dir = null;
      if (Math.abs(dGamma) > Math.abs(dBeta) && Math.abs(dGamma) > gyroThreshold) {
        dir = dGamma > 0 ? 'RIGHT' : 'LEFT';
      } else if (Math.abs(dBeta) > gyroThreshold) {
        dir = dBeta > 0 ? 'DOWN' : 'UP';
      }

      if (dir && dir !== lastGyroDir) {
        lastGyroDir = dir;
        onAction({ direction: dir });
        input.vibrate(10);
      }
    }

    function enableGyro() {
      gyroCalibration = null;
      lastGyroDir = null;
      const start = () => {
        gyroEnabled = true;
        gyroBtn.style.background = 'var(--color-primary)';
        gyroIndicator.classList.add('visible');
        setTimeout(() => gyroIndicator.classList.remove('visible'), 2000);
        window.addEventListener('deviceorientation', handleOrientation);
      };
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(p => { if (p === 'granted') start(); }).catch(() => {});
      } else {
        start();
      }
    }

    function disableGyro() {
      gyroEnabled = false;
      gyroCalibration = null;
      gyroBtn.style.background = '';
      window.removeEventListener('deviceorientation', handleOrientation);
    }

    cleanups.push(() => window.removeEventListener('deviceorientation', handleOrientation));
  }

  // Keep screen on during play
  let wakeLock = null;
  if ('wakeLock' in navigator) {
    navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => {});
  }

  // --- Rendering ---
  function render() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const gridSize = gameState.size || 20;
    const cellSize = Math.min(w, h) / gridSize;
    const offsetX = (w - cellSize * gridSize) / 2;
    const offsetY = (h - cellSize * gridSize) / 2;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Grid
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridSize * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(gridSize * cellSize, i * cellSize);
      ctx.stroke();
    }

    // Obstacles
    ctx.fillStyle = '#4b5563';
    for (const [x, y] of (gameState.obstacles || [])) {
      ctx.beginPath();
      ctx.roundRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, 3);
      ctx.fill();
    }

    // Food with pulsing glow
    if (gameState.food) {
      const [fx, fy] = gameState.food;
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 200);
      const fcx = fx * cellSize + cellSize / 2;
      const fcy = fy * cellSize + cellSize / 2;
      const r = cellSize / 2.5 * pulse;
      const glow = ctx.createRadialGradient(fcx, fcy, r * 0.5, fcx, fcy, r * 2.5);
      glow.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(fcx - r * 3, fcy - r * 3, r * 6, r * 6);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fcx, fcy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snakes
    for (const [pid, snake] of Object.entries(localSnakes)) {
      if (!snake.body || snake.body.length === 0) continue;

      const deathAnim = deathAnimations[pid];
      if (deathAnim) {
        const elapsed = Date.now() - deathAnim.startTime;
        const alpha = Math.max(0, 1 - elapsed / 800);
        const flash = Math.floor(elapsed / 100) % 2 === 0;
        ctx.globalAlpha = flash ? alpha : alpha * 0.3;
        ctx.fillStyle = '#ef4444';
        for (const [x, y] of snake.body) {
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
        ctx.globalAlpha = 1;
        if (elapsed > 800) {
          delete deathAnimations[pid];
          if (pid === playerId) {
            spectating = true;
            const label = document.createElement('div');
            label.className = 'snake-spectator';
            label.textContent = '👁 Mode spectateur';
            container.appendChild(label);
          }
        }
        continue;
      }

      const color = snake.color || '#4ade80';
      const isMe = pid === playerId;

      if (isMe && snake.alive) { ctx.shadowColor = color; ctx.shadowBlur = 8; }

      for (let i = snake.body.length - 1; i >= 0; i--) {
        const [x, y] = snake.body[i];
        const t = 1 - i / Math.max(snake.body.length, 1);
        ctx.fillStyle = snake.alive ? color : '#6b7280';
        ctx.globalAlpha = snake.alive ? (0.5 + 0.5 * t) : 0.4;
        const rad = i === 0 ? 4 : 2;
        const pad = i === 0 ? 0 : 1;
        ctx.beginPath();
        ctx.roundRect(x * cellSize + pad, y * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2, rad);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Eyes positioned by direction
      if (snake.alive && snake.body.length > 0) {
        const [hx, hy] = snake.body[0];
        const hcx = hx * cellSize + cellSize / 2;
        const hcy = hy * cellSize + cellSize / 2;
        const eyeR = Math.max(1.5, cellSize / 8);
        const eyeOff = cellSize * 0.2;
        const dir = snake.direction || 'RIGHT';
        let e1x, e1y, e2x, e2y;
        if (dir === 'RIGHT')      { e1x = hcx + eyeOff; e1y = hcy - eyeOff; e2x = hcx + eyeOff; e2y = hcy + eyeOff; }
        else if (dir === 'LEFT')  { e1x = hcx - eyeOff; e1y = hcy - eyeOff; e2x = hcx - eyeOff; e2y = hcy + eyeOff; }
        else if (dir === 'UP')    { e1x = hcx - eyeOff; e1y = hcy - eyeOff; e2x = hcx + eyeOff; e2y = hcy - eyeOff; }
        else                      { e1x = hcx - eyeOff; e1y = hcy + eyeOff; e2x = hcx + eyeOff; e2y = hcy + eyeOff; }
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2); ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(e1x, e1y, eyeR * 0.5, 0, Math.PI * 2); ctx.arc(e2x, e2y, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
      }

      // Name tag above head
      if (snake.alive && snake.body.length > 0) {
        const [hx, hy] = snake.body[0];
        const name = isMe ? 'Toi' : (pid.slice(0, 6));
        ctx.font = `bold ${Math.max(9, cellSize * 0.6)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(name, hx * cellSize + cellSize / 2, hy * cellSize - 4);
        ctx.fillStyle = isMe ? '#fff' : '#ccc';
        ctx.fillText(name, hx * cellSize + cellSize / 2, hy * cellSize - 5);
      }
    }

    ctx.restore();
  }

  const loop = new GameLoop(() => {}, render);
  loop.start();

  return {
    onAction(msg) {
      if (msg.result?.positions) {
        for (const [pid, data] of Object.entries(msg.result.positions)) {
          if (localSnakes[pid]) localSnakes[pid].alive = data.alive;
        }
      }
    },
    onTick(data) {
      if (data?.positions) {
        for (const [pid, info] of Object.entries(data.positions)) {
          if (localSnakes[pid]) {
            if (localSnakes[pid].alive && !info.alive) {
              deathAnimations[pid] = { startTime: Date.now() };
              if (pid === playerId) {
                actionFeedback.eliminated(canvas);
                actionFeedback.playerMood('devastated', canvas);
              }
            }
            localSnakes[pid].alive = info.alive;
            if (info.body) {
              const prevLen = localSnakes[pid].body?.length || 0;
              localSnakes[pid].body = info.body;
              if (pid === playerId && info.body.length > prevLen) {
                actionFeedback.collected('🍎', canvas);
              }
            }
            if (info.direction) localSnakes[pid].direction = info.direction;
          }
        }
      }
      if (data?.food) gameState.food = data.food;
    },
    onSync(st) {
      gameState = st;
      localSnakes = structuredClone(st.snakes || {});
    },
    destroy() {
      loop.stop();
      input.destroy();
      resizeObserver.disconnect();
      container.classList.remove('snake-container');
      wakeLock?.release().catch(() => {});
      for (const fn of cleanups) fn();
    },
  };
}

export default { create };
