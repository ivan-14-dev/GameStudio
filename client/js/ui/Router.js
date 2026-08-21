// Lightweight SPA router — no framework
export class Router {
  #routes = new Map();
  #container;
  #currentScreen = null;
  #currentCleanup = null;

  constructor(container) {
    this.#container = container;
    window.addEventListener('popstate', () => this.#resolve());
  }

  route(path, handler) {
    this.#routes.set(path, handler);
  }

  navigate(path, data) {
    history.pushState(data || null, '', path);
    this.#resolve();
  }

  replace(path, data) {
    history.replaceState(data || null, '', path);
    this.#resolve();
  }

  back() {
    history.back();
  }

  start() {
    this.#resolve();
  }

  #resolve() {
    const path = location.pathname || '/';
    let handler = this.#routes.get(path);

    // Check parameterized routes like /join/:code
    if (!handler) {
      for (const [pattern, h] of this.#routes) {
        if (pattern.includes(':')) {
          const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$');
          const match = path.match(regex);
          if (match) {
            handler = h;
            // Pass params through state
            const paramNames = [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]);
            const params = {};
            paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
            history.replaceState({ ...history.state, params }, '');
            break;
          }
        }
      }
    }

    if (!handler) handler = this.#routes.get('/');
    if (!handler) return;

    // Cleanup previous screen
    if (this.#currentCleanup) {
      this.#currentCleanup();
      this.#currentCleanup = null;
    }

    this.#container.innerHTML = '';

    const cleanup = handler(this.#container, history.state);
    if (typeof cleanup === 'function') this.#currentCleanup = cleanup;
  }
}
