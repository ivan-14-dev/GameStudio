import { el, showToast } from '../components/dom.js';
import { soundManager } from '../../audio/SoundManager.js';
import { wsClient } from '../../multiplayer/WebSocketClient.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../../../shared/constants/events.js';

export function RoomScreen(container, state) {
  const room = state?.room;
  if (!room) { window.app.router.navigate('/'); return; }

  let currentRoom = room;
  const cleanups = [];

  function renderPlayerList() {
    const list = container.querySelector('#player-list');
    if (!list) return;
    list.innerHTML = '';
    for (const p of currentRoom.players) {
      const item = el('div', { class: 'player-item' },
        el('div', {
          class: 'player-avatar',
          style: { background: p.id === currentRoom.hostId ? 'var(--color-accent)' : 'var(--color-primary)' },
        }, p.name[0]?.toUpperCase() || '?'),
        el('div', { style: { flex: 1 } },
          el('div', { style: { fontWeight: '600' } },
            p.name, p.id === currentRoom.hostId ? ' 👑' : '',
          ),
          el('div', { class: 'text-muted', style: { fontSize: '0.8rem' } },
            p.ready ? '✅ Prêt' : '⏳ En attente',
          ),
        ),
        !p.connected ? el('span', { class: 'badge', style: { background: 'var(--color-danger)', color: '#fff' } }, '⚠️ Déconnecté') : null,
      );
      list.appendChild(item);
    }
  }

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('h1', {}, '🎮 Salle d\'attente'),
      el('p', {}, `Jeu : ${room.gameId}`),
    ),
    el('div', { class: 'text-center mt-lg' },
      el('p', { class: 'text-muted' }, 'Partagez ce code :'),
      el('div', { class: 'room-code mt-sm' }, room.code),
      el('button', {
        class: 'btn btn-secondary mt-sm',
        onClick: () => {
          const url = `${location.origin}/join/${room.code}`;
          navigator.clipboard?.writeText(url).then(() => showToast('Lien copié !', 'success'));
        },
      }, '📋 Copier le lien'),
    ),
    el('div', { class: 'mt-lg' },
      el('h3', {}, `Joueurs (${room.players.length}/${room.maxPlayers})`),
      el('div', { id: 'player-list', class: 'player-list mt-sm' }),
    ),
    el('div', { class: 'flex-col gap-md mt-xl' },
      el('button', {
        class: 'btn btn-primary btn-full btn-lg',
        id: 'ready-btn',
        onClick: () => {
          const myPlayer = currentRoom.players.find((p) => p.id === wsClient.playerId);
          const ready = myPlayer ? !myPlayer.ready : true;
          wsClient.setReady(ready);
          soundManager.play('click');
        },
      }, '✅ Prêt !'),
      el('button', {
        class: 'btn btn-danger btn-full',
        onClick: () => {
          wsClient.leaveRoom();
          window.app.router.navigate('/');
        },
      }, '🚪 Quitter'),
    ),
  );

  container.appendChild(screen);
  renderPlayerList();

  // Listen for room updates
  const unsubUpdate = eventBus.on(EVENTS.ROOM_UPDATE, (msg) => {
    currentRoom = msg.room;
    renderPlayerList();

    // Update player count
    const h3 = container.querySelector('h3');
    if (h3) h3.textContent = `Joueurs (${currentRoom.players.length}/${currentRoom.maxPlayers})`;
  });
  cleanups.push(unsubUpdate);

  const unsubJoined = eventBus.on(EVENTS.PLAYER_JOINED, (msg) => {
    showToast(`${msg.player.name} a rejoint !`, 'success');
    soundManager.play('success');
  });
  cleanups.push(unsubJoined);

  const unsubLeft = eventBus.on(EVENTS.PLAYER_LEFT, (msg) => {
    showToast('Un joueur a quitté', 'info');
  });
  cleanups.push(unsubLeft);

  const unsubCountdown = eventBus.on(EVENTS.GAME_COUNTDOWN, (msg) => {
    soundManager.play('countdown');
    const area = container.querySelector('.game-area') || container;
    let cd = area.querySelector('.countdown');
    if (!cd) {
      cd = el('div', { class: 'countdown' });
      area.appendChild(cd);
    }
    cd.textContent = msg.count;
  });
  cleanups.push(unsubCountdown);

  const unsubStart = eventBus.on(EVENTS.GAME_START, (msg) => {
    window.app.router.navigate('/play', {
      gameId: currentRoom.gameId,
      roomId: currentRoom.roomId,
      state: msg.state,
      room: currentRoom,
    });
  });
  cleanups.push(unsubStart);

  return () => { for (const fn of cleanups) fn(); };
}
