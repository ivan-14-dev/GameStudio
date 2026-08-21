// Snake Arena — Dynamic event system
import { ARENA } from '../../../../shared/constants/snakeArena.js';

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const EVENT_CONFIGS = {
  FOOD_RUSH:    { duration: 200, minLevel: 6,  weight: 3 },
  BLACKOUT:     { duration: 150, minLevel: 16, weight: 2 },
  STORM:        { duration: 180, minLevel: 21, weight: 2 },
  EARTHQUAKE:   { duration: 100, minLevel: 16, weight: 1 },
  PORTAL_SHIFT: { duration: 120, minLevel: 11, weight: 2 },
  HUNT:         { duration: 250, minLevel: 21, weight: 1 },
  GOLDEN_FOOD:  { duration: 160, minLevel: 6,  weight: 3 },
  COLLAPSE:     { duration: 100, minLevel: 26, weight: 1 },
  SPEED_WAVE:   { duration: 140, minLevel: 11, weight: 2 },
};

export default class SnakeEventEngine {
  constructor(seed) {
    this.rng = mulberry32(seed);
    this.activeEvents = [];
    this.eventHistory = [];
    this.nextEventTick = 200 + Math.floor(this.rng() * 200);
    this.eventCooldown = 100;
  }

  /** Called each tick, may trigger/end events */
  update(state, tickCount) {
    const triggered = [];

    // End expired events
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const ev = this.activeEvents[i];
      if (tickCount >= ev.endTick) {
        this.activeEvents.splice(i, 1);
        this.eventHistory.push({ ...ev, endedAt: tickCount });
        triggered.push({ action: 'end', event: ev });
      }
    }

    // Try to trigger a new event
    if (tickCount >= this.nextEventTick && this.activeEvents.length === 0) {
      const eventType = this._pickEvent(state.level);
      if (eventType) {
        const ev = this.startEvent(eventType, state, tickCount);
        if (ev) triggered.push({ action: 'start', event: ev });
      }
      this.nextEventTick = tickCount + this.eventCooldown + Math.floor(this.rng() * 300);
    }

    return triggered;
  }

  startEvent(eventType, state, tickCount) {
    const config = EVENT_CONFIGS[eventType];
    if (!config) return null;
    const ev = {
      id: `event_${tickCount}_${eventType}`,
      type: eventType,
      startTick: tickCount,
      endTick: tickCount + config.duration,
      data: {},
    };
    this.activeEvents.push(ev);
    return ev;
  }

  endEvent(event) {
    const idx = this.activeEvents.findIndex(e => e.id === event.id);
    if (idx !== -1) {
      this.activeEvents.splice(idx, 1);
      this.eventHistory.push(event);
    }
  }

  getActiveEvents() {
    return this.activeEvents;
  }

  _pickEvent(level) {
    const eligible = Object.entries(EVENT_CONFIGS)
      .filter(([, cfg]) => level >= cfg.minLevel);
    if (eligible.length === 0) return null;
    const total = eligible.reduce((s, [, c]) => s + c.weight, 0);
    let roll = this.rng() * total;
    for (const [type, cfg] of eligible) {
      roll -= cfg.weight;
      if (roll <= 0) return type;
    }
    return eligible[0][0];
  }
}
