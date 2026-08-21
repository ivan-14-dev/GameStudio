import { el } from '../../ui/components/dom.js';
import { actionFeedback } from '../../ui/components/ActionFeedback.js';
import { addFullscreenBtn, acquireWakeLock } from '../shared/gameUtils.js';

export function create({ container, controlsContainer, state, playerId, onAction }) {
  container.classList.add('quiz-container', 'game-container');
  let gameState = state;
  let answered = false;
  const cleanups = [];

  const questionBox = document.createElement('div');
  questionBox.className = 'card';
  questionBox.style.cssText = 'text-align:center;padding:24px;width:100%';
  container.appendChild(questionBox);

  const answersBox = document.createElement('div');
  answersBox.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:16px;width:100%';
  controlsContainer.appendChild(answersBox);

  const statusText = document.createElement('div');
  statusText.className = 'text-center text-muted mt-sm';
  controlsContainer.appendChild(statusText);

  const fsCleanup = addFullscreenBtn(container);
  if (fsCleanup) cleanups.push(fsCleanup);
  const releaseWakeLock = acquireWakeLock();

  // Keyboard: 1-4 for answers
  const keyHandler = (e) => {
    if (answered) return;
    const idx = parseInt(e.key) - 1;
    const q = gameState.question;
    if (q && idx >= 0 && idx < (q.answers || []).length) {
      e.preventDefault();
      answered = true;
      onAction({ answer: q.answers[idx] });
      const btns = answersBox.querySelectorAll('button');
      if (btns[idx]) { btns[idx].style.background = 'var(--color-primary)'; btns[idx].style.color = '#fff'; }
      statusText.textContent = '⏳ En attente des autres joueurs...';
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanups.push(() => document.removeEventListener('keydown', keyHandler));

  let questionTimer = null;

  function renderQuestion() {
    if (questionTimer) { clearInterval(questionTimer); questionTimer = null; }
    const q = gameState.question;
    if (!q) {
      questionBox.innerHTML = '<p>En attente de la question...</p>';
      answersBox.innerHTML = '';
      return;
    }

    answered = false;
    questionBox.innerHTML = `
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">${q.category || ''} — Q${(gameState.currentQuestion || 0) + 1}/${gameState.totalQuestions}</div>
      <h2 style="font-size:1.3rem;font-weight:600">${q.question}</h2>
    `;

    answersBox.innerHTML = '';
    for (const answer of (q.answers || [])) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-full';
      btn.style.cssText = 'text-align:left;padding:14px 18px;font-size:1rem';
      btn.textContent = `${i + 1}. ${answer}`;
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        onAction({ answer });
        btn.style.background = 'var(--color-primary)';
        btn.style.color = '#fff';
        statusText.textContent = '⏳ En attente des autres joueurs...';
      });
      answersBox.appendChild(btn);
    }

    statusText.textContent = `⏱ ${q.timeLimit || 15}s`;
    // Live countdown
    let remaining = q.timeLimit || 15;
    questionTimer = setInterval(() => {
      remaining--;
      statusText.textContent = `⏱ ${remaining}s`;
      if (remaining <= 5) statusText.style.color = 'var(--color-danger)';
      if (remaining <= 0) { clearInterval(questionTimer); questionTimer = null; }
    }, 1000);
  }
  renderQuestion();

  return {
    onAction(msg) {
      if (msg.result?.waiting) {
        statusText.textContent = `${msg.result.answeredCount} réponse(s)...`;
        return;
      }
      if (msg.result?.questionResolved) {
        const correct = msg.result.correctAnswer;
        // Highlight correct answer
        answersBox.querySelectorAll('button').forEach((btn) => {
          if (btn.textContent === correct) {
            btn.style.background = 'var(--color-success)';
            btn.style.color = '#fff';
          }
        });

        // Feedback for my result
        if (msg.result.results && Array.isArray(msg.result.results)) {
          const myResult = msg.result.results.find(r => r.playerId === playerId);
          if (myResult?.correct) {
            actionFeedback.correct(questionBox);
            actionFeedback.playerMood(myResult.speedBonus ? 'ecstatic' : 'happy', questionBox);
          } else if (myResult) {
            actionFeedback.wrong(questionBox);
            actionFeedback.playerMood('sad', questionBox);
          }
        }

        // Show per-player results
        if (msg.result.results && Array.isArray(msg.result.results)) {
          const resultsDiv = document.createElement('div');
          resultsDiv.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:4px';
          for (const r of msg.result.results) {
            const row = document.createElement('div');
            row.style.cssText = `display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:${r.correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`;
            row.innerHTML = `<span>${r.playerId?.slice(0, 6) || '?'}</span><span>${r.correct ? '✅' : '❌'} ${r.speedBonus ? `+${r.speedBonus}` : ''}</span>`;
            resultsDiv.appendChild(row);
          }
          answersBox.appendChild(resultsDiv);
        }

        statusText.textContent = `✅ Réponse : ${correct}`;

        // Auto-advance after 2.5s
        setTimeout(() => {
          gameState.currentQuestion = (gameState.currentQuestion || 0) + 1;
          renderQuestion();
        }, 2500);
      }
    },
    onTick() {},
    onSync(st) {
      gameState = st;
      renderQuestion();
    },
    destroy() {
      if (questionTimer) clearInterval(questionTimer);
      questionBox.remove();
      answersBox.remove();
      statusText.remove();
      container.classList.remove('quiz-container', 'game-container');
      releaseWakeLock();
      for (const fn of cleanups) fn();
    },
  };
}

export default { create };
