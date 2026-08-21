// Client-side game registry with lazy loading
const games = new Map();
const loaders = new Map();

// Map game IDs to dynamic import paths
const GAME_MODULES = {
  snake: () => import('../games/snake/SnakeRenderer.js'),
  pong: () => import('../games/pong/PongRenderer.js'),
  tictactoe: () => import('../games/tictactoe/TicTacToeRenderer.js'),
  connect4: () => import('../games/connect4/Connect4Renderer.js'),
  rps: () => import('../games/rps/RPSRenderer.js'),
  memory: () => import('../games/memory/MemoryRenderer.js'),
  reaction: () => import('../games/reaction/ReactionRenderer.js'),
  quiz: () => import('../games/quiz/QuizRenderer.js'),
  truthordare: () => import('../games/truthordare/TruthOrDareRenderer.js'),
  'snake-arena': () => import('../games/snake-arena/SnakeArenaRenderer.js'),
};

export const GameRegistry = {
  register(id, loader) {
    loaders.set(id, loader);
  },

  async load(id) {
    if (games.has(id)) return games.get(id);
    const loader = loaders.get(id) || GAME_MODULES[id];
    if (!loader) return null;
    const mod = await loader();
    const renderer = mod.default ?? mod;
    games.set(id, renderer);
    return renderer;
  },

  has(id) {
    return games.has(id) || loaders.has(id) || id in GAME_MODULES;
  },

  isLoaded(id) {
    return games.has(id);
  },
};
