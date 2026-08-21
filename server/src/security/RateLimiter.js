// Per-connection rate limiter for WebSocket messages
export class RateLimiter {
  #limits = new Map(); // connectionId -> { count, resetAt }
  #maxPerWindow;
  #windowMs;

  constructor({ maxPerWindow = 60, windowMs = 1000 } = {}) {
    this.#maxPerWindow = maxPerWindow;
    this.#windowMs = windowMs;
  }

  check(connectionId) {
    const now = Date.now();
    let entry = this.#limits.get(connectionId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.#windowMs };
      this.#limits.set(connectionId, entry);
    }

    entry.count++;
    return entry.count <= this.#maxPerWindow;
  }

  remove(connectionId) {
    this.#limits.delete(connectionId);
  }

  cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.#limits) {
      if (now > entry.resetAt) this.#limits.delete(id);
    }
  }
}
