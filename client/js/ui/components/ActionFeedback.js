// Visual feedback for every player action — emojis, text, particles
let layer = null;

function getLayer() {
  if (layer && document.body.contains(layer)) return layer;
  layer = document.createElement('div');
  layer.className = 'action-feedback-layer';
  document.body.appendChild(layer);
  return layer;
}

function spawn(html, x, y, animation, duration) {
  const el = document.createElement('div');
  el.innerHTML = html;
  const child = el.firstElementChild || el;
  child.style.left = `${x}px`;
  child.style.top = `${y}px`;
  child.style.animation = `${animation} ${duration}ms forwards`;
  getLayer().appendChild(child);
  setTimeout(() => child.remove(), duration + 50);
  return child;
}

function centerOf(element) {
  if (!element) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Emoji that pops in then fades
function emojiPop(emoji, x, y) {
  const s = `<span class="action-feedback-emoji" style="left:${x}px;top:${y}px;animation:feedbackPop 800ms var(--ease-out-back) forwards">${emoji}</span>`;
  const el = document.createElement('span');
  el.className = 'action-feedback-emoji';
  el.textContent = emoji;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.animation = 'feedbackPop 800ms var(--ease-out-back) forwards';
  getLayer().appendChild(el);
  setTimeout(() => el.remove(), 850);
}

// Floating text that drifts up and fades
function floatingText(text, x, y, color = '#fff') {
  const el = document.createElement('span');
  el.className = 'action-feedback-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  el.style.animation = 'feedbackFloat 1200ms var(--ease-out-expo) forwards';
  getLayer().appendChild(el);
  setTimeout(() => el.remove(), 1250);
}

// Emoji rain — multiple emojis fall down from random x positions
function emojiRain(emojis, count = 8, regionX, regionY) {
  const cx = regionX ?? window.innerWidth / 2;
  const cy = regionY ?? window.innerHeight / 3;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'action-feedback-emoji';
    el.textContent = emojis[i % emojis.length];
    el.style.left = `${cx + (Math.random() - 0.5) * 200}px`;
    el.style.top = `${cy + (Math.random() - 0.5) * 60}px`;
    el.style.fontSize = `${1.5 + Math.random() * 1.5}rem`;
    el.style.animation = `emojiRain ${1000 + Math.random() * 800}ms ease-in ${i * 80}ms forwards`;
    getLayer().appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
}

// Ripple wave emanating from a point
function ripple(x, y, color = 'var(--color-primary)') {
  const el = document.createElement('div');
  el.className = 'action-feedback-ripple';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.borderColor = color;
  el.style.animation = 'rippleOut 600ms ease-out forwards';
  getLayer().appendChild(el);
  setTimeout(() => el.remove(), 650);
}

// Player mood — big emoji reaction with text
function playerMood(mood, targetEl) {
  const { x, y } = centerOf(targetEl);
  const moods = {
    ecstatic:  { emoji: '🤩', text: 'INCROYABLE !', color: '#ffd700', emojis: ['⭐', '🌟', '✨', '💫'] },
    happy:     { emoji: '😄', text: 'Super !', color: 'var(--color-success)', emojis: ['🎉', '✨'] },
    good:      { emoji: '😊', text: 'Bien joué', color: 'var(--color-info)', emojis: ['👍'] },
    neutral:   { emoji: '😐', text: '', color: 'var(--text-secondary)', emojis: [] },
    worried:   { emoji: '😟', text: 'Aïe...', color: 'var(--color-warning)', emojis: ['😰'] },
    sad:       { emoji: '😢', text: 'Oh non...', color: 'var(--color-danger)', emojis: ['💔'] },
    devastated:{ emoji: '😭', text: 'NOOO !', color: '#ff4444', emojis: ['💀', '☠️', '😭'] },
    angry:     { emoji: '😤', text: 'Grrr !', color: '#ff6b35', emojis: ['🔥', '💢'] },
    surprised: { emoji: '😲', text: 'Wooah !', color: 'var(--color-accent)', emojis: ['❗', '⚡'] },
    cool:      { emoji: '😎', text: 'Easy', color: 'var(--color-primary-light)', emojis: ['🔥', '💪'] },
    love:      { emoji: '🥰', text: 'Parfait !', color: '#ff69b4', emojis: ['💖', '💕', '❤️'] },
    scared:    { emoji: '😱', text: 'Au secours !', color: '#a855f7', emojis: ['😱', '👀'] },
  };
  const m = moods[mood] || moods.neutral;
  emojiPop(m.emoji, x, y - 40);
  if (m.text) floatingText(m.text, x, y - 80, m.color);
  if (m.emojis.length) emojiRain(m.emojis, Math.min(m.emojis.length * 2, 6), x, y);
}

// Score change animation
function scoreChange(amount, targetEl) {
  const { x, y } = centerOf(targetEl);
  const positive = amount > 0;
  const text = positive ? `+${amount}` : `${amount}`;
  const color = positive ? 'var(--color-success)' : 'var(--color-danger)';
  floatingText(text, x, y, color);
  if (positive && amount >= 50) ripple(x, y, 'var(--color-success)');
  if (!positive) ripple(x, y, 'var(--color-danger)');
}

// Item collected animation
function collected(emoji, targetEl) {
  const { x, y } = centerOf(targetEl);
  emojiPop(emoji, x, y);
  ripple(x, y, 'var(--color-accent)');
}

// Combo indicator
function combo(count, targetEl) {
  const { x, y } = centerOf(targetEl);
  const colors = ['var(--color-info)', 'var(--color-success)', 'var(--color-accent)', '#ff6b35', '#ff4444'];
  const ci = Math.min(count - 1, colors.length - 1);
  floatingText(`${count}x COMBO`, x, y - 30, colors[ci]);
  if (count >= 3) emojiRain(['🔥'], Math.min(count, 8), x, y);
  if (count >= 5) ripple(x, y, colors[ci]);
}

// Match/correct animation
function correct(targetEl) {
  const { x, y } = centerOf(targetEl);
  emojiPop('✅', x, y);
  ripple(x, y, 'var(--color-success)');
}

// Miss/wrong animation
function wrong(targetEl) {
  const { x, y } = centerOf(targetEl);
  emojiPop('❌', x, y);
  if (targetEl) targetEl.style.animation = 'feedbackShake 500ms ease';
  setTimeout(() => { if (targetEl) targetEl.style.animation = ''; }, 550);
}

// Death/elimination
function eliminated(targetEl) {
  const { x, y } = centerOf(targetEl);
  emojiRain(['💀', '☠️', '😵', '💔'], 10, x, y);
  playerMood('devastated', targetEl);
}

// Victory burst
function victory(targetEl) {
  const { x, y } = centerOf(targetEl);
  emojiRain(['🎉', '🏆', '⭐', '🎊', '✨', '👑'], 15, x, y);
  playerMood('ecstatic', targetEl);
}

function destroy() {
  if (layer) { layer.remove(); layer = null; }
}

export const actionFeedback = {
  emojiPop, floatingText, emojiRain, ripple, playerMood,
  scoreChange, collected, combo, correct, wrong,
  eliminated, victory, destroy,
};
