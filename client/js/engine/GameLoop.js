// Game loop with proper requestAnimationFrame, visibility handling, and frame timing
export class GameLoop {
  #update;
  #render;
  #rafId = null;
  #running = false;
  #lastTime = 0;
  #accumulator = 0;
  #fixedStep = 1000 / 60; // 60 Hz logic updates
  #visibilityHandler;

  constructor(update, render) {
    this.#update = update;
    this.#render = render;
    this.#visibilityHandler = () => this.#onVisibilityChange();
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#lastTime = performance.now();
    document.addEventListener('visibilitychange', this.#visibilityHandler);
    this.#tick(this.#lastTime);
  }

  stop() {
    this.#running = false;
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    document.removeEventListener('visibilitychange', this.#visibilityHandler);
  }

  get running() {
    return this.#running;
  }

  #tick(now) {
    if (!this.#running) return;

    const dt = Math.min(now - this.#lastTime, 100); // cap to avoid spiral of death
    this.#lastTime = now;
    this.#accumulator += dt;

    while (this.#accumulator >= this.#fixedStep) {
      this.#update(this.#fixedStep / 1000);
      this.#accumulator -= this.#fixedStep;
    }

    this.#render(this.#accumulator / this.#fixedStep);
    this.#rafId = requestAnimationFrame((t) => this.#tick(t));
  }

  #onVisibilityChange() {
    if (document.hidden) {
      if (this.#rafId) {
        cancelAnimationFrame(this.#rafId);
        this.#rafId = null;
      }
    } else if (this.#running) {
      this.#lastTime = performance.now();
      this.#accumulator = 0;
      this.#tick(this.#lastTime);
    }
  }
}
