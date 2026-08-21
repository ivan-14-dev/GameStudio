import { el } from '../../ui/components/dom.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  let gameState = state;
  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${state.size},1fr);gap:4px;max-width:400px;margin:0 auto;aspect-ratio:1`;
  container.appendChild(grid);

  // Inject win animation
  const style = document.createElement('style');
  style.textContent = `
    .ttt-cell-win { animation: tttWin 0.5s ease infinite alternate; }
    @keyframes tttWin { from { background: var(--bg-card); } to { background: rgba(255,215,0,0.3); } }
    .ttt-cell-place { animation: tttPlace 0.2s ease; }
    @keyframes tttPlace { from { transform: scale(0); } to { transform: scale(1); } }
  `;
  container.appendChild(style);

  const cells = [];
  const SYMBOL_COLORS = { X: '#6c63ff', O: '#f472b6', '△': '#4ade80', '□': '#fbbf24' };

  function renderBoard() {
    grid.innerHTML = '';
    cells.length = 0;
    const winSet = new Set((gameState.winLine || []).map(([r, c]) => `${r},${c}`));
    const myTurn = !gameState.winner && gameState.playerOrder?.[gameState.currentTurn % gameState.playerOrder.length] === playerId;

    for (let r = 0; r < gameState.size; r++) {
      for (let c = 0; c < gameState.size; c++) {
        const val = gameState.board[r][c];
        const cell = document.createElement('button');
        cell.className = 'btn';
        cell.style.cssText = `aspect-ratio:1;font-size:1.5rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;display:flex;align-items:center;justify-content:center;min-height:0;padding:0`;
        if (val) {
          cell.textContent = val;
          cell.style.color = SYMBOL_COLORS[val] || '#fff';
          cell.style.fontWeight = '700';
          if (winSet.has(`${r},${c}`)) cell.classList.add('ttt-cell-win');
          if (lastPlaced && lastPlaced.row === r && lastPlaced.col === c) cell.classList.add('ttt-cell-place');
        }
        if (!val && myTurn) {
          cell.addEventListener('click', () => onAction({ row: r, col: c }));
        } else if (!val) {
          cell.disabled = true;
          cell.style.opacity = '0.6';
        }
        grid.appendChild(cell);
        cells.push(cell);
      }
    }
  }
  renderBoard();

  const turnInfo = el('div', { class: 'text-center mt-sm text-muted', id: 'turn-info' });
  controlsContainer.appendChild(turnInfo);

  const timerBar = document.createElement('div');
  timerBar.style.cssText = 'height:4px;background:var(--bg-card);border-radius:2px;margin-top:4px;overflow:hidden;display:none';
  const timerFill = document.createElement('div');
  timerFill.style.cssText = 'height:100%;background:var(--color-primary);transition:width 1s linear;width:100%';
  timerBar.appendChild(timerFill);
  controlsContainer.appendChild(timerBar);

  let turnTimerInterval = null;
  let lastPlaced = null; // {row,col}

  function updateTurn() {
    if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
    if (gameState.winner) {
      const isMe = gameState.winner === playerId;
      turnInfo.textContent = isMe ? '🎉 Tu as gagné !' : '😢 Défaite...';
      turnInfo.style.color = isMe ? 'var(--color-success)' : 'var(--color-danger)';
      timerBar.style.display = 'none';
    } else {
      const currentPid = gameState.playerOrder?.[gameState.currentTurn % gameState.playerOrder.length];
      const isMyTurn = currentPid === playerId;
      turnInfo.textContent = isMyTurn ? '🟢 C\'est ton tour !' : '⏳ Tour adverse...';
      turnInfo.style.color = isMyTurn ? 'var(--color-success)' : 'var(--text-muted)';
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
  }
  updateTurn();

  return {
    onAction(msg) {
      if (msg.result) {
        const { row, col, symbol } = msg.result;
        if (row != null && col != null && gameState.board[row]) {
          gameState.board[row][col] = symbol;
          gameState.currentTurn = (gameState.currentTurn || 0) + 1;
          lastPlaced = { row, col };
          renderBoard();
          updateTurn();
          const isMe = msg.playerId === playerId;
          if (isMe) actionFeedback.emojiPop(symbol, window.innerWidth / 2, window.innerHeight / 2);
          if (msg.result.winner) {
            if (msg.result.winner === playerId) actionFeedback.playerMood('ecstatic', grid);
            else actionFeedback.playerMood('sad', grid);
          }
        }
      }
    },
    onTick() {},
    onSync(st) { gameState = st; lastPlaced = null; renderBoard(); updateTurn(); },
    destroy() { grid.remove(); turnInfo.remove(); timerBar.remove(); style.remove(); if (turnTimerInterval) clearInterval(turnTimerInterval); },
  };
}

export default { create };
