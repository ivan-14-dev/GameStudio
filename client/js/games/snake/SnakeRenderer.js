import { GameLoop } from '../../engine/GameLoop.js';
import { InputManager } from '../../engine/InputManager.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  const input = new InputManager(container);
  let gameState = state;
  let localSnakes = structuredClone(state.snakes || {});
  let deathAnimations = {}; // pid -> { frame, startTime }
  let spectating = false;

  function resize() {
    const size = Math.min(container.clientWidth, container.clientHeight, 500);
    canvas.width = size;
    canvas.height = size;
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // Input bindings
  const dirMap = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' };
  for (const dir of ['up', 'down', 'left', 'right']) {
    input.on(dir, () => {
      onAction({ direction: dirMap[dir] });
      input.vibrate(10);
    });
  }
  input.bindKeyboard({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' });
  input.bindSwipe();

  // D-pad controls for mobile
  const dpad = document.createElement('div');
  dpad.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:200px;margin:8px auto';
  const dirs = [
    [null, '↑', null],
    ['←', null, '→'],
    [null, '↓', null],
  ];
  const dirActions = { '↑': 'UP', '↓': 'DOWN', '←': 'LEFT', '→': 'RIGHT' };
  for (const row of dirs) {
    for (const d of row) {
      if (!d) {
        dpad.appendChild(document.createElement('div'));
        continue;
      }
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = d;
      btn.style.cssText = 'min-height:52px;font-size:1.5rem';
      btn.addEventListener('pointerdown', () => { onAction({ direction: dirActions[d] }); input.vibrate(10); });
      dpad.appendChild(btn);
    }
  }
  controlsContainer.appendChild(dpad);

  function render() {
    const cellSize = canvas.width / (gameState.size || 20);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gameState.size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Obstacles
    ctx.fillStyle = '#4b5563';
    for (const [x, y] of (gameState.obstacles || [])) {
      ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }

    // Food
    if (gameState.food) {
      ctx.fillStyle = '#ef4444';
      const [fx, fy] = gameState.food;
      ctx.beginPath();
      ctx.arc(fx * cellSize + cellSize / 2, fy * cellSize + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snakes
    for (const [pid, snake] of Object.entries(localSnakes)) {
      if (!snake.body || snake.body.length === 0) continue;

      // Death animation
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
          // If this is us, switch to spectator mode
          if (pid === playerId) {
            spectating = true;
            const specLabel = document.createElement('div');
            specLabel.style.cssText = 'text-align:center;color:var(--text-muted);font-size:0.85rem;margin-top:4px';
            specLabel.textContent = '👁 Mode spectateur';
            controlsContainer.appendChild(specLabel);
          }
        }
        continue;
      }

      ctx.fillStyle = snake.alive ? (snake.color || '#4ade80') : '#6b7280';

      for (let i = 0; i < snake.body.length; i++) {
        const [x, y] = snake.body[i];
        const r = i === 0 ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, r);
        ctx.fill();
      }

      // Eyes on head
      if (snake.alive && snake.body.length > 0) {
        const [hx, hy] = snake.body[0];
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(hx * cellSize + cellSize * 0.35, hy * cellSize + cellSize * 0.35, 2, 0, Math.PI * 2);
        ctx.arc(hx * cellSize + cellSize * 0.65, hy * cellSize + cellSize * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const loop = new GameLoop(() => {}, render);
  loop.start();

  return {
    onAction(msg) {
      if (msg.result?.positions) {
        for (const [pid, data] of Object.entries(msg.result.positions)) {
          if (localSnakes[pid]) {
            localSnakes[pid].alive = data.alive;
          }
        }
      }
    },
    onTick(data) {
      if (data?.positions) {
        for (const [pid, info] of Object.entries(data.positions)) {
          if (localSnakes[pid]) {
            // Detect death
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
    },
  };
}

export default { create };
