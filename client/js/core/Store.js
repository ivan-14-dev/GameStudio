// Client-side state storage using localStorage
const STORAGE_KEY = 'duoplay';

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function write(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const Store = {
  get(key) {
    return read()[key] ?? null;
  },

  set(key, value) {
    const data = read();
    data[key] = value;
    write(data);
  },

  getPlayer() {
    return this.get('player') || {
      id: crypto.randomUUID(),
      name: '',
      level: 1,
      totalXP: 0,
      stats: {},
      achievements: [],
      gameLevels: {},
    };
  },

  savePlayer(player) {
    this.set('player', player);
  },

  getSettings() {
    return this.get('settings') || {
      sound: true,
      vibration: true,
      quality: 'medium',
      reducedMotion: false,
    };
  },

  saveSettings(settings) {
    this.set('settings', settings);
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
