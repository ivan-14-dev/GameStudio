#!/bin/bash
set -e
cd "$(git rev-parse --show-toplevel)"

echo "Creating Pull Requests..."
echo ""

# Order matters: merge in dependency order
gh pr create --base main --head setup/project-init \
  --title "🏗️ Project Setup" \
  --body "## Setup
- package.json avec Fastify 5, @fastify/websocket
- README.md et ARCHITECTURE.md
- Configuration projet Node.js ESM"

gh pr create --base main --head feat/shared-constants \
  --title "📦 Shared Constants & Schemas" \
  --body "## Constantes partagées client/serveur
- Constants: room, game, events, snakeArena
- Schemas de validation Zod-like
- Barrel export index.js"

gh pr create --base main --head feat/server-core \
  --title "⚙️ Server Core Engines" \
  --body "## Moteurs serveur
- EventBus (pub/sub)
- GameEngine (classe de base)
- ScoreEngine, DifficultyEngine, ProgressionEngine
- AchievementEngine, StatisticsEngine, ContentEngine
- GameRegistry"

gh pr create --base main --head feat/server-infrastructure \
  --title "🔌 Server Infrastructure" \
  --body "## Infrastructure WebSocket
- WebSocketGateway + ConnectionManager
- RoomManager (création/gestion salles)
- RateLimiter + ActionValidator (sécurité)
- Point d'entrée serveur (Fastify)"

gh pr create --base main --head feat/server-games-classic \
  --title "🎮 Server Games (9 jeux classiques)" \
  --body "## 9 jeux serveur
- TicTacToe, Connect4, Pong, Snake
- Memory, Quiz, RPS, Reaction
- Truth or Dare"

gh pr create --base main --head feat/server-snake-arena \
  --title "🐍 Snake Arena - Serveur (13 modules)" \
  --body "## Snake Arena — architecture modulaire
- SnakePhysics, SnakeCollision
- SnakeFood, SnakePowerup, SnakePortal, SnakeObstacle
- SnakeScore, SnakeRules, SnakeWorld
- SnakeMap, SnakeLevel, SnakeEventEngine
- SnakeArenaGame (orchestrateur)"

gh pr create --base main --head feat/client-core \
  --title "🧩 Client Core" \
  --body "## Core client
- EventBus, Store (state management)
- GameRegistry (lazy loading)
- GameLoop (requestAnimationFrame)
- InputManager (clavier/touch/swipe)
- SoundManager (Web Audio API)
- WebSocketClient"

gh pr create --base main --head feat/client-ui \
  --title "🖥️ Client UI Framework" \
  --body "## Framework UI SPA
- Router (History API)
- Composants DOM (el(), showToast)
- Écrans: Home, Room, Play, Result, Profile, Game
- main.js point d'entrée"

gh pr create --base main --head feat/client-styles \
  --title "🎨 Client Styles & Assets" \
  --body "## Styles CSS
- Variables CSS (thème dark neon)
- Base styles + responsive breakpoints
- 20+ animations @keyframes
- Styles spécifiques Snake Arena
- index.html + assets"

gh pr create --base main --head feat/client-games \
  --title "🕹️ Client Game Renderers (10 jeux)" \
  --body "## 10 renderers de jeux
- TicTacToe, Connect4, Pong, Snake
- Memory, Quiz, RPS, Reaction
- Truth or Dare, Snake Arena
- Chaque renderer avec feedback actionFeedback intégré"

gh pr create --base main --head feat/animations-feedback \
  --title "✨ Animation & Feedback System" \
  --body "## Système d'animations par action
- ActionFeedback component: emojiPop, floatingText, emojiRain, ripple
- 12 moods joueur: ecstatic, happy, good, neutral, worried, sad, devastated, angry, surprised, cool, love, scared
- scoreChange, combo, collected, correct/wrong
- eliminated/victory avec effets visuels"

gh pr create --base main --head feat/tests-core \
  --title "🧪 Tests Core & Infrastructure" \
  --body "## Tests unitaires serveur
- EventBus, GameEngine, ScoreEngine
- DifficultyEngine, ProgressionEngine, AchievementEngine
- RoomManager, ActionValidator, RateLimiter"

gh pr create --base main --head feat/tests-games \
  --title "🧪 Tests Games (9 jeux)" \
  --body "## Tests des 9 jeux classiques
- TicTacToe, Connect4, Pong, Snake
- Memory, Quiz, RPS, Reaction, Truth or Dare"

gh pr create --base main --head feat/tests-snake-arena \
  --title "🧪 Tests Snake Arena (230 tests, 13 suites)" \
  --body "## Tests complets Snake Arena
- SnakePhysics (14), SnakeCollision (30), SnakeFood (8)
- SnakePowerup (13), SnakePortal (11), SnakeObstacle (18)
- SnakeScore (15), SnakeRules (24), SnakeWorld (16)
- SnakeMap (11), SnakeLevel (17), SnakeEventEngine (14)
- SnakeArenaGame intégration (39)
- **Total: 230 tests**"

gh pr create --base main --head feat/tests-shared \
  --title "🧪 Tests Shared Validation" \
  --body "## Tests des schémas de validation partagés"

echo ""
echo "═══════════════════════════════════════════════"
echo "  15 Pull Requests created!"
echo "  Go to: https://github.com/ivan-14-dev/GameStudio/pulls"
echo "═══════════════════════════════════════════════"
