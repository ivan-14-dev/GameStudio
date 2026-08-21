import { GameLoop } from '../../engine/GameLoop.js';
import { InputManager } from '../../engine/InputManager.js';
import { ARENA } from '../../shared/constants/snakeArena.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';
import { addFullscreenBtn, acquireWakeLock } from '../shared/gameUtils.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('snake-arena-container', 'game-container');
  const cleanups = [];

  // --- Canvas setup ---
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.className = 'snake-arena-canvas';
  container.classList.add('snake-arena-container');
  container.appendChild(canvas);

  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // --- State ---
  let gameState = state;
  let localPlayers = structuredClone(state.snakes || state.players || {});
  let prevPlayers = structuredClone(localPlayers);
  let lerpT = 0;
  let tickCount = 0;

  // --- Camera ---
  const camera = { x: 0, y: 0, zoom: 1.0 };
  let spectatingTarget = null; // follow another player when dead

  function getCellSize() {
    return (canvas.width / dpr) / ARENA.VIEWPORT.width;
  }

  function updateCamera() {
    let target = localPlayers[playerId];
    // Spectator: follow alive player
    if (target && !target.alive) {
      if (!spectatingTarget) {
        const alive = Object.entries(localPlayers).find(([pid, p]) => p.alive && pid !== playerId);
        if (alive) spectatingTarget = alive[0];
      }
      if (spectatingTarget && localPlayers[spectatingTarget]?.alive) {
        target = localPlayers[spectatingTarget];
      }
    }
    if (!target?.body?.length) return;
    const [hx, hy] = target.body[0];
    const cell = getCellSize();
    const screenW = canvas.width / dpr;
    const screenH = canvas.height / dpr;
    const targetX = hx * cell - screenW / 2 + cell / 2;
    const targetY = hy * cell - screenH / 2 + cell / 2;
    camera.x += (targetX - camera.x) * ARENA.CAMERA_SMOOTHING;
    camera.y += (targetY - camera.y) * ARENA.CAMERA_SMOOTHING;

    const bodyLen = target.body.length;
    const targetZoom = Math.max(0.8, Math.min(1.2, 1.2 - bodyLen * 0.004));
    camera.zoom += (targetZoom - camera.zoom) * 0.05;
  }

  // --- Effects ---
  const effects = [];

  function addEffect(type, x, y, extra) {
    const e = { type, x, y, life: 1.0, ...extra };
    effects.push(e);
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].life -= dt * 1.5;
      if (effects[i].life <= 0) effects.splice(i, 1);
    }
  }

  // --- Notifications ---
  const notifications = [];

  function notify(text) {
    notifications.push({ text, life: 1.0 });
  }

  // --- Input ---
  const input = new InputManager(container);
  const dirMap = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' };
  for (const dir of ['up', 'down', 'left', 'right']) {
    input.on(dir, () => {
      onAction({ type: 'direction', direction: dirMap[dir] });
      predictMove(dirMap[dir]);
      input.vibrate(10);
    });
  }
  input.bindKeyboard({
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    z: 'up', q: 'left', // AZERTY
  });
  input.bindSwipe();

  const fsCleanup = addFullscreenBtn(container);
  if (fsCleanup) cleanups.push(fsCleanup);
  const releaseWakeLock = acquireWakeLock();

  // D-pad
  const dpad = document.createElement('div');
  dpad.className = 'snake-arena-dpad';
  const dirs = [[null, '↑', null], ['←', null, '→'], [null, '↓', null]];
  const dirActions = { '↑': 'UP', '↓': 'DOWN', '←': 'LEFT', '→': 'RIGHT' };
  for (const row of dirs) {
    for (const d of row) {
      if (!d) { dpad.appendChild(document.createElement('div')); continue; }
      const btn = document.createElement('button');
      btn.textContent = d;
      btn.addEventListener('pointerdown', () => {
        onAction({ type: 'direction', direction: dirActions[d] });
        predictMove(dirActions[d]);
        input.vibrate(10);
      });
      dpad.appendChild(btn);
    }
  }
  controlsContainer.appendChild(dpad);

  // --- Client-side prediction ---
  function predictMove(dir) {
    const me = localPlayers[playerId];
    if (!me?.alive || !me.body?.length) return;
    const d = ARENA.DIRECTIONS[dir];
    if (!d) return;
    const [hx, hy] = me.body[0];
    const nx = hx + d.x;
    const ny = hy + d.y;
    me.body.unshift([nx, ny]);
    if (me.body.length > (me.length || me.body.length)) me.body.pop();
    me.direction = dir;
  }

  // --- Viewport culling helpers ---
  function isInViewport(wx, wy, cell) {
    const screenW = canvas.width / dpr;
    const screenH = canvas.height / dpr;
    const sx = wx * cell - camera.x;
    const sy = wy * cell - camera.y;
    return sx > -cell * 2 && sx < screenW + cell * 2 && sy > -cell * 2 && sy < screenH + cell * 2;
  }

  // --- Render: grid ---
  function renderGrid(cell, mapSize) {
    const screenW = canvas.width / dpr;
    const screenH = canvas.height / dpr;
    const startCol = Math.max(0, Math.floor(camera.x / cell));
    const endCol = Math.min(mapSize, Math.ceil((camera.x + screenW) / cell));
    const startRow = Math.max(0, Math.floor(camera.y / cell));
    const endRow = Math.min(mapSize, Math.ceil((camera.y + screenH) / cell));

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let c = startCol; c <= endCol; c++) {
      const x = c * cell;
      ctx.beginPath(); ctx.moveTo(x, startRow * cell); ctx.lineTo(x, endRow * cell); ctx.stroke();
    }
    for (let r = startRow; r <= endRow; r++) {
      const y = r * cell;
      ctx.beginPath(); ctx.moveTo(startCol * cell, y); ctx.lineTo(endCol * cell, y); ctx.stroke();
    }
  }

  // --- Render: terrain ---
  function renderTerrain(cell) {
    const terrain = gameState.terrain;
    if (!terrain) return;
    const colors = {
      [ARENA.TERRAIN.ICE]: 'rgba(186,230,253,0.25)',
      [ARENA.TERRAIN.MUD]: 'rgba(120,80,40,0.25)',
      [ARENA.TERRAIN.BOOST]: 'rgba(250,204,21,0.2)',
      [ARENA.TERRAIN.DANGER]: 'rgba(239,68,68,0.2)',
      [ARENA.TERRAIN.PORTAL_ZONE]: 'rgba(168,85,247,0.2)',
      [ARENA.TERRAIN.DARK_ZONE]: 'rgba(0,0,0,0.4)',
    };
    for (const t of terrain) {
      if (!isInViewport(t.x, t.y, cell)) continue;
      const c = colors[t.type];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(t.x * cell, t.y * cell, cell, cell);
    }
  }

  // --- Render: obstacles ---
  function renderObstacles(cell) {
    const obstacles = gameState.obstacles || [];
    for (const obs of obstacles) {
      const ox = Array.isArray(obs) ? obs[0] : obs.x;
      const oy = Array.isArray(obs) ? obs[1] : obs.y;
      if (!isInViewport(ox, oy, cell)) continue;
      const type = obs.type || ARENA.OBSTACLES.WALL;
      ctx.fillStyle = type === ARENA.OBSTACLES.BREAKABLE_WALL ? '#78716c' :
                      type === ARENA.OBSTACLES.DAMAGE_ZONE ? '#dc2626' :
                      type === ARENA.OBSTACLES.SPEED_ZONE ? '#eab308' : '#4b5563';
      ctx.fillRect(ox * cell + 1, oy * cell + 1, cell - 2, cell - 2);
      if (type === ARENA.OBSTACLES.BREAKABLE_WALL) {
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox * cell + 3, oy * cell + cell / 2);
        ctx.lineTo(ox * cell + cell - 3, oy * cell + cell / 2);
        ctx.stroke();
      }
    }
  }

  // --- Render: food ---
  function renderFood(cell) {
    const foods = gameState.food;
    if (!foods) return;
    const items = Array.isArray(foods[0]) || typeof foods[0] === 'object' ? foods : [foods];
    for (const f of items) {
      const fx = Array.isArray(f) ? f[0] : f.x;
      const fy = Array.isArray(f) ? f[1] : f.y;
      if (!isInViewport(fx, fy, cell)) continue;
      const type = f.type || 'NORMAL';
      const info = ARENA.FOOD[type] || ARENA.FOOD.NORMAL;
      const cx = fx * cell + cell / 2;
      const cy = fy * cell + cell / 2;
      ctx.font = `${cell * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.emoji, cx, cy);
    }
  }

  // --- Render: powerups ---
  function renderPowerups(cell) {
    const pups = gameState.powerups || [];
    for (const p of pups) {
      const px = p.x ?? p[0];
      const py = p.y ?? p[1];
      if (!isInViewport(px, py, cell)) continue;
      const info = ARENA.POWERUPS[p.type] || {};
      const cx = px * cell + cell / 2;
      const cy = py * cell + cell / 2;
      // Glow
      ctx.save();
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 8;
      ctx.font = `${cell * 0.75}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.emoji || '⭐', cx, cy);
      ctx.restore();
    }
  }

  // --- Render: portals ---
  function renderPortals(cell) {
    const portals = gameState.portals || [];
    for (const p of portals) {
      if (!isInViewport(p.x, p.y, cell)) continue;
      const cx = p.x * cell + cell / 2;
      const cy = p.y * cell + cell / 2;
      const r = cell * 0.4;
      const t = tickCount * 0.05;
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, t, t + Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, -t, -t + Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Render: avatar/bonhomme ---
  function renderAvatar(cell, body, direction, color, alive, pid) {
    if (!body || body.length === 0) return;
    const isLocal = pid === playerId;
    const baseColor = alive ? color : '#6b7280';
    const darkColor = alive ? shadeColor(color, -30) : '#4b5563';

    // Trail (body segments behind the character)
    if (body.length > 1) {
      // Glowing trail line
      ctx.save();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = cell * 0.22;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.35;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = cell * 0.3;
      ctx.beginPath();
      ctx.moveTo(body[0][0] * cell + cell / 2, body[0][1] * cell + cell / 2);
      for (let i = 1; i < body.length; i++) {
        ctx.lineTo(body[i][0] * cell + cell / 2, body[i][1] * cell + cell / 2);
      }
      ctx.stroke();
      ctx.restore();

      // Body segment dots (footprints)
      for (let i = 1; i < body.length; i++) {
        const opacity = Math.max(0.15, 1 - (i / body.length) * 0.85);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = baseColor;
        const dx = body[i][0] * cell + cell / 2;
        const dy = body[i][1] * cell + cell / 2;
        const r = cell * (0.12 - (i / body.length) * 0.04);
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(1.5, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Head position
    const hx = body[0][0] * cell + cell / 2;
    const hy = body[0][1] * cell + cell / 2;

    const dirAngles = { UP: -Math.PI / 2, DOWN: Math.PI / 2, LEFT: Math.PI, RIGHT: 0 };
    const angle = dirAngles[direction] || 0;
    const headR = cell * 0.32;
    const torsoW = cell * 0.28;
    const torsoH = cell * 0.22;
    const limbW = cell * 0.055;
    const legLen = cell * 0.2;
    const armLen = cell * 0.18;

    ctx.save();
    ctx.translate(hx, hy);

    const legSwing = Math.sin(tickCount * 0.35) * 0.4;

    // Legs
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = limbW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.3, torsoH * 0.4);
    ctx.lineTo(-torsoW * 0.3 + Math.sin(legSwing) * legLen * 0.4, torsoH * 0.4 + legLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(torsoW * 0.3, torsoH * 0.4);
    ctx.lineTo(torsoW * 0.3 + Math.sin(-legSwing) * legLen * 0.4, torsoH * 0.4 + legLen);
    ctx.stroke();

    // Arms
    const armSwing = Math.sin(tickCount * 0.35 + 1) * 0.3;
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.5, -torsoH * 0.05);
    ctx.lineTo(-torsoW * 0.5 - armLen * 0.7 + Math.sin(armSwing) * armLen * 0.3, -torsoH * 0.05 + armLen * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(torsoW * 0.5, -torsoH * 0.05);
    ctx.lineTo(torsoW * 0.5 + armLen * 0.7 + Math.sin(-armSwing) * armLen * 0.3, -torsoH * 0.05 + armLen * 0.6);
    ctx.stroke();

    // Torso
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, -torsoH * 0.3, torsoW, torsoH, [3, 3, 2, 2]);
    ctx.fill();

    // Head - slightly larger, with subtle shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(0, -headR * 0.55, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Face offset towards movement direction
    const edx = Math.cos(angle) * headR * 0.12;
    const edy = Math.sin(angle) * headR * 0.12;
    const eyeY = -headR * 0.65;

    if (alive) {
      // Eyes (white sclera + dark pupil)
      const eyeSpacing = headR * 0.35;
      const eyeR = headR * 0.18;
      const pupilR = headR * 0.1;
      for (const sx of [-1, 1]) {
        const ex = sx * eyeSpacing * 0.55 + edx;
        const ey = eyeY + edy;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(ex + edx * 0.3, ey + edy * 0.3, pupilR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(edx, -headR * 0.35 + edy, headR * 0.18, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      // Dead: X eyes
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      for (const sx of [-1, 1]) {
        const ex = sx * headR * 0.22;
        const ey = eyeY;
        ctx.beginPath(); ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3); ctx.stroke();
      }
    }

    // Player name above head
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.max(9, cell * 0.28)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const name = isLocal ? '▼' : (localPlayers[pid]?.name || '');
    ctx.fillText(name, 0, -headR * 1.6);

    ctx.restore();
  }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  // --- Render: all players ---
  function renderPlayers(cell) {
    for (const [pid, p] of Object.entries(localPlayers)) {
      if (!p.body?.length) continue;
      if (!isInViewport(p.body[0][0], p.body[0][1], cell)) continue;
      renderAvatar(cell, p.body, p.direction, p.color || '#4ade80', p.alive !== false, pid);
    }
  }

  // --- Render: fog of war ---
  function renderFogOfWar(cell) {
    const me = localPlayers[playerId];
    if (!me?.body?.length) return;
    const fogRadius = gameState.fogRadius || ARENA.FOG_RADIUS.MEDIUM;
    const [hx, hy] = me.body[0];
    const cx = hx * cell + cell / 2;
    const cy = hy * cell + cell / 2;
    const r = fogRadius * cell;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    const screenW = canvas.width / dpr;
    const screenH = canvas.height / dpr;
    // Cover entire world visible area, then punch a hole
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillRect(camera.x, camera.y, screenW, screenH);
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  // --- Render: effects ---
  function renderEffects(cell) {
    for (const e of effects) {
      ctx.globalAlpha = e.life;
      if (e.type === 'score') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${14 * (1 + (1 - e.life) * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x * cell + cell / 2, e.y * cell - (1 - e.life) * 30);
      } else if (e.type === 'eat') {
        const spread = (1 - e.life) * cell;
        ctx.fillStyle = e.color || '#4ade80';
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 * i) / 5 + e.life;
          ctx.beginPath();
          ctx.arc(e.x * cell + cell / 2 + Math.cos(a) * spread, e.y * cell + cell / 2 + Math.sin(a) * spread, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.type === 'death') {
        ctx.fillStyle = `rgba(239,68,68,${e.life * 0.4})`;
        const screenW = canvas.width / dpr;
        const screenH = canvas.height / dpr;
        ctx.fillRect(camera.x, camera.y, screenW, screenH);
      } else if (e.type === 'portal') {
        const r = cell * (1 - e.life) * 2;
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x * cell + cell / 2, e.y * cell + cell / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }
  }

  // --- Render: HUD (on canvas, no DOM) ---
  function renderHUD() {
    const screenW = canvas.width / dpr;
    const screenH = canvas.height / dpr;
    const me = localPlayers[playerId];
    const score = me?.score ?? gameState.scores?.[playerId] ?? 0;
    const combo = me?.combo ?? gameState.combos?.[playerId] ?? 0;
    const level = gameState.level ?? 1;
    const timer = gameState.timer ?? 0;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Top-left: score + combo
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, 8, 130, combo > 1 ? 52 : 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${score}`, 14, 14);
    if (combo > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`COMBO x${combo}`, 14, 34);
    }

    // Top-center: level + timer
    const mins = Math.floor(timer / 60);
    const secs = Math.floor(timer % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const cx = screenW / 2;
    ctx.fillRect(cx - 65, 8, 130, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lvl ${level}  ${timeStr}`, cx, 14);

    // Bottom: active powerups
    const activePowerups = me?.activePowerups || gameState.activePowerups?.[playerId] || [];
    if (activePowerups.length) {
      const pw = 40;
      const startX = screenW / 2 - (activePowerups.length * pw) / 2;
      for (let i = 0; i < activePowerups.length; i++) {
        const pu = activePowerups[i];
        const info = ARENA.POWERUPS[pu.type] || {};
        const x = startX + i * pw;
        const y = screenH - 50;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, pw - 4, 40);
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(info.emoji || '⭐', x + (pw - 4) / 2, y + 22);
        // Time bar
        if (pu.remaining != null && info.duration) {
          const pct = Math.max(0, pu.remaining / info.duration);
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(x + 2, y + 34, (pw - 8) * pct, 4);
        }
      }
    }

    // Notifications
    for (let i = notifications.length - 1; i >= 0; i--) {
      const n = notifications[i];
      n.life -= 0.012;
      if (n.life <= 0) { notifications.splice(i, 1); continue; }
      ctx.globalAlpha = n.life;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.text, cx, 60 + (notifications.length - 1 - i) * 26);
    }
    ctx.globalAlpha = 1.0;

    // Spectator label
    if (spectatingTarget && localPlayers[spectatingTarget]) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(cx - 100, screenH - 30, 200, 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`👁 Spectateur — ${localPlayers[spectatingTarget].name || spectatingTarget.slice(0, 6)}`, cx, screenH - 18);
    }

    ctx.restore();
  }

  // --- Render: minimap ---
  function renderMinimap() {
    const mapSize = gameState.mapSize || gameState.size || 50;
    const mmW = 140;
    const mmH = 100;
    const screenW = canvas.width / dpr;
    const mx = screenW - mmW - 10;
    const my = 10;
    const scale = mmW / mapSize;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mx, my, mmW, mmH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mmW, mmH);

    // Walls
    ctx.fillStyle = '#6b7280';
    for (const obs of (gameState.obstacles || [])) {
      const ox = Array.isArray(obs) ? obs[0] : obs.x;
      const oy = Array.isArray(obs) ? obs[1] : obs.y;
      ctx.fillRect(mx + ox * scale, my + oy * scale, Math.max(1, scale), Math.max(1, scale));
    }

    // Food
    ctx.fillStyle = '#ef4444';
    const foods = gameState.food;
    if (foods) {
      const items = Array.isArray(foods[0]) || typeof foods[0] === 'object' ? foods : [foods];
      for (const f of items) {
        const fx = Array.isArray(f) ? f[0] : f.x;
        const fy = Array.isArray(f) ? f[1] : f.y;
        ctx.fillRect(mx + fx * scale, my + fy * scale, 1.5, 1.5);
      }
    }

    // Players
    for (const [pid, p] of Object.entries(localPlayers)) {
      if (!p.body?.length) continue;
      const [hx, hy] = p.body[0];
      const isLocal = pid === playerId;
      ctx.fillStyle = p.color || '#4ade80';
      if (isLocal) {
        // Pulsing dot
        const pulse = 2 + Math.sin(tickCount * 0.1) * 1;
        ctx.beginPath();
        ctx.arc(mx + hx * scale, my + hy * scale, pulse, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(mx + hx * scale - 1, my + hy * scale - 1, 3, 3);
      }
    }

    ctx.restore();
  }

  // --- Interpolation for remote players ---
  function interpolatePlayers() {
    lerpT = Math.min(lerpT + 0.15, 1);
    for (const [pid, p] of Object.entries(localPlayers)) {
      if (pid === playerId) continue;
      const prev = prevPlayers[pid];
      if (!prev?.body?.length || !p.body?.length) continue;
      // Only interpolate head position
      p._renderX = prev.body[0][0] + (p.body[0][0] - prev.body[0][0]) * lerpT;
      p._renderY = prev.body[0][1] + (p.body[0][1] - prev.body[0][1]) * lerpT;
    }
  }

  // --- Main render ---
  function render() {
    const screenW = canvas.width / dpr;
    const screenH = canvas.height / dpr;
    const cell = getCellSize();
    const mapSize = gameState.mapSize || gameState.size || 50;

    tickCount++;
    updateCamera();
    interpolatePlayers();

    // Clear
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, screenW, screenH);
    ctx.restore();

    // Camera transform
    ctx.save();
    const zoomOffset = (1 - camera.zoom) * 0.5;
    ctx.translate(
      -camera.x * camera.zoom + screenW * zoomOffset,
      -camera.y * camera.zoom + screenH * zoomOffset,
    );
    ctx.scale(camera.zoom, camera.zoom);

    renderGrid(cell, mapSize);
    renderTerrain(cell);
    renderObstacles(cell);
    renderFood(cell);
    renderPowerups(cell);
    renderPortals(cell);
    renderPlayers(cell);

    if (gameState.fogOfWar) renderFogOfWar(cell);
    renderEffects(cell);

    ctx.restore();

    // UI layer (not affected by camera)
    renderHUD();
    renderMinimap();
  }

  // --- Game loop ---
  const loop = new GameLoop(
    (dt) => { updateEffects(dt); },
    () => { render(); },
  );
  loop.start();

  // --- Public interface ---
  return {
    onAction(msg) {
      if (msg.result?.positions) {
        prevPlayers = structuredClone(localPlayers);
        for (const [pid, data] of Object.entries(msg.result.positions)) {
          if (localPlayers[pid]) {
            Object.assign(localPlayers[pid], data);
          }
        }
        lerpT = 0;
      }
      // Events
      if (msg.event === 'food_collected') {
        addEffect('eat', msg.x, msg.y, { color: localPlayers[msg.playerId]?.color });
        addEffect('score', msg.x, msg.y, { text: `+${msg.points || 10}` });
        if (msg.playerId === playerId) {
          actionFeedback.collected('🍎', canvas);
          actionFeedback.playerMood('happy', canvas);
        }
      }
      if (msg.event === 'player_eliminated') {
        addEffect('death', 0, 0);
        if (msg.playerId === playerId) {
          notify('YOU DIED!');
          actionFeedback.eliminated(canvas);
          actionFeedback.playerMood('devastated', canvas);
        }
      }
      if (msg.event === 'portal_entered') {
        addEffect('portal', msg.x, msg.y);
        if (msg.playerId === playerId) actionFeedback.emojiPop('🌀', window.innerWidth / 2, window.innerHeight / 3);
      }
      if (msg.event === 'combo_update') {
        const c = msg.combo || 0;
        if (c >= 3) {
          notify(`COMBO x${c}!`);
          if (msg.playerId === playerId) actionFeedback.combo(c, canvas);
        }
      }
      if (msg.event === 'treasure_spawned') {
        notify('TREASURE APPEARED!');
        actionFeedback.emojiPop('💎', window.innerWidth / 2, window.innerHeight / 3);
      }
      if (msg.event === 'event_started') notify(`EVENT: ${msg.eventType || '???'}`);
    },

    onTick(data) {
      if (data?.positions) {
        prevPlayers = structuredClone(localPlayers);
        for (const [pid, info] of Object.entries(data.positions)) {
          if (!localPlayers[pid]) localPlayers[pid] = {};
          Object.assign(localPlayers[pid], info);
        }
        lerpT = 0;
      }
      if (data?.food != null) gameState.food = data.food;
      if (data?.powerups != null) gameState.powerups = data.powerups;
      if (data?.scores) gameState.scores = data.scores;
      if (data?.timer != null) gameState.timer = data.timer;
      if (data?.level != null) gameState.level = data.level;
    },

    onSync(st) {
      gameState = st;
      prevPlayers = structuredClone(localPlayers);
      localPlayers = structuredClone(st.snakes || st.players || {});
      lerpT = 0;
    },

    destroy() {
      loop.stop();
      input.destroy();
      resizeObserver.disconnect();
      container.classList.remove('snake-arena-container', 'game-container');
      releaseWakeLock();
      for (const fn of cleanups) fn();
    },
  };
}

export default { create };
