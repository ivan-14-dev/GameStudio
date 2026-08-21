// Client-side event bus — same API as server for consistency
export class EventBus {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const arr = this.#listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  }

  emit(event, data) {
    const arr = this.#listeners.get(event);
    if (!arr) return;
    for (const fn of arr) {
      try { fn(data); } catch (e) { console.error(`[EventBus] ${event}:`, e); }
    }
  }

  removeAll(event) {
    if (event) this.#listeners.delete(event);
    else this.#listeners.clear();
  }
}

export const eventBus = new EventBus();
