import { actionFeedback } from '../../ui/components/ActionFeedback.js';
import { addFullscreenBtn, acquireWakeLock } from '../shared/gameUtils.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('memory-container', 'game-container');
  let gameState = state;
  const cleanups = [];

  const grid = document.createElement('div');
  const cols = Math.ceil(Math.sqrt(gameState.cardCount || 12));
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;max-width:420px;margin:0 auto;width:100%`;
  container.appendChild(grid);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes memFlip { 0% { transform: scaleX(1); } 50% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
    .mem-flip { animation: memFlip 0.3s ease; }
  `;
  container.appendChild(style);

  const fsCleanup = addFullscreenBtn(container);
  if (fsCleanup) cleanups.push(fsCleanup);
  const releaseWakeLock = acquireWakeLock();

  const cards = [];

  function renderCards() {
    grid.innerHTML = '';
    cards.length = 0;
    for (let i = 0; i < gameState.cardCount; i++) {
      const card = document.createElement('button');
      card.className = 'btn';
      card.style.cssText = 'aspect-ratio:1;font-size:1.8rem;background:var(--bg-card);border:2px solid var(--border-color);border-radius:10px;display:flex;align-items:center;justify-content:center;min-height:0;padding:0;transition:transform 0.2s ease';

      const visible = gameState.visibleCards?.[i];
      const matched = gameState.matched?.[i];

      if (matched) {
        card.textContent = visible || '✓';
        card.style.opacity = '0.4';
        card.style.background = 'var(--bg-surface)';
      } else if (visible) {
        card.textContent = visible;
        card.style.background = 'var(--bg-hover)';
        card.classList.add('mem-flip');
      } else {
        card.textContent = '?';
        card.style.color = 'var(--text-muted)';
        card.addEventListener('click', () => onAction({ index: i }));
      }

      grid.appendChild(card);
      cards.push(card);
    }
  }
  renderCards();

  const turnInfo = document.createElement('div');
  turnInfo.className = 'text-center mt-sm';
  controlsContainer.appendChild(turnInfo);

  const timerBar = document.createElement('div');
  timerBar.style.cssText = 'height:4px;background:var(--bg-card);border-radius:2px;margin-top:4px;overflow:hidden;display:none';
  const timerFill = document.createElement('div');
  timerFill.style.cssText = 'height:100%;background:var(--color-primary);transition:width 1s linear;width:100%';
  timerBar.appendChild(timerFill);
  controlsContainer.appendChild(timerBar);

  let turnTimerInterval = null;

  const scoreInfo = document.createElement('div');
  scoreInfo.className = 'text-center mt-sm text-muted';
  controlsContainer.appendChild(scoreInfo);

  function updateTurn() {
    if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
    const currentPid = gameState.playerOrder?.[gameState.currentTurn % gameState.playerOrder.length];
    turnInfo.textContent = currentPid === playerId ? '🟢 C\'est ton tour — retourne 2 cartes' : '⏳ Tour adverse...';
    // Show countdown if timeLimit exists
    const tl = gameState.timeLimit;
    if (tl && tl > 0) {
      timerBar.style.display = 'block';
      let remaining = tl;
      timerFill.style.width = '100%';
      turnTimerInterval = setInterval(() => {
        remaining--;
        timerFill.style.width = `${Math.max(0, (remaining / tl) * 100)}%`;
        timerFill.style.background = remaining <= 5 ? 'var(--color-danger)' : 'var(--color-primary)';
        if (remaining <= 0) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
      }, 1000);
    } else {
      timerBar.style.display = 'none';
    }
  }
  function updateScores() {
    if (!gameState.scores) return;
    const txt = Object.entries(gameState.scores).map(([pid, s]) => `${pid.slice(0, 6)}: ${s}`).join(' | ');
    scoreInfo.textContent = `Paires: ${gameState.pairsFound || 0}/${gameState.totalPairs || '?'} — ${txt}`;
  }
  updateTurn();
  updateScores();

  return {
    onAction(msg) {
      if (msg.result?.flipped != null) {
        const idx = msg.result.flipped;
        if (cards[idx]) {
          cards[idx].textContent = msg.result.card || '?';
          cards[idx].style.background = 'var(--bg-hover)';
          cards[idx].classList.add('mem-flip');
        }
      }
      if (msg.result?.match != null) {
        const [a, b] = msg.result.indices;
        const isMe = msg.playerId === playerId;
        if (msg.result.match) {
          gameState.matched[a] = true;
          gameState.matched[b] = true;
          gameState.visibleCards[a] = msg.result.card;
          gameState.visibleCards[b] = msg.result.card;
          gameState.pairsFound = (gameState.pairsFound || 0) + 1;
          renderCards();
          if (isMe) {
            actionFeedback.correct(grid);
            actionFeedback.playerMood('happy', grid);
          } else {
            actionFeedback.playerMood('worried', grid);
          }
        } else {
          // Show both cards briefly then hide
          if (cards[a]) { cards[a].textContent = msg.result.cards?.[0] || '?'; cards[a].style.background = 'var(--bg-hover)'; }
          if (cards[b]) { cards[b].textContent = msg.result.cards?.[1] || '?'; cards[b].style.background = 'var(--bg-hover)'; }
          gameState.currentTurn = (gameState.currentTurn || 0) + 1;
          setTimeout(() => {
            gameState.visibleCards[a] = null;
            gameState.visibleCards[b] = null;
            renderCards();
            updateTurn();
          }, 1000);
          updateScores();
          return;
        }
        updateTurn();
        updateScores();
      }
    },
    onTick() {},
    onSync(st) { gameState = st; renderCards(); updateTurn(); updateScores(); },
    destroy() { grid.remove(); turnInfo.remove(); scoreInfo.remove(); timerBar.remove(); style.remove(); if (turnTimerInterval) clearInterval(turnTimerInterval); container.classList.remove('memory-container', 'game-container'); releaseWakeLock(); for (const fn of cleanups) fn(); },
  };
}

export default { create };
