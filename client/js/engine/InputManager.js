// Unified input manager — touch, mouse, keyboard
export class InputManager {
  #handlers = new Map();
  #element;
  #swipeStartX = 0;
  #swipeStartY = 0;
  #swipeThreshold = 30;
  #cleanupFns = [];

  constructor(element) {
    this.#element = element || document.body;
  }

  on(action, handler) {
    if (!this.#handlers.has(action)) this.#handlers.set(action, []);
    this.#handlers.get(action).push(handler);
  }

  off(action, handler) {
    const arr = this.#handlers.get(action);
    if (!arr) return;
    const idx = arr.indexOf(handler);
    if (idx !== -1) arr.splice(idx, 1);
  }

  #emit(action, data) {
    const arr = this.#handlers.get(action);
    if (!arr) return;
    for (const fn of arr) fn(data);
  }

  bindKeyboard(keyMap) {
    // keyMap: { 'ArrowUp': 'up', 'w': 'up', ... }
    const handler = (e) => {
      const action = keyMap[e.key] || keyMap[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        this.#emit(action, { source: 'keyboard', key: e.key });
      }
    };
    document.addEventListener('keydown', handler);
    this.#cleanupFns.push(() => document.removeEventListener('keydown', handler));
  }

  bindSwipe() {
    const el = this.#element;

    const onStart = (e) => {
      const touch = e.touches[0];
      this.#swipeStartX = touch.clientX;
      this.#swipeStartY = touch.clientY;
    };

    const onEnd = (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.#swipeStartX;
      const dy = touch.clientY - this.#swipeStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < this.#swipeThreshold) return;

      if (absDx > absDy) {
        this.#emit(dx > 0 ? 'right' : 'left', { source: 'swipe' });
      } else {
        this.#emit(dy > 0 ? 'down' : 'up', { source: 'swipe' });
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    this.#cleanupFns.push(() => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    });
  }

  bindTap(callback) {
    const el = this.#element;
    const handler = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
      const y = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
      callback({ x, y, relX: x / rect.width, relY: y / rect.height });
    };

    el.addEventListener('pointerdown', handler);
    this.#cleanupFns.push(() => el.removeEventListener('pointerdown', handler));
  }

  vibrate(pattern = 20) {
    try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
  }

  destroy() {
    for (const fn of this.#cleanupFns) fn();
    this.#cleanupFns.length = 0;
    this.#handlers.clear();
  }
}
