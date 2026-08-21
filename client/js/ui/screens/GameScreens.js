import { el, showToast } from '../components/dom.js';
import { soundManager } from '../../audio/SoundManager.js';
import { wsClient } from '../../multiplayer/WebSocketClient.js';
import { eventBus } from '../../core/EventBus.js';
import { EVENTS } from '../../shared/constants/events.js';

function getWsUrl() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return `ws://${location.hostname}:${location.port || 3000}/ws`;
  }
  const serverHost = window.__WS_SERVER__ || 'gamestudio-2pl4.onrender.com';
  return `wss://${serverHost}/ws`;
}

const GAME_INFO = {
  snake: { icon: '🐍', name: 'Snake Duel', players: '2–4', desc: 'Compétition de serpents' },
  pong: { icon: '🏓', name: 'Pong Duel', players: '2–4', desc: 'Le classique revisité' },
  tictactoe: { icon: '❌', name: 'Tic Tac Toe', players: '2–4', desc: 'Morpion multijoueur' },
  connect4: { icon: '🔴', name: 'Puissance 4', players: '2–4', desc: 'Alignez 4 jetons' },
  rps: { icon: '✊', name: 'Pierre Feuille Ciseaux', players: '2–8', desc: 'Rounds et combos' },
  memory: { icon: '🧠', name: 'Memory Duel', players: '2–4', desc: 'Trouvez les paires' },
  reaction: { icon: '⚡', name: 'Réaction', players: '2–8', desc: 'Le plus rapide gagne' },
  quiz: { icon: '❓', name: 'Quiz Duel', players: '2–8', desc: 'Testez vos connaissances' },
  truthordare: { icon: '🎭', name: 'Action ou Vérité', players: '2–12', desc: 'Contenu personnalisable' },
  'snake-arena': { icon: '🐍', name: 'Snake Arena', players: '2–8', desc: 'Arène compétitive avec pouvoirs' },
};

export function GameListScreen(container) {
  const gameCards = Object.entries(GAME_INFO).map(([id, info]) =>
    el('div', {
      class: 'card',
      style: { cursor: 'pointer' },
      onClick: () => {
        soundManager.play('click');
        window.app.router.navigate('/create', { gameId: id });
      },
    },
      el('div', { style: { fontSize: '2rem', marginBottom: '8px' } }, info.icon),
      el('div', { style: { fontWeight: '600', fontSize: '1.1rem' } }, info.name),
      el('div', { class: 'text-muted', style: { fontSize: '0.85rem', margin: '4px 0' } }, info.desc),
      el('div', { class: 'badge badge-primary' }, `👥 ${info.players}`),
    )
  );

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('button', {
        class: 'btn btn-secondary',
        style: { position: 'absolute', left: '16px' },
        onClick: () => window.app.router.navigate('/'),
      }, '← Retour'),
      el('h1', {}, 'Jeux'),
    ),
    el('div', { class: 'game-grid mt-lg' }, ...gameCards),
  );

  container.appendChild(screen);
}

export function CreateGameScreen(container, state) {
  const selectedGame = state?.gameId || 'snake';
  const info = GAME_INFO[selectedGame] || GAME_INFO.snake;
  const maxPlayersForGame = parseInt((info.players || '2–4').split('–')[1]) || 4;

  let maxPlayers = Math.min(4, maxPlayersForGame);
  let difficulty = 1;

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('button', {
        class: 'btn btn-secondary',
        style: { position: 'absolute', left: '16px' },
        onClick: () => window.app.router.navigate('/'),
      }, '← Retour'),
      el('h1', {}, 'Créer une partie'),
    ),
    el('div', { class: 'card mt-lg' },
      el('div', { style: { fontSize: '2.5rem', textAlign: 'center' } }, info.icon),
      el('div', { class: 'text-center', style: { fontWeight: '600', fontSize: '1.2rem', margin: '8px 0' } }, info.name),
    ),
    el('div', { class: 'flex-col gap-md mt-lg' },
      el('label', {}, 'Ton nom'),
      el('input', {
        class: 'input',
        id: 'playerName',
        placeholder: 'Entre ton nom...',
        maxlength: '20',
        value: '',
      }),
      el('label', {}, 'Joueurs max'),
      el('select', { class: 'input', id: 'maxPlayers', onChange: (e) => { maxPlayers = +e.target.value; } },
        ...Array.from({ length: maxPlayersForGame - 1 }, (_, i) => {
          const n = i + 2;
          return el('option', { value: String(n), ...(n === Math.min(4, maxPlayersForGame) ? { selected: true } : {}) }, `${n} joueurs`);
        }),
      ),
      el('label', {}, `Niveau de difficulté`),
      el('input', {
        class: 'input',
        id: 'difficulty',
        type: 'range',
        min: '1', max: '50', value: '1',
        onInput: (e) => { difficulty = +e.target.value; },
      }),
    ),
    el('button', {
      class: 'btn btn-primary btn-full btn-lg mt-xl',
      onClick: () => {
        const name = document.getElementById('playerName').value.trim();
        if (!name) { showToast('Entre ton nom !', 'error'); return; }
        soundManager.play('click');

        wsClient.connect(getWsUrl(), name);

        const unsub = eventBus.on('ws:connected', () => {
          unsub();
          wsClient.createRoom(selectedGame, { maxPlayers, difficulty });
        });

        const unsubRoom = eventBus.on(EVENTS.ROOM_CREATE, (msg) => {
          unsubRoom();
          window.app.router.navigate('/room', { room: msg.room });
        });
      },
    }, '🚀 Créer la partie'),
  );

  container.appendChild(screen);
}

export function JoinGameScreen(container, state) {
  const prefillCode = state?.params?.code || '';

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('button', {
        class: 'btn btn-secondary',
        style: { position: 'absolute', left: '16px' },
        onClick: () => window.app.router.navigate('/'),
      }, '← Retour'),
      el('h1', {}, 'Rejoindre'),
    ),
    el('div', { class: 'flex-col gap-md mt-xl' },
      el('label', {}, 'Ton nom'),
      el('input', {
        class: 'input', id: 'joinName',
        placeholder: 'Entre ton nom...', maxlength: '20',
      }),
      el('label', {}, 'Code de la partie'),
      el('input', {
        class: 'input', id: 'roomCode',
        placeholder: 'Ex: X7K92A',
        maxlength: '8',
        value: prefillCode,
        style: { textTransform: 'uppercase', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.15em' },
      }),
    ),
    el('button', {
      class: 'btn btn-primary btn-full btn-lg mt-xl',
      onClick: () => {
        const name = document.getElementById('joinName').value.trim();
        const code = document.getElementById('roomCode').value.trim().toUpperCase();
        if (!name) { showToast('Entre ton nom !', 'error'); return; }
        if (!code || code.length < 4) { showToast('Code invalide', 'error'); return; }

        soundManager.play('click');
        wsClient.connect(getWsUrl(), name);

        const unsub = eventBus.on('ws:connected', () => {
          unsub();
          wsClient.joinRoom(code);
        });

        const unsubJoin = eventBus.on(EVENTS.ROOM_JOIN, (msg) => {
          unsubJoin();
          window.app.router.navigate('/room', { room: msg.room });
        });

        const unsubErr = eventBus.on(EVENTS.ROOM_ERROR, (msg) => {
          unsubErr();
          showToast(msg.error, 'error');
        });
      },
    }, '🚪 Rejoindre'),
  );

  container.appendChild(screen);
}
