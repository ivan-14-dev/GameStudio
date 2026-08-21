import { Router } from './ui/Router.js';
import { HomeScreen } from './ui/screens/HomeScreen.js';
import { GameListScreen, CreateGameScreen, JoinGameScreen } from './ui/screens/GameScreens.js';
import { RoomScreen } from './ui/screens/RoomScreen.js';
import { PlayScreen } from './ui/screens/PlayScreen.js';
import { ResultScreen } from './ui/screens/ResultScreen.js';
import { StatsScreen, AchievementsScreen, SettingsScreen } from './ui/screens/ProfileScreens.js';
import { Store } from './core/Store.js';
import { soundManager } from './audio/SoundManager.js';

const app = document.getElementById('app');
const router = new Router(app);

// Apply saved settings
const savedSettings = Store.getSettings();
soundManager.enabled = savedSettings.sound !== false;

// Routes
router.route('/', HomeScreen);
router.route('/games', GameListScreen);
router.route('/create', CreateGameScreen);
router.route('/join', JoinGameScreen);
router.route('/join/:code', JoinGameScreen);
router.route('/room', RoomScreen);
router.route('/play', PlayScreen);
router.route('/result', ResultScreen);
router.route('/stats', StatsScreen);
router.route('/achievements', AchievementsScreen);
router.route('/settings', SettingsScreen);

// Ensure player has a persisted ID
const player = Store.getPlayer();
if (!player.id) {
  player.id = crypto.randomUUID();
}
Store.savePlayer(player);

// Global reference for screens
window.app = { router };

router.start();
