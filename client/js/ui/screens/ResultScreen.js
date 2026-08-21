import { el } from '../components/dom.js';
import { soundManager } from '../../audio/SoundManager.js';
import { wsClient } from '../../multiplayer/WebSocketClient.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../../../shared/constants/events.js';
import { actionFeedback } from '../components/ActionFeedback.js';

function spawnConfetti(count = 40) {
  const colors = ['#7c6aff', '#ff5ea0', '#ffe156', '#34d399', '#38bdf8', '#fb923c', '#f87171', '#a78bfa'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'result-confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.top = '-10px';
    piece.style.background = colors[i % colors.length];
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${6 + Math.random() * 8}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = `${1.5 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

function animateCounter(element, target, duration = 1200) {
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    element.textContent = String(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function getMoodForRank(rank, total, isMe) {
  if (!isMe) return null;
  if (rank === 0) return 'ecstatic';
  if (rank === 1 && total > 2) return 'good';
  if (rank >= total - 1) return 'sad';
  return 'neutral';
}

function getReactionForRank(rank, total) {
  if (rank === 0) return { emoji: '👑', label: 'Champion !', class: 'win' };
  if (rank === 1) return { emoji: '💪', label: 'Bien joué !', class: '' };
  if (rank === total - 1) return { emoji: '😢', label: 'Pas de chance...', class: 'lose' };
  return { emoji: '😊', label: 'Pas mal', class: '' };
}

export function ResultScreen(container, state) {
  const { result, room } = state || {};
  if (!result) { window.app.router.navigate('/'); return; }

  const won = result.winner === wsClient.playerId;
  const winnerName = room?.players?.find((p) => p.id === result.winner)?.name || 'Personne';
  const duration = result.duration ? Math.round(result.duration / 1000) : 0;

  const entries = Object.entries(result.scores || {}).sort(([, a], [, b]) => b - a);
  const maxScore = entries.length ? entries[0][1] : 1;
  const myRank = entries.findIndex(([pid]) => pid === wsClient.playerId);
  const myReaction = getReactionForRank(myRank, entries.length);

  // Hero emoji with mood-dependent animation
  const heroEmoji = el('div', { class: `result-emoji-hero ${won ? 'win' : 'lose'}` },
    won ? '🏆' : '😢',
  );

  const titleText = won ? 'Victoire !' : `${winnerName} a gagné`;
  const title = el('h1', { class: 'result-title' }, titleText);

  const subtitle = el('p', {
    class: 'text-muted result-title',
    style: { animationDelay: '0.5s' },
  }, duration > 0 ? `Durée : ${duration}s` : '');

  // Player ranking rows with staggered animations and score bars
  const playerRows = entries.map(([pid, score], i) => {
    const name = room?.players?.find((p) => p.id === pid)?.name || pid.slice(0, 6);
    const isMe = pid === wsClient.playerId;
    const medals = ['🥇', '🥈', '🥉'];
    const barPercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const barColor = i === 0 ? 'var(--color-accent)' : i === 1 ? 'var(--color-primary-light)' : 'var(--color-info)';
    const reaction = getReactionForRank(i, entries.length);

    const scoreEl = el('div', {
      class: 'scoreboard-score result-score-value',
      style: { animationDelay: `${0.8 + i * 0.15}s`, fontSize: '1.2rem', fontWeight: '800' },
    }, '0');

    // Animate counter after delay
    setTimeout(() => animateCounter(scoreEl, score), 800 + i * 150);

    const row = el('div', {
      class: 'player-item result-player-row',
      style: {
        animationDelay: `${0.5 + i * 0.12}s`,
        border: isMe ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
        background: isMe ? 'var(--bg-elevated)' : 'var(--bg-card)',
        position: 'relative',
        overflow: 'hidden',
        padding: '12px 16px',
        borderRadius: 'var(--border-radius)',
      },
    },
      el('div', { style: { fontSize: '1.8rem', width: '44px', textAlign: 'center' } },
        i === 0 ? el('span', { class: 'result-crown' }, '👑') : (medals[i] || `#${i + 1}`),
      ),
      el('div', { style: { flex: 1 } },
        el('div', { style: { fontWeight: isMe ? '700' : '500', display: 'flex', alignItems: 'center', gap: '6px' } },
          isMe ? `${name} (toi)` : name,
          el('span', { style: { fontSize: '1.2rem' } }, reaction.emoji),
        ),
        el('div', { class: 'result-bar' },
          el('div', {
            class: 'result-bar-fill',
            style: { width: `${barPercent}%`, background: barColor, animationDelay: `${0.9 + i * 0.15}s` },
          }),
        ),
      ),
      scoreEl,
    );

    // Sparkles on the winner row
    if (i === 0) {
      for (let s = 0; s < 3; s++) {
        const sparkle = el('span', {
          class: 'result-sparkle',
          style: {
            left: `${20 + s * 35}%`,
            top: `${10 + s * 25}%`,
            animationDelay: `${s * 0.5}s`,
          },
        }, '✨');
        row.appendChild(sparkle);
      }
    }

    return row;
  });

  // Player mood reaction message
  const moodMessage = el('div', {
    class: 'text-center result-title',
    style: {
      animationDelay: '1.2s',
      fontSize: '1.1rem',
      padding: '12px',
      borderRadius: 'var(--border-radius)',
      background: won ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 92, 92, 0.1)',
      border: `1px solid ${won ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 92, 92, 0.2)'}`,
      marginTop: '12px',
    },
  },
    el('span', { style: { fontSize: '1.8rem', marginRight: '8px', verticalAlign: 'middle' } }, myReaction.emoji),
    myReaction.label,
  );

  const rematchBtn = el('button', {
    class: 'btn btn-primary btn-full btn-lg',
    style: { animation: 'slideUp 0.5s var(--ease-out-expo) 1.5s both' },
    onClick: () => {
      soundManager.play('click');
      wsClient.requestRematch();
      rematchBtn.textContent = '⏳ En attente...';
      rematchBtn.disabled = true;
    },
  }, '🔄 Rejouer');

  const homeBtn = el('button', {
    class: 'btn btn-secondary btn-full',
    style: { animation: 'slideUp 0.5s var(--ease-out-expo) 1.7s both' },
    onClick: () => {
      wsClient.leaveRoom();
      actionFeedback.destroy();
      window.app.router.navigate('/');
    },
  }, '🏠 Accueil');

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header', style: { padding: '30px 0 20px' } },
      heroEmoji,
      title,
      subtitle,
    ),
    el('div', { class: 'flex-col gap-sm mt-md' }, ...playerRows),
    moodMessage,
    el('div', { class: 'flex-col gap-md mt-xl' }, rematchBtn, homeBtn),
  );

  container.appendChild(screen);

  // Trigger confetti and mood feedback on win
  if (won) {
    setTimeout(() => spawnConfetti(50), 400);
    setTimeout(() => actionFeedback.victory(heroEmoji), 600);
  } else {
    setTimeout(() => {
      const mood = getMoodForRank(myRank, entries.length, true);
      if (mood) actionFeedback.playerMood(mood, heroEmoji);
    }, 800);
  }

  const cleanups = [];
  const unsubRematch = eventBus.on(EVENTS.GAME_REMATCH_ACCEPTED, (msg) => {
    soundManager.play('success');
    actionFeedback.destroy();
    window.app.router.navigate('/room', { room: msg.room });
  });
  cleanups.push(unsubRematch);

  return () => {
    for (const fn of cleanups) fn();
    actionFeedback.destroy();
  };
}
