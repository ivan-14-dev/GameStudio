import { actionFeedback } from '../../ui/components/ActionFeedback.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  let gameState = state;

  const area = document.createElement('div');
  area.style.cssText = 'position:relative;width:100%;height:300px;background:var(--bg-card);border-radius:16px;overflow:hidden;touch-action:manipulation';
  container.appendChild(area);

  const info = document.createElement('div');
  info.className = 'text-center mt-sm';
  info.textContent = 'En attente de la cible...';
  controlsContainer.appendChild(info);

  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'text-center mt-sm text-muted';
  controlsContainer.appendChild(scoreDisplay);

  const reactionTimes = document.createElement('div');
  reactionTimes.className = 'text-center mt-sm text-muted';
  reactionTimes.style.cssText = 'font-size:0.85rem';
  controlsContainer.appendChild(reactionTimes);

  let targetEl = null;
  let countdownTimer = null;

  function updateScores() {
    if (!gameState.scores) return;
    const entries = Object.entries(gameState.scores).sort(([, a], [, b]) => b - a);
    scoreDisplay.textContent = entries.map(([pid, s]) => `${pid.slice(0, 6)}: ${s}pts`).join(' | ');
  }

  function showTarget(pos, size) {
    if (targetEl) targetEl.remove();
    targetEl = document.createElement('div');
    const s = size || gameState.targetSize || 50;
    targetEl.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:var(--color-danger);cursor:pointer;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);animation:scaleIn 0.15s ease`;
    targetEl.addEventListener('pointerdown', () => {
      onAction({ type: 'react' });
      targetEl.style.background = 'var(--color-success)';
      info.textContent = 'Touché !';
    });
    area.appendChild(targetEl);
    info.textContent = '🎯 Appuyez sur la cible !';
  }

  function showFakeTarget(pos) {
    if (targetEl) targetEl.remove();
    targetEl = document.createElement('div');
    targetEl.style.cssText = `position:absolute;width:50px;height:50px;border-radius:50%;background:var(--color-warning);cursor:pointer;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%)`;
    targetEl.addEventListener('pointerdown', () => {
      info.textContent = '❌ Fausse cible ! -5 points';
      targetEl.style.background = '#888';
    });
    area.appendChild(targetEl);
    info.textContent = '⚠️ Attention...';
  }

  // Auto-start first round
  setTimeout(() => onAction({ type: 'start_round' }), 500);

  return {
    onAction(msg) {
      if (msg.result?.newRound) {
        if (targetEl) targetEl.remove();
        if (countdownTimer) clearInterval(countdownTimer);
        // Countdown animation before target appears
        let countdown = Math.ceil((msg.result.delay || 1500) / 1000);
        info.textContent = `Round ${msg.result.newRound}/${gameState.rounds}... ${countdown}`;
        countdownTimer = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            info.textContent = `Round ${msg.result.newRound}/${gameState.rounds}... ${countdown}`;
          } else {
            clearInterval(countdownTimer);
            countdownTimer = null;
          }
        }, 1000);
        setTimeout(() => {
          if (msg.result.isFake) {
            showFakeTarget(msg.result.position);
          } else {
            showTarget(msg.result.position);
          }
        }, msg.result.delay || 1500);
      }
      if (msg.result?.position != null && msg.result.points) {
        info.textContent = `+${msg.result.points} points ! (${msg.result.position === 1 ? '1er' : msg.result.position + 'e'}) — ${msg.result.reactionTime}ms`;
        if (msg.playerId === playerId) {
          if (msg.result.position === 1) {
            actionFeedback.playerMood('ecstatic', area);
            actionFeedback.scoreChange(msg.result.points, area);
          } else if (msg.result.position <= 2) {
            actionFeedback.playerMood('good', area);
          } else {
            actionFeedback.playerMood('neutral', area);
          }
        }
        // Show per-player reaction times
        if (msg.result.allReactionTimes) {
          reactionTimes.innerHTML = Object.entries(msg.result.allReactionTimes)
            .sort(([, a], [, b]) => a - b)
            .map(([pid, t]) => `${pid.slice(0, 6)}: <b>${t}ms</b>`)
            .join(' &middot; ');
        }
        if (msg.scores) {
          gameState.scores = msg.scores;
          updateScores();
        }
        // Auto-start next round
        setTimeout(() => onAction({ type: 'start_round' }), 2000);
      }
    },
    onTick() {},
    onSync(st) {
      gameState = st;
      updateScores();
      if (st.targetActive && st.targetPosition) {
        showTarget(st.targetPosition);
      }
    },
    destroy() {
      if (countdownTimer) clearInterval(countdownTimer);
      area.remove();
      info.remove();
      scoreDisplay.remove();
      reactionTimes.remove();
    },
  };
}

export default { create };
