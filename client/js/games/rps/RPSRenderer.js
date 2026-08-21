const ICONS = { rock: '🪨', paper: '📄', scissors: '✂️' };
import { actionFeedback } from '../../ui/components/ActionFeedback.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  let gameState = state;
  let chosen = false;

  const info = document.createElement('div');
  info.className = 'text-center';
  info.innerHTML = `<h2>Round ${(gameState.currentRound || 0) + 1}/${gameState.rounds}</h2>`;
  container.appendChild(info);

  const result = document.createElement('div');
  result.className = 'text-center mt-lg';
  result.style.cssText = 'font-size:3rem;min-height:80px;display:flex;align-items:center;justify-content:center';
  result.textContent = '❓';
  container.appendChild(result);

  // Reveal area for all players' choices
  const revealArea = document.createElement('div');
  revealArea.style.cssText = 'display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:12px;min-height:60px';
  container.appendChild(revealArea);

  // Choice buttons
  const choices = document.createElement('div');
  choices.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:16px';
  for (const [key, icon] of Object.entries(ICONS)) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.cssText = 'font-size:2.5rem;padding:16px 24px;border-radius:16px;transition:transform 0.15s,opacity 0.15s';
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      if (chosen) return;
      chosen = true;
      onAction({ choice: key });
      result.textContent = icon;
      choices.querySelectorAll('button').forEach((b) => {
        b.style.opacity = b === btn ? '1' : '0.3';
        b.style.transform = b === btn ? 'scale(1.1)' : 'scale(0.9)';
      });
    });
    choices.appendChild(btn);
  }
  controlsContainer.appendChild(choices);

  const waitingText = document.createElement('div');
  waitingText.className = 'text-center text-muted mt-md';
  controlsContainer.appendChild(waitingText);

  function showRoundResult(rr) {
    revealArea.innerHTML = '';
    for (const [pid, choice] of Object.entries(rr.choices || {})) {
      const isWinner = rr.winners.includes(pid);
      const isMe = pid === playerId;
      const card = document.createElement('div');
      card.style.cssText = `text-align:center;padding:8px 12px;border-radius:12px;background:${isWinner ? 'var(--color-success)' : 'var(--bg-card)'};border:${isMe ? '2px solid var(--color-primary)' : '1px solid var(--border-color)'}`;
      card.innerHTML = `<div style="font-size:2rem">${ICONS[choice] || '?'}</div><div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">${pid.slice(0, 6)}${isMe ? ' (toi)' : ''}</div>`;
      revealArea.appendChild(card);
    }
  }

  return {
    onAction(msg) {
      if (msg.result?.waiting) {
        waitingText.textContent = `${msg.result.answeredCount || '?'} joueur(s) ont choisi...`;
        return;
      }
      if (msg.result?.roundResult) {
        const rr = msg.result.roundResult;
        showRoundResult(rr);

        if (rr.winners?.includes(playerId)) {
          actionFeedback.correct(container);
          actionFeedback.playerMood('happy', container);
          waitingText.textContent = 'Gagnant du round !';
        } else if (rr.winners?.length > 0) {
          actionFeedback.wrong(container);
          actionFeedback.playerMood('sad', container);
          waitingText.textContent = 'Perdu ce round...';
        } else {
          actionFeedback.emojiPop('🤝', window.innerWidth / 2, window.innerHeight / 3);
          waitingText.textContent = 'Égalité !';
        }

        // Reset for next round after delay
        setTimeout(() => {
          chosen = false;
          result.textContent = '❓';
          revealArea.innerHTML = '';
          choices.querySelectorAll('button').forEach((b) => { b.style.opacity = '1'; b.style.transform = 'scale(1)'; });
          waitingText.textContent = '';
          gameState.currentRound = (gameState.currentRound || 0) + 1;
          info.innerHTML = `<h2>Round ${gameState.currentRound + 1}/${gameState.rounds}</h2>`;
        }, 2500);
      }
    },
    onTick() {},
    onSync(st) { gameState = st; },
    destroy() { info.remove(); result.remove(); revealArea.remove(); choices.remove(); waitingText.remove(); },
  };
}

export default { create };
