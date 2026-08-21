import { el } from '../components/dom.js';
import { Store } from '../../core/Store.js';
import { soundManager } from '../../audio/SoundManager.js';

export function StatsScreen(container) {
  const player = Store.getPlayer();
  const s = player.stats || {};
  const gamesPlayed = s.gamesPlayed || 0;
  const wins = s.wins || 0;
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  const stats = [
    ['🎮', 'Parties jouées', gamesPlayed],
    ['🏆', 'Victoires', wins],
    ['📉', 'Défaites', s.losses || 0],
    ['📊', 'Win rate', `${winRate}%`],
    ['⭐', 'Meilleur score', s.bestScore || 0],
    ['🔥', 'Meilleure série', s.bestWinStreak || 0],
    ['⚡', 'Série actuelle', s.winStreak || 0],
    ['📈', 'Niveau', player.level || 1],
    ['✨', 'XP total', player.totalXP || 0],
  ];

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('button', { class: 'btn btn-secondary', style: { position: 'absolute', left: '16px' }, onClick: () => window.app.router.navigate('/') }, '← Retour'),
      el('h1', {}, '📊 Statistiques'),
    ),
    el('div', { class: 'flex-col gap-sm mt-lg' },
      ...stats.map(([icon, label, value]) =>
        el('div', { class: 'card', style: { display: 'flex', alignItems: 'center', padding: '12px 16px' } },
          el('span', { style: { fontSize: '1.5rem', marginRight: '12px' } }, icon),
          el('span', { style: { flex: 1 } }, label),
          el('span', { style: { fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-accent)' } }, String(value)),
        )
      ),
    ),
    // Per-game levels
    Object.keys(player.gameLevels || {}).length > 0
      ? el('div', { class: 'mt-lg' },
          el('h3', {}, 'Niveaux par jeu'),
          el('div', { class: 'flex-col gap-sm mt-sm' },
            ...Object.entries(player.gameLevels).map(([gameId, data]) =>
              el('div', { class: 'card', style: { display: 'flex', justifyContent: 'space-between', padding: '12px 16px' } },
                el('span', {}, gameId),
                el('span', { style: { color: 'var(--color-primary-light)', fontWeight: '600' } }, `Niv. ${data.level}`),
              )
            ),
          ),
        )
      : null,
  );

  container.appendChild(screen);
}

export function AchievementsScreen(container) {
  const player = Store.getPlayer();
  const unlocked = new Set(player.achievements || []);

  const allAchievements = [
    { id: 'FIRST_WIN', name: 'Première victoire', icon: '🏆', desc: 'Gagner une partie' },
    { id: 'TEN_WINS', name: '10 victoires', icon: '🔥', desc: 'Gagner 10 parties' },
    { id: 'WIN_STREAK_5', name: 'Série de 5', icon: '⚡', desc: '5 victoires consécutives' },
    { id: 'WIN_STREAK_10', name: 'Inarrêtable', icon: '💎', desc: '10 victoires consécutives' },
    { id: 'PLAY_100_GAMES', name: 'Vétéran', icon: '🎮', desc: 'Jouer 100 parties' },
    { id: 'PLAY_WITH_3_PLAYERS', name: 'En bande', icon: '👥', desc: 'Jouer avec 3+ joueurs' },
  ];

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('button', { class: 'btn btn-secondary', style: { position: 'absolute', left: '16px' }, onClick: () => window.app.router.navigate('/') }, '← Retour'),
      el('h1', {}, '🏆 Succès'),
      el('p', {}, `${unlocked.size}/${allAchievements.length} débloqués`),
    ),
    el('div', { class: 'flex-col gap-sm mt-lg' },
      ...allAchievements.map((a) => {
        const done = unlocked.has(a.id);
        return el('div', {
          class: 'card',
          style: {
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            opacity: done ? '1' : '0.4',
          },
        },
          el('span', { style: { fontSize: '2rem', marginRight: '12px' } }, a.icon),
          el('div', { style: { flex: 1 } },
            el('div', { style: { fontWeight: '600' } }, a.name),
            el('div', { class: 'text-muted', style: { fontSize: '0.85rem' } }, a.desc),
          ),
          done ? el('span', { class: 'badge badge-success' }, '✅') : null,
        );
      }),
    ),
  );

  container.appendChild(screen);
}

export function SettingsScreen(container) {
  const settings = Store.getSettings();

  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header' },
      el('button', { class: 'btn btn-secondary', style: { position: 'absolute', left: '16px' }, onClick: () => window.app.router.navigate('/') }, '← Retour'),
      el('h1', {}, '⚙️ Paramètres'),
    ),
    el('div', { class: 'flex-col gap-md mt-lg' },
      createToggle('🔊 Son', settings.sound, (v) => { settings.sound = v; soundManager.enabled = v; save(); }),
      createToggle('📳 Vibration', settings.vibration, (v) => { settings.vibration = v; save(); }),
      el('label', {}, 'Qualité graphique'),
      el('select', { class: 'input', onChange: (e) => { settings.quality = e.target.value; save(); } },
        el('option', { value: 'low', selected: settings.quality === 'low' }, 'Basse'),
        el('option', { value: 'medium', selected: settings.quality === 'medium' }, 'Moyenne'),
        el('option', { value: 'high', selected: settings.quality === 'high' }, 'Haute'),
      ),
    ),
  );

  function save() { Store.saveSettings(settings); }

  container.appendChild(screen);
}

function createToggle(label, value, onChange) {
  const container = el('div', {
    class: 'card',
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' },
    onClick: () => {
      value = !value;
      indicator.textContent = value ? '✅' : '❌';
      onChange(value);
    },
  });
  container.appendChild(el('span', {}, label));
  const indicator = el('span', { style: { fontSize: '1.2rem' } }, value ? '✅' : '❌');
  container.appendChild(indicator);
  return container;
}
