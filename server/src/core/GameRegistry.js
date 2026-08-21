// Registry of all available game modules — supports lazy loading
const games = new Map();
const loaders = new Map();

export const GameRegistry = {
  register(id, moduleOrLoader) {
    if (typeof moduleOrLoader === 'function') {
      loaders.set(id, moduleOrLoader);
    } else {
      games.set(id, moduleOrLoader);
    }
  },

  async get(id) {
    if (games.has(id)) return games.get(id);
    const loader = loaders.get(id);
    if (!loader) return null;
    const mod = await loader();
    const gameModule = mod.default ?? mod;
    games.set(id, gameModule);
    return gameModule;
  },

  has(id) {
    return games.has(id) || loaders.has(id);
  },

  list() {
    const ids = new Set([...games.keys(), ...loaders.keys()]);
    return [...ids];
  },

  async listWithMeta() {
    const result = [];
    for (const id of this.list()) {
      const mod = await this.get(id);
      if (mod) result.push({ id, ...mod.getMetadata() });
    }
    return result;
  },
};
