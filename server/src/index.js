import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebSocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import crypto from 'node:crypto';

import { EventBus } from './core/EventBus.js';
import { GameRegistry } from './core/GameRegistry.js';
import { GameEngine } from './core/GameEngine.js';
import { DifficultyEngine } from './core/DifficultyEngine.js';
import { ScoreEngine } from './core/ScoreEngine.js';
import { ProgressionEngine } from './core/ProgressionEngine.js';
import { AchievementEngine } from './core/AchievementEngine.js';
import { ContentEngine } from './core/ContentEngine.js';
import { StatisticsEngine } from './core/StatisticsEngine.js';
import { RoomManager } from './rooms/RoomManager.js';
import { WebSocketGateway } from './websocket/WebSocketGateway.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// --- Initialize engines ---
const eventBus = new EventBus();
const difficultyEngine = new DifficultyEngine();
const scoreEngine = new ScoreEngine();
const progressionEngine = new ProgressionEngine();
const achievementEngine = new AchievementEngine();
const contentEngine = new ContentEngine();
const statisticsEngine = new StatisticsEngine();
const roomManager = new RoomManager(eventBus);
const gameEngine = new GameEngine({ eventBus, difficultyEngine, scoreEngine });

// --- Register game modules (lazy-loaded) ---
GameRegistry.register('snake', () => import('./games/snake/SnakeGame.js'));
GameRegistry.register('pong', () => import('./games/pong/PongGame.js'));
GameRegistry.register('tictactoe', () => import('./games/tictactoe/TicTacToeGame.js'));
GameRegistry.register('connect4', () => import('./games/connect4/Connect4Game.js'));
GameRegistry.register('rps', () => import('./games/rps/RPSGame.js'));
GameRegistry.register('memory', () => import('./games/memory/MemoryGame.js'));
GameRegistry.register('reaction', () => import('./games/reaction/ReactionGame.js'));
GameRegistry.register('quiz', () => import('./games/quiz/QuizGame.js'));
GameRegistry.register('truthordare', () => import('./games/truthordare/TruthOrDareGame.js'));
GameRegistry.register('snake-arena', () => import('./games/snake-arena/SnakeArenaGame.js'));

// --- WebSocket Gateway ---
const wsGateway = new WebSocketGateway({
  roomManager, gameEngine, gameRegistry: GameRegistry,
  eventBus, progressionEngine, achievementEngine,
});

// --- Fastify server ---
const app = Fastify({ logger: true });

await app.register(fastifyCors, { origin: true });
await app.register(fastifyStatic, {
  root: join(__dirname, '../../client'),
  prefix: '/',
});
await app.register(fastifyWebSocket);

// --- REST API ---
app.get('/api/games', async () => {
  return GameRegistry.listWithMeta();
});

app.get('/api/room/:code', async (req, reply) => {
  const room = roomManager.getByCode(req.params.code);
  if (!room) return reply.code(404).send({ error: 'Room not found' });
  return {
    roomId: room.roomId, code: room.code, gameId: room.gameId,
    status: room.status, playerCount: room.players.length, maxPlayers: room.maxPlayers,
  };
});

// --- WebSocket endpoint ---
app.get('/ws', { websocket: true }, (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerName = url.searchParams.get('name') || 'Player';
  const existingId = url.searchParams.get('playerId');
  const playerId = existingId || crypto.randomUUID();

  wsGateway.handleConnection(socket, playerId, playerName);
});

// --- SPA catch-all: serve index.html for client-side routes ---
app.setNotFoundHandler((req, reply) => {
  if (req.method === 'GET' && !req.url.startsWith('/api/')) {
    return reply.sendFile('index.html');
  }
  reply.code(404).send({ error: 'Not found' });
});

// --- Periodic cleanup ---
setInterval(() => roomManager.cleanup(), 60_000);

// --- Start ---
wsGateway.start();

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`DuoPlay server running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
