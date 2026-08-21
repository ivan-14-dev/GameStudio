// Snake Arena — World management with spatial hashing

const CHUNK_SIZE = 16;

function chunkKey(x, y) {
  return `${Math.floor(x / CHUNK_SIZE)},${Math.floor(y / CHUNK_SIZE)}`;
}

export default class SnakeWorld {
  constructor(mapSize) {
    this.mapSize = mapSize;
    this.grid = [];
    for (let y = 0; y < mapSize; y++) {
      this.grid[y] = new Array(mapSize).fill(0);
    }
    this.terrain = new Map();
    this.spatialHash = new Map();
    this.entities = new Map();
  }

  getCellAt(x, y) {
    if (!this.isInBounds(x, y)) return -1;
    return this.grid[y][x];
  }

  setCellAt(x, y, value) {
    if (!this.isInBounds(x, y)) return;
    this.grid[y][x] = value;
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.mapSize && y >= 0 && y < this.mapSize;
  }

  getTerrainAt(x, y) {
    return this.terrain.get(`${x},${y}`) || 'NORMAL';
  }

  setTerrain(x, y, type) {
    this.terrain.set(`${x},${y}`, type);
  }

  /** Add an entity to the spatial hash for fast lookups */
  addEntity(entity) {
    const { id, x, y } = entity;
    this.entities.set(id, entity);
    const key = chunkKey(x, y);
    if (!this.spatialHash.has(key)) this.spatialHash.set(key, new Set());
    this.spatialHash.get(key).add(id);
  }

  removeEntity(id) {
    const entity = this.entities.get(id);
    if (!entity) return;
    const key = chunkKey(entity.x, entity.y);
    const chunk = this.spatialHash.get(key);
    if (chunk) {
      chunk.delete(id);
      if (chunk.size === 0) this.spatialHash.delete(key);
    }
    this.entities.delete(id);
  }

  updateEntityPosition(id, newX, newY) {
    const entity = this.entities.get(id);
    if (!entity) return;
    const oldKey = chunkKey(entity.x, entity.y);
    const newKey = chunkKey(newX, newY);
    if (oldKey !== newKey) {
      const oldChunk = this.spatialHash.get(oldKey);
      if (oldChunk) {
        oldChunk.delete(id);
        if (oldChunk.size === 0) this.spatialHash.delete(oldKey);
      }
      if (!this.spatialHash.has(newKey)) this.spatialHash.set(newKey, new Set());
      this.spatialHash.get(newKey).add(id);
    }
    entity.x = newX;
    entity.y = newY;
  }

  /** Query all entities within a rectangle */
  queryRect(x1, y1, x2, y2) {
    const results = [];
    const cx1 = Math.floor(x1 / CHUNK_SIZE);
    const cy1 = Math.floor(y1 / CHUNK_SIZE);
    const cx2 = Math.floor(x2 / CHUNK_SIZE);
    const cy2 = Math.floor(y2 / CHUNK_SIZE);
    for (let cy = cy1; cy <= cy2; cy++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        const chunk = this.spatialHash.get(`${cx},${cy}`);
        if (!chunk) continue;
        for (const id of chunk) {
          const e = this.entities.get(id);
          if (e && e.x >= x1 && e.x <= x2 && e.y >= y1 && e.y <= y2) {
            results.push(e);
          }
        }
      }
    }
    return results;
  }

  /** Get all entities within radius of a point */
  getEntitiesInRadius(x, y, r) {
    const candidates = this.queryRect(x - r, y - r, x + r, y + r);
    const r2 = r * r;
    return candidates.filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 <= r2);
  }
}
