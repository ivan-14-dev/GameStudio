# Architecture DuoPlay

## Vue d'ensemble

```
Platform
├── Core Engine (GameEngine, EventBus, GameRegistry)
├── Multiplayer Engine (WebSocketGateway, ConnectionManager)
├── Room Engine (RoomManager)
├── Difficulty Engine (DifficultyEngine)
├── Score Engine (ScoreEngine)
├── Progression Engine (ProgressionEngine)
├── Achievement Engine (AchievementEngine)
├── Content Engine (ContentEngine)
├── Statistics Engine (StatisticsEngine)
├── Security (RateLimiter, ActionValidator)
└── Game Modules (plugins indépendants)
```

## Principe fondamental

Le **GameEngine** ne connaît pas les règles de chaque jeu. Il orchestre via l'interface **GameModule** :

```
GameModule
├── getMetadata()
├── createState(config)
├── validateAction(state, action, player)
├── applyAction(state, action, player)
├── checkGameEnd(state)
├── calculateScore(state)
├── getDifficulty(level)
├── serializeState(state)
├── handlePlayerJoin/Leave/Reconnect()
├── tick(state)        [optionnel, pour jeux temps réel]
└── destroy()
```

## Communication réseau

Événementiel — jamais d'envoi d'état complet à chaque frame.

```
Client → Action → Server (valide) → Broadcast événement → Clients (rendu local)
```

## Structure des fichiers

```
duoplay/
├── client/               # Frontend
│   ├── index.html
│   ├── css/              # Design system
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── responsive.css
│   │   └── animations.css
│   └── js/
│       ├── main.js       # Point d'entrée + router
│       ├── core/         # EventBus, Store, GameRegistry
│       ├── engine/       # GameLoop, InputManager
│       ├── multiplayer/  # WebSocketClient
│       ├── audio/        # SoundManager
│       ├── ui/           # Router, DOM helpers, écrans
│       └── games/        # Renderers par jeu
├── server/
│   └── src/
│       ├── index.js      # Fastify + initialisation
│       ├── core/         # Moteurs centraux
│       ├── websocket/    # Gateway + ConnectionManager
│       ├── rooms/        # RoomManager
│       ├── security/     # RateLimiter, ActionValidator
│       └── games/        # Modules de jeu (serveur)
└── shared/               # Code partagé client/serveur
    ├── constants/        # Events, statuts, config
    └── schemas/          # Validation
```

## Sécurité

- Le serveur **valide toutes les actions** — le client n'est jamais cru
- Rate limiting WebSocket par connexion
- Sanitisation de toutes les entrées string
- Pas de données sensibles côté client
- Les scores sont calculés côté serveur uniquement

## Performance

- Lazy loading des jeux (`import()` dynamique)
- `requestAnimationFrame` pour le rendu
- Page Visibility API pour mettre en pause
- Événements réseau minimaux
- Pas d'envoi d'état complet à chaque tick
- CSS `transform` + `opacity` uniquement pour les animations
