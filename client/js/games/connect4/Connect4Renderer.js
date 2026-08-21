const COLORS = { '🔴': '#ef4444', '🟡': '#fbbf24', '🔵': '#3b82f6', '🟢': '#22c55e' };
import { actionFeedback } from '../../ui/components/ActionFeedback.js';
import { addFullscreenBtn, acquireWakeLock } from '../shared/gameUtils.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('connect4-container', 'game-container');
  let gameState = state;
  const cleanups = [];
  const grid = document.createElement('div');
  grid.className = 'c4-grid';
  container.appendChild(grid);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes dropIn { from { transform: translateY(-300px); opacity:0.5; } to { transform: translateY(0); opacity:1; } }
    .c4-cell-win { animation: winPulse 0.6s ease infinite alternate; }
    @keyframes winPulse { from { box-shadow: 0 0 0 0 rgba(255,215,0,0.7); } to { box-shadow: 0 0 12px 4px rgba(255,215,0,0.9); } }
    .c4-cell-drop { animation: dropIn 0.35s cubic-bezier(.34,1.56,.64,1); }
    .c4-cell-last { box-shadow: 0 0 0 3px rgba(255,255,255,0.6); }
  `;
  container.appendChild(style);

  const fsCleanup = addFullscreenBtn(container);
  if (fsCleanup) cleanups.push(fsCleanup);
  const releaseWakeLock = acquireWakeLock();

  // Keyboard: 1-7 for column selection
  const keyHandler = (e) => {
    const col = parseInt(e.key) - 1;
    if (col >= 0 && col < gameState.cols && isMyTurn() && !gameState.winner && gameState.board[0][col] === null) {
      e.preventDefault();
      onAction({ col });
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanups.push(() => document.removeEventListener('keydown', keyHandler));

  let lastMove = null;

  function isMyTurn() {
    const currentPid = gameState.playerOrder?.[gameState.currentTurn % gameState.playerOrder.length];
    return currentPid === playerId;
  }

  function renderBoard() {
    grid.innerHTML = '';
    const myTurn = isMyTurn() && !gameState.winner;

    // Column buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display:grid;grid-template-columns:repeat(${gameState.cols},1fr);gap:3px;margin-bottom:4px`;
    for (let c = 0; c < gameState.cols; c++) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = '↓';
      btn.style.cssText = 'min-height:36px;font-size:1.2rem;padding:4px';
      btn.disabled = !myTurn || gameState.board[0][c] !== null;
      if (btn.disabled) btn.style.opacity = '0.4';
      btn.addEventListener('click', () => onAction({ col: c }));
      btnRow.appendChild(btn);
    }
    grid.appendChild(btnRow);

    // Board
    const board = document.createElement('div');
    board.style.cssText = `display:grid;grid-template-columns:repeat(${gameState.cols},1fr);gap:3px;background:var(--color-primary);padding:6px;border-radius:12px`;
    const winSet = new Set((gameState.winLine || []).map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        const val = gameState.board[r][c];
        const cell = document.createElement('div');
        cell.style.cssText = 'aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center';
        const color = val ? (COLORS[gameState.playerColors?.[val]] || '#888') : 'var(--bg-primary)';
        cell.style.background = color;
        if (winSet.has(`${r},${c}`)) cell.classList.add('c4-cell-win');
        if (lastMove && lastMove.row === r && lastMove.col === c && !gameState.winner) {
          cell.classList.add('c4-cell-last', 'c4-cell-drop');
        }
        board.appendChild(cell);
      }
    }
    grid.appendChild(board);
  }
  renderBoard();

  const turnInfo = document.createElement('div');
  turnInfo.className = 'text-center mt-sm text-muted';
  controlsContainer.appendChild(turnInfo);

  const timerBar = document.createElement('div');
  timerBar.style.cssText = 'height:4px;background:var(--bg-card);border-radius:2px;margin-top:4px;overflow:hidden;display:none';
  const timerFill = document.createElement('div');
  timerFill.style.cssText = 'height:100%;background:var(--color-primary);transition:width 1s linear;width:100%';
  timerBar.appendChild(timerFill);
  controlsContainer.appendChild(timerBar);

  let turnTimerInterval = null;

  function updateTurn() {
    if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
    if (gameState.winner) {
      turnInfo.textContent = gameState.winner === playerId ? '🎉 Tu as gagné !' : '😢 Défaite...';
      turnInfo.style.color = gameState.winner === playerId ? 'var(--color-success)' : 'var(--color-danger)';
      timerBar.style.display = 'none';
    } else {
      const currentPid = gameState.playerOrder?.[gameState.currentTurn % gameState.playerOrder.length];
      turnInfo.textContent = currentPid === playerId ? '🟢 C\'est ton tour !' : '⏳ Tour adverse...';
      turnInfo.style.color = '';
      // Show countdown timer if timeLimit is set
      const tl = gameState.timeLimit;
      if (tl && tl > 0) {
        timerBar.style.display = 'block';
        let remaining = tl;
        timerFill.style.width = '100%';
        turnTimerInterval = setInterval(() => {
          remaining--;
          timerFill.style.width = `${Math.max(0, (remaining / tl) * 100)}%`;
          if (remaining <= 5) timerFill.style.background = 'var(--color-danger)';
          else timerFill.style.background = 'var(--color-primary)';
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
      if (msg.result?.row != null) {
        gameState.board[msg.result.row][msg.action?.col] = msg.playerId;
        gameState.currentTurn++;
        lastMove = { row: msg.result.row, col: msg.action?.col };
        renderBoard();
        updateTurn();
        const isMe = msg.playerId === playerId;
        if (isMe) actionFeedback.emojiPop('🎯', window.innerWidth / 2, window.innerHeight / 2);
        if (msg.result?.winner) {
          const won = msg.result.winner === playerId;
          if (won) actionFeedback.playerMood('ecstatic', grid);
          else actionFeedback.playerMood('sad', grid);
        }
      }
    },
    onTick() {},
    onSync(st) { gameState = st; lastMove = null; renderBoard(); updateTurn(); },
    destroy() { grid.remove(); turnInfo.remove(); timerBar.remove(); style.remove(); if (turnTimerInterval) clearInterval(turnTimerInterval); container.classList.remove('connect4-container', 'game-container'); releaseWakeLock(); for (const fn of cleanups) fn(); },
  };
}

export default { create };
