// Custom content management — question packs, challenges
import { sanitizeString } from '../../../shared/schemas/validation.js';

export class ContentEngine {
  #packs = new Map();
  #builtIn = new Map();

  loadBuiltIn(packId, pack) {
    this.#builtIn.set(packId, pack);
  }

  createPack(authorId, data) {
    const id = this.#generatePackCode();
    const pack = {
      id,
      authorId,
      name: sanitizeString(data.name, 50),
      description: sanitizeString(data.description, 200),
      items: (data.items || []).map((item) => this.#sanitizeItem(item)),
      createdAt: Date.now(),
    };
    this.#packs.set(id, pack);
    return pack;
  }

  getPack(id) {
    return this.#packs.get(id) || this.#builtIn.get(id) || null;
  }

  addItem(packId, authorId, item) {
    const pack = this.#packs.get(packId);
    if (!pack || pack.authorId !== authorId) return null;
    const sanitized = this.#sanitizeItem(item);
    pack.items.push(sanitized);
    return sanitized;
  }

  getQuestions(config) {
    const { categories = [], types = [], count = 10, packIds = [], difficulty } = config;
    let pool = [];

    // Gather from specified packs or all
    const sources = packIds.length > 0
      ? packIds.map((id) => this.getPack(id)).filter(Boolean)
      : [...this.#builtIn.values()];

    for (const pack of sources) {
      pool.push(...pack.items);
    }

    // Filter
    if (categories.length > 0) pool = pool.filter((q) => categories.includes(q.category));
    if (types.length > 0) pool = pool.filter((q) => types.includes(q.type));
    if (difficulty != null) pool = pool.filter((q) => q.difficulty <= difficulty);

    // Shuffle and pick
    this.#shuffle(pool);
    return pool.slice(0, count);
  }

  exportPack(id) {
    const pack = this.getPack(id);
    if (!pack) return null;
    return JSON.stringify(pack);
  }

  importPack(json) {
    try {
      const data = JSON.parse(json);
      if (!data.name || !Array.isArray(data.items)) return null;
      return this.createPack(data.authorId || 'imported', data);
    } catch {
      return null;
    }
  }

  #sanitizeItem(item) {
    return {
      id: crypto.randomUUID(),
      type: sanitizeString(item.type, 20),
      category: sanitizeString(item.category, 30),
      difficulty: Math.max(1, Math.min(10, Number(item.difficulty) || 1)),
      text: sanitizeString(item.text, 500),
      answers: Array.isArray(item.answers)
        ? item.answers.map((a) => sanitizeString(a, 200)).slice(0, 10)
        : undefined,
      correctAnswer: item.correctAnswer != null ? sanitizeString(String(item.correctAnswer), 200) : undefined,
      timeLimit: Math.max(5, Math.min(120, Number(item.timeLimit) || 30)),
    };
  }

  #shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  #generatePackCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PACK-';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }
}
