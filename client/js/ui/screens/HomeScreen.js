import { el } from '../components/dom.js';
import { soundManager } from '../../audio/SoundManager.js';

export function HomeScreen(container, state) {
  const screen = el('div', { class: 'screen' },
    el('div', { class: 'screen-header', style: { padding: 'clamp(40px, 10vh, 80px) 0 clamp(20px, 5vh, 40px)' } },
      el('div', { style: { fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: '8px', animation: 'float 3s ease-in-out infinite' } }, '🎮'),
      el('h1', { style: { fontSize: 'clamp(2rem, 6vw, 3.2rem)' } }, 'DuoPlay'),
      el('p', { style: { fontSize: 'var(--font-size-md)', marginTop: '8px', color: 'var(--text-secondary)' } }, 'Défie tes amis en temps réel'),
    ),
    el('div', { class: 'flex-col gap-md mt-xl' },
      el('button', {
        class: 'btn btn-primary btn-full btn-lg',
        onClick: () => {
          soundManager.play('click');
          window.app.router.navigate('/create');
        },
      }, '⚔️ Créer une partie'),
      el('button', {
        class: 'btn btn-secondary btn-full btn-lg',
        onClick: () => {
          soundManager.play('click');
          window.app.router.navigate('/join');
        },
      }, '🚪 Rejoindre'),
      el('button', {
        class: 'btn btn-secondary btn-full',
        onClick: () => window.app.router.navigate('/games'),
      }, '🎯 Explorer les jeux'),
      el('div', { style: { display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' } },
        el('button', {
          class: 'btn btn-secondary',
          style: { flex: 1 },
          onClick: () => window.app.router.navigate('/stats'),
        }, '📊'),
        el('button', {
          class: 'btn btn-secondary',
          style: { flex: 1 },
          onClick: () => window.app.router.navigate('/achievements'),
        }, '🏆'),
        el('button', {
          class: 'btn btn-secondary',
          style: { flex: 1 },
          onClick: () => window.app.router.navigate('/settings'),
        }, '⚙️'),
      ),
    ),
  );

  container.appendChild(screen);
}
