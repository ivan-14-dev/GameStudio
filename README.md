# DuoPlay — Plateforme de Mini-Jeux Multijoueurs

Plateforme web légère de mini-jeux multijoueurs temps réel.

## Lancement rapide

```bash
cd duoplay
npm install
npm run dev
```

Ouvrir `http://localhost:3000` dans le navigateur.

## Stack technique

- **Frontend** : HTML5, CSS3, JavaScript ES2022+, ES Modules, Canvas API
- **Backend** : Node.js, Fastify, WebSocket natif
- **Pas de framework lourd** — moteur maison léger et modulaire

## Jeux disponibles

| Jeu | Joueurs | Type |
|-----|---------|------|
| 🐍 Snake Duel | 2–4 | Arcade |
| 🏓 Pong Duel | 2–4 | Sport |
| ❌ Tic Tac Toe | 2–4 | Stratégie |
| 🔴 Puissance 4 | 2–4 | Stratégie |
| ✊ Pierre Feuille Ciseaux | 2–8 | Party |
| 🧠 Memory Duel | 2–4 | Puzzle |
| ⚡ Réaction | 2–8 | Réflexe |
| ❓ Quiz Duel | 2–8 | Trivia |
| 🎭 Action ou Vérité | 2–12 | Social |

## Architecture

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour les détails complets.

## Ajouter un nouveau jeu

1. Créer `server/src/games/mon-jeu/MonJeuGame.js` implémentant l'interface `GameModule`
2. Créer `client/js/games/mon-jeu/MonJeuRenderer.js` avec une fonction `create()`
3. Enregistrer dans `server/src/index.js` : `GameRegistry.register('monjeu', () => import(...))`
4. Ajouter le mapping dans `client/js/core/GameRegistry.js`

Le moteur se charge du reste : rooms, WebSocket, scores, progression, achievements.
# GameStudio
