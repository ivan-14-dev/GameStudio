// Snake Arena — Collision detection with spatial hash for O(1) lookups

/** Spatial hash grid for fast collision queries */
export class SpatialHash {
  #grid = new Map();

  clear() { this.#grid.clear(); }

  _key(x, y) { return (x << 16) | (y & 0xffff); }

  insert(x, y, data) {
    const k = this._key(x, y);
    let bucket = this.#grid.get(k);
    if (!bucket) { bucket = []; this.#grid.set(k, bucket); }
    bucket.push(data);
  }

  query(x, y) {
    return this.#grid.get(this._key(x, y)) || [];
  }

  has(x, y) {
    return this.#grid.has(this._key(x, y));
  }
}

/** Build a spatial hash from the current state */
export function buildSpatialHash(state) {
  const hash = new SpatialHash();
  // Snake bodies
  for (const [pid, player] of state.players) {
    if (!player.alive) continue;
    for (let i = 0; i < player.body.length; i++) {
      const [x, y] = player.body[i];
      hash.insert(x, y, { type: 'snake', playerId: pid, index: i });
    }
  }
  // Food
  for (const f of (state.food || [])) {
    hash.insert(f.x, f.y, { type: 'food', food: f });
  }
  // Powerups
  for (const p of (state.powerups || [])) {
    if (!p.collected) hash.insert(p.x, p.y, { type: 'powerup', powerup: p });
  }
  // Obstacles
  for (const o of (state.obstacles || [])) {
    hash.insert(o.x, o.y, { type: 'obstacle', obstacle: o });
  }
  // Portals
  for (const p of (state.portals || [])) {
    hash.insert(p.x, p.y, { type: 'portal', portal: p });
  }
  // Secrets
  for (const s of (state.secrets || [])) {
    if (!s.found) hash.insert(s.x, s.y, { type: 'secret', secret: s });
  }
  return hash;
}

/** Run all collision checks using spatial hash */
export function checkAll(state) {
  const hash = buildSpatialHash(state);
  const events = [];
  for (const [pid, player] of state.players) {
    if (!player.alive) continue;
    const head = player.body[0];

    // Wall collision
    if (checkWall(head, state.map, state.mapSize)) {
      events.push({ type: 'wall', playerId: pid });
      continue;
    }

    // Self collision (still O(n) per snake but unavoidable)
    if (checkSelfCollision(player)) {
      events.push({ type: 'self', playerId: pid });
      continue;
    }

    // Use spatial hash for everything at head position
    const [hx, hy] = head;
    const items = hash.query(hx, hy);
    let collided = false;

    for (const item of items) {
      if (item.type === 'snake' && item.playerId !== pid) {
        events.push({ type: 'snake', playerId: pid, otherId: item.playerId, hitHead: item.index === 0, hitIndex: item.index });
        collided = true;
        break;
      }
      if (item.type === 'obstacle') {
        const o = item.obstacle;
        if (o.type === 'TRAP' && !o.triggered) {
          events.push({ type: 'trap', playerId: pid, trap: o });
        } else if (o.type !== 'TRAP' && o.type !== 'WALL') {
          events.push({ type: 'obstacle', playerId: pid, obstacle: o });
          collided = true;
          break;
        }
      }
      if (item.type === 'food') {
        events.push({ type: 'food', playerId: pid, food: item.food });
      }
      if (item.type === 'powerup') {
        events.push({ type: 'powerup', playerId: pid, powerup: item.powerup });
      }
      if (item.type === 'portal') {
        events.push({ type: 'portal', playerId: pid, portal: item.portal });
      }
      if (item.type === 'secret') {
        events.push({ type: 'secret', playerId: pid, secret: item.secret });
      }
    }

    if (collided) continue;
  }
  return events;
}

export function checkWall(head, map, mapSize) {
  const [x, y] = head;
  if (x < 0 || x >= mapSize || y < 0 || y >= mapSize) return true;
  if (map.cells[y] && map.cells[y][x] === 1) return true;
  return false;
}

export function checkObstacle(head, obstacles) {
  const [hx, hy] = head;
  return obstacles.find(o => o.x === hx && o.y === hy && o.type !== 'TRAP' && o.type !== 'WALL') || null;
}

export function checkSelfCollision(player) {
  const [hx, hy] = player.body[0];
  for (let i = 1; i < player.body.length; i++) {
    if (player.body[i][0] === hx && player.body[i][1] === hy) return true;
  }
  return false;
}

export function checkSnakeCollision(head, otherPlayer) {
  const [hx, hy] = head;
  for (let i = 0; i < otherPlayer.body.length; i++) {
    if (otherPlayer.body[i][0] === hx && otherPlayer.body[i][1] === hy) {
      return { hitHead: i === 0, hitIndex: i };
    }
  }
  return null;
}

export function checkFood(head, foodList) {
  const [hx, hy] = head;
  const idx = foodList.findIndex(f => f.x === hx && f.y === hy);
  return idx !== -1 ? foodList[idx] : null;
}

export function checkPowerup(head, powerups) {
  const [hx, hy] = head;
  const idx = powerups.findIndex(p => p.x === hx && p.y === hy && !p.collected);
  return idx !== -1 ? powerups[idx] : null;
}

export function checkPortal(head, portals) {
  const [hx, hy] = head;
  return portals.find(p => p.x === hx && p.y === hy) || null;
}

export function checkSecret(head, secrets) {
  const [hx, hy] = head;
  const idx = secrets.findIndex(s => s.x === hx && s.y === hy && !s.found);
  return idx !== -1 ? secrets[idx] : null;
}

export function checkTrap(head, obstacles) {
  const [hx, hy] = head;
  return obstacles.find(o => o.x === hx && o.y === hy && o.type === 'TRAP' && !o.triggered) || null;
}

export default {
  SpatialHash, buildSpatialHash,
  checkAll, checkWall, checkObstacle, checkSelfCollision,
  checkSnakeCollision, checkFood, checkPowerup, checkPortal, checkSecret, checkTrap,
};
