import { addFullscreenBtn, acquireWakeLock } from '../shared/gameUtils.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('truthordare-container', 'game-container');
  let gameState = state;
  const cleanups = [];

  const challengeBox = document.createElement('div');
  challengeBox.className = 'card';
  challengeBox.style.cssText = 'text-align:center;padding:24px;min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%';
  container.appendChild(challengeBox);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px;width:100%';
  controlsContainer.appendChild(actions);

  const voteArea = document.createElement('div');
  voteArea.style.cssText = 'display:flex;gap:8px;margin-top:8px;justify-content:center';
  controlsContainer.appendChild(voteArea);

  const fsCleanup = addFullscreenBtn(container);
  if (fsCleanup) cleanups.push(fsCleanup);
  const releaseWakeLock = acquireWakeLock();

  // Keyboard: t for truth, d for dare
  const keyHandler = (e) => {
    if (!isMyTurn() || gameState.currentChallenge) return;
    const k = e.key.toLowerCase();
    if (k === 't' || k === '1') { e.preventDefault(); onAction({ choice: 'truth' }); }
    if (k === 'd' || k === '2') { e.preventDefault(); onAction({ choice: 'dare' }); }
  };
  document.addEventListener('keydown', keyHandler);
  cleanups.push(() => document.removeEventListener('keydown', keyHandler));

  let dareTimer = null;

  const isMyTurn = () => gameState.currentPlayer === playerId;

  function render() {
    const myTurn = isMyTurn();
    if (dareTimer) { clearInterval(dareTimer); dareTimer = null; }
    voteArea.innerHTML = '';

    if (gameState.currentChallenge) {
      const c = gameState.currentChallenge;
      challengeBox.innerHTML = `
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">${c.choiceType === 'truth' ? '🔮 Vérité' : '🎬 Action'} — ${c.category || ''}</div>
        <h2 style="font-size:1.3rem;font-weight:600;margin:12px 0">${c.text}</h2>
        <div id="dare-countdown" style="font-size:0.9rem;color:var(--text-muted);margin-top:8px"></div>
      `;

      // Dare timer (60 seconds for dares)
      if (c.choiceType === 'dare') {
        let remaining = 60;
        const countdownEl = challengeBox.querySelector('#dare-countdown');
        countdownEl.textContent = `⏱ ${remaining}s`;
        dareTimer = setInterval(() => {
          remaining--;
          countdownEl.textContent = `⏱ ${remaining}s`;
          if (remaining <= 10) countdownEl.style.color = 'var(--color-danger)';
          if (remaining <= 0) { clearInterval(dareTimer); dareTimer = null; countdownEl.textContent = '⏰ Temps écoulé !'; }
        }, 1000);
      }

      actions.innerHTML = '';
      if (myTurn) {
        const doneBtn = document.createElement('button');
        doneBtn.className = 'btn btn-primary btn-full';
        doneBtn.textContent = '✅ C\'est fait !';
        doneBtn.addEventListener('click', () => onAction({ type: 'done' }));
        actions.appendChild(doneBtn);

        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn btn-danger btn-full';
        skipBtn.textContent = '⏭ Passer (-5 pts)';
        skipBtn.addEventListener('click', () => onAction({ type: 'skip' }));
        actions.appendChild(skipBtn);
      } else {
        actions.innerHTML = '<p class="text-center text-muted">En attente du joueur...</p>';
        // Voting buttons for observers
        const voteYes = document.createElement('button');
        voteYes.className = 'btn btn-primary';
        voteYes.textContent = '👍 Réussi';
        voteYes.addEventListener('click', () => { onAction({ type: 'vote', vote: 'yes' }); voteYes.disabled = true; voteNo.disabled = true; });
        const voteNo = document.createElement('button');
        voteNo.className = 'btn btn-danger';
        voteNo.textContent = '👎 Raté';
        voteNo.addEventListener('click', () => { onAction({ type: 'vote', vote: 'no' }); voteYes.disabled = true; voteNo.disabled = true; });
        voteArea.appendChild(voteYes);
        voteArea.appendChild(voteNo);
      }
    } else {
      if (myTurn) {
        challengeBox.innerHTML = '<h2>C\'est ton tour !</h2><p class="text-muted mt-sm">Choisis Action ou Vérité</p>';
        actions.innerHTML = '';

        if (gameState.mode !== 'DARE') {
          const truthBtn = document.createElement('button');
          truthBtn.className = 'btn btn-primary btn-full btn-lg';
          truthBtn.textContent = '🔮 Vérité';
          truthBtn.addEventListener('click', () => onAction({ type: 'choose', choice: 'truth' }));
          actions.appendChild(truthBtn);
        }

        if (gameState.mode !== 'TRUTH') {
          const dareBtn = document.createElement('button');
          dareBtn.className = 'btn btn-secondary btn-full btn-lg';
          dareBtn.textContent = '🎬 Action';
          dareBtn.addEventListener('click', () => onAction({ type: 'choose', choice: 'dare' }));
          actions.appendChild(dareBtn);
        }
      } else {
        const currentName = gameState.currentPlayer?.slice(0, 8) || '...';
        challengeBox.innerHTML = `<h2>Tour de ${currentName}</h2><p class="text-muted mt-sm">En attente de son choix...</p>`;
        actions.innerHTML = '';
      }
    }
  }
  render();

  return {
    onAction(msg) {
      if (msg.result?.challenge) {
        gameState.currentChallenge = msg.result.challenge;
        render();
      }
      if (msg.result?.voted) {
        // Show vote count
        const countInfo = document.createElement('div');
        countInfo.className = 'text-center text-muted';
        countInfo.textContent = `Votes: ${msg.result.voteCount}/${msg.result.totalVoters}`;
        voteArea.appendChild(countInfo);
      }
      if (msg.result?.completed || msg.result?.skipped) {
        gameState.currentChallenge = null;
        gameState.currentRound = (gameState.currentRound || 0) + 1;
        // Update current player
        if (gameState.playerOrder) {
          gameState.currentPlayer = gameState.playerOrder[(gameState.currentRound) % gameState.playerOrder.length];
        }
        render();
      }
    },
    onTick() {},
    onSync(st) { gameState = st; render(); },
    destroy() { if (dareTimer) clearInterval(dareTimer); challengeBox.remove(); actions.remove(); voteArea.remove(); container.classList.remove('truthordare-container', 'game-container'); releaseWakeLock(); for (const fn of cleanups) fn(); },
  };
}

export default { create };
