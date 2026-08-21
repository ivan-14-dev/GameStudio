// Sound manager — lazy loading, optional, lightweight
export class SoundManager {
  #sounds = new Map();
  #enabled = true;
  #context = null;

  get enabled() { return this.#enabled; }
  set enabled(v) { this.#enabled = v; }

  #getContext() {
    if (!this.#context) {
      this.#context = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.#context;
  }

  // Generate simple tones without audio files
  play(name) {
    if (!this.#enabled) return;
    try {
      const ctx = this.#getContext();
      if (ctx.state === 'suspended') ctx.resume();
      const sounds = {
        click: { freq: 600, duration: 0.08, type: 'sine' },
        success: { freq: 880, duration: 0.15, type: 'sine' },
        error: { freq: 200, duration: 0.2, type: 'square' },
        countdown: { freq: 440, duration: 0.1, type: 'sine' },
        win: { freq: [523, 659, 784], duration: 0.3, type: 'sine' },
        lose: { freq: [400, 300, 200], duration: 0.4, type: 'sawtooth' },
        move: { freq: 500, duration: 0.05, type: 'sine' },
        score: { freq: [660, 880], duration: 0.15, type: 'sine' },
        flip: { freq: 700, duration: 0.06, type: 'triangle' },
        react: { freq: 1000, duration: 0.1, type: 'sine' },
        round: { freq: [440, 550, 660], duration: 0.2, type: 'sine' },
      };

      const config = sounds[name];
      if (!config) return;

      if (Array.isArray(config.freq)) {
        config.freq.forEach((f, i) => {
          this.#playTone(ctx, f, config.duration, config.type, i * 0.12);
        });
      } else {
        this.#playTone(ctx, config.freq, config.duration, config.type);
      }
    } catch { /* audio not available */ }
  }

  #playTone(ctx, freq, duration, type, delay = 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
  }

  destroy() {
    if (this.#context) {
      this.#context.close().catch(() => {});
      this.#context = null;
    }
  }
}

export const soundManager = new SoundManager();
