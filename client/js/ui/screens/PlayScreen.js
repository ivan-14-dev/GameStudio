import { el, showToast } from '../components/dom.js';
import { GameRegistry } from '../../core/GameRegistry.js';
import { wsClient } from '../../multiplayer/WebSocketClient.js';
import { eventBus } from '../../core/EventBus.js';
import { soundManager } from '../../audio/SoundManager.js';
import { actionFeedback } from '../components/ActionFeedback.js';
import { EVENTS } from '../../shared/constants/events.js';

export function PlayScreen(container, state) {
  if (!state?.gameId) { window.app.router.navigate('/'); return; }

  const { gameId, roomId, room } = state;
  let gameState = state.state;
  let renderer = null;
  const cleanups = [];

  const scoreboard = el('div', { class: 'scoreboard', id: 'scoreboard' });
  const gameArea = el('div', { class: 'game-area', id: 'game-area' });
  const controls = el('div', { id: 'game-controls', style: { padding: '8px 0' } });

  const screen = el('div', { class: 'screen' },
    scoreboard,
    gameArea,
    controls,
  );
  container.appendChild(screen);

  // Load renderer lazily
  GameRegistry.load(gameId).then((RendererModule) => {
    if (!RendererModule) {
      showToast('Jeu non trouvé', 'error');
      return;
    }
    renderer = RendererModule.create({
      container: gameArea,
      controlsContainer: controls,
      state: gameState,
      playerId: wsClient.playerId,
      room,
      onAction: (action) => wsClient.sendAction(action),
    });
    updateScoreboard(gameState);
  });

  function updateScoreboard(st) {
    if (!st?.scores) return;
    scoreboard.innerHTML = '';
    const players = st.playerOrder || room?.players?.map((p) => p.id) || Object.keys(st.scores);
    for (const pid of players) {
      const name = room?.players?.find((p) => p.id === pid)?.name || pid.slice(0, 6);
      const isMe = pid === wsClient.playerId;
      scoreboard.appendChild(
        el('div', { class: 'scoreboard-player' },
          el('div', {
            class: 'scoreboard-name',
            style: isMe ? { color: 'var(--color-primary-light)', fontWeight: '600' } : {},
          }, isMe ? `${name} (toi)` : name),
          el('div', { class: 'scoreboard-score' }, String(st.scores[pid] ?? 0)),
        )
      );
    }
  }

  // Game events
  const unsubAction = eventBus.on(EVENTS.GAME_ACTION, (msg) => {
    if (renderer?.onAction) renderer.onAction(msg);
    if (msg.scores) updateScoreboard({ ...gameState, scores: msg.scores });

    const isMe = msg.playerId === wsClient.playerId;
    const r = msg.result || {};

    if (isMe) {
      if (r.match === true || r.correct) {
        soundManager.play('success');
        actionFeedback.correct(gameArea);
        actionFeedback.playerMood('happy', gameArea);
      } else if (r.match === false) {
        soundManager.play('error');
        actionFeedback.wrong(gameArea);
        actionFeedback.playerMood('worried', gameArea);
      } else if (r.error) {
        soundManager.play('error');
        actionFeedback.wrong(gameArea);
        actionFeedback.playerMood('sad', gameArea);
      } else if (r.winner) {
        soundManager.play('success');
        actionFeedback.emojiPop('🎯', window.innerWidth / 2, window.innerHeight / 3);
      } else if (r.eliminated) {
        actionFeedback.eliminated(gameArea);
      } else if (r.combo && r.combo > 1) {
        actionFeedback.combo(r.combo, gameArea);
      } else if (r.scoreChange) {
        actionFeedback.scoreChange(r.scoreChange, scoreboard);
        if (r.scoreChange > 0) actionFeedback.playerMood(r.scoreChange >= 50 ? 'ecstatic' : 'good', gameArea);
        else actionFeedback.playerMood('sad', gameArea);
      } else if (r.collected) {
        actionFeedback.collected(r.collected, gameArea);
        actionFeedback.playerMood('happy', gameArea);
      } else if (r.powerup) {
        actionFeedback.collected(r.powerup, gameArea);
        actionFeedback.playerMood('cool', gameArea);
      } else if (r.miss) {
        actionFeedback.playerMood('worried', gameArea);
      } else {
        soundManager.play('click');
      }
    } else {
      // Other player's actions — lighter feedback
      if (r.match === true || r.correct) {
        actionFeedback.floatingText('✓', window.innerWidth / 2 + 80, window.innerHeight / 3, 'var(--color-success)');
      } else if (r.eliminated) {
        actionFeedback.emojiPop('💀', window.innerWidth / 2 + 80, window.innerHeight / 3);
      }
    }
  });
  cleanups.push(unsubAction);

  const unsubTick = eventBus.on(EVENTS.GAME_TICK, (msg) => {
    if (renderer?.onTick) renderer.onTick(msg.data);
    if (msg.data?.scores) updateScoreboard({ ...gameState, scores: msg.data.scores });
  });
  cleanups.push(unsubTick);

  const unsubSync = eventBus.on(EVENTS.GAME_STATE_SYNC, (msg) => {
    gameState = msg.state;
    if (renderer?.onSync) renderer.onSync(gameState);
    updateScoreboard(gameState);
  });
  cleanups.push(unsubSync);

  const unsubFinished = eventBus.on(EVENTS.GAME_FINISHED, (msg) => {
    if (renderer?.destroy) renderer.destroy();
    const won = msg.winner === wsClient.playerId;
    soundManager.play(won ? 'win' : 'lose');
    if (won) {
      actionFeedback.victory(gameArea);
    } else {
      actionFeedback.playerMood('devastated', gameArea);
    }
    // Navigate after a short pause to let animations play
    setTimeout(() => {
      actionFeedback.destroy();
      window.app.router.navigate('/result', { result: msg, room });
    }, 1200);
  });
  cleanups.push(unsubFinished);

  const unsubDisconnect = eventBus.on(EVENTS.PLAYER_DISCONNECTED, (msg) => {
    const name = room?.players?.find((p) => p.id === msg.playerId)?.name || msg.playerId?.slice(0, 6);
    showToast(`${name} s'est déconnecté`, 'warning');
  });
  cleanups.push(unsubDisconnect);

  const unsubReconnect = eventBus.on(EVENTS.PLAYER_RECONNECTED, (msg) => {
    const name = room?.players?.find((p) => p.id === msg.playerId)?.name || msg.playerId?.slice(0, 6);
    showToast(`${name} s'est reconnecté`, 'success');
  });
  cleanups.push(unsubReconnect);

  // Pause/Resume overlay
  let pauseOverlay = null;
  const isHost = room?.hostId === wsClient.playerId;

  const unsubPause = eventBus.on(EVENTS.GAME_PAUSE, () => {
    if (pauseOverlay) return;
    pauseOverlay = el('div', {
      style: { position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, borderRadius: '12px' },
    },
    el('div', { style: { fontSize: '3rem' } }, '⏸'),
    el('div', { style: { color: '#fff', fontSize: '1.2rem', marginTop: '8px' } }, 'Partie en pause'),
    );
    if (isHost) {
      const resumeBtn = el('button', { class: 'btn btn-primary mt-md' }, '▶ Reprendre');
      resumeBtn.addEventListener('click', () => wsClient.send({ type: EVENTS.GAME_RESUME }));
      pauseOverlay.appendChild(resumeBtn);
    }
    gameArea.style.position = 'relative';
    gameArea.appendChild(pauseOverlay);
  });
  cleanups.push(unsubPause);

  const unsubResume = eventBus.on(EVENTS.GAME_RESUME, () => {
    if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; }
  });
  cleanups.push(unsubResume);

  if (isHost) {
    const pauseBtn = el('button', { class: 'btn btn-secondary', style: { position: 'absolute', top: '8px', right: '8px', zIndex: 10, padding: '6px 12px' } }, '⏸');
    pauseBtn.addEventListener('click', () => wsClient.send({ type: EVENTS.GAME_PAUSE }));
    gameArea.style.position = 'relative';
    gameArea.appendChild(pauseBtn);
  }

  // Show reconnecting banner when WS disconnects
  let reconnectBanner = null;
  const unsubWsDisconnect = eventBus.on('ws:disconnected', () => {
    if (!reconnectBanner) {
      reconnectBanner = el('div', {
        style: { position: 'fixed', top: 0, left: 0, right: 0, padding: '8px', background: 'var(--color-warning)', color: '#000', textAlign: 'center', zIndex: 1000, fontWeight: 600 },
      }, '⚠️ Reconnexion en cours...');
      document.body.appendChild(reconnectBanner);
    }
  });
  cleanups.push(unsubWsDisconnect);

  const unsubWsConnect = eventBus.on('ws:connected', () => {
    if (reconnectBanner) {
      reconnectBanner.remove();
      reconnectBanner = null;
    }
  });
  cleanups.push(unsubWsConnect);

  return () => {
    for (const fn of cleanups) fn();
    if (renderer?.destroy) renderer.destroy();
    actionFeedback.destroy();
  };
}
