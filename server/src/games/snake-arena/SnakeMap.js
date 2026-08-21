// Snake Arena — Map generator

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Generate a complete map for the given level */
export function generate(seed, size, level) {
  const rng = mulberry32(seed);
  const cells = Array.from({ length: size }, () => new Array(size).fill(0));
  const walls = [];
  const portals = [];
  const secrets = [];
  const spawns = [];
  const terrain = new Map();

  // Border walls
  for (let x = 0; x < size; x++) {
    addWall(x, 0); addWall(x, size - 1);
  }
  for (let y = 1; y < size - 1; y++) {
    addWall(0, y); addWall(size - 1, y);
  }

  // Level 1-5: simple open map with scattered walls
  if (level <= 5) {
    const wallCount = Math.floor(size * size * 0.02 * level);
    for (let i = 0; i < wallCount; i++) {
      const x = Math.floor(rng() * (size - 4)) + 2;
      const y = Math.floor(rng() * (size - 4)) + 2;
      addWall(x, y);
    }
  }

  // Level 6-10: corridors and rooms
  if (level >= 6 && level <= 10) {
    generateRooms(rng, cells, walls, size, 4 + level - 5);
    generateCorridors(rng, cells, walls, size, level);
  }

  // Level 11-15: portals and secrets
  if (level >= 11 && level <= 15) {
    generateRooms(rng, cells, walls, size, 8);
    generateCorridors(rng, cells, walls, size, level);
    const portalCount = Math.min(level - 9, 6);
    for (let i = 0; i < portalCount; i++) {
      const [x1, y1] = findOpen(rng, cells, size);
      const [x2, y2] = findOpen(rng, cells, size);
      portals.push({ x: x1, y: y1, targetX: x2, targetY: y2, id: `portal_${i}` });
      portals.push({ x: x2, y: y2, targetX: x1, targetY: y1, id: `portal_${i}_r` });
    }
    const secretCount = Math.floor(rng() * 5) + 3;
    for (let i = 0; i < secretCount; i++) {
      const [sx, sy] = findOpen(rng, cells, size);
      secrets.push({ x: sx, y: sy, reward: [50, 100, 200, 500][Math.floor(rng() * 4)] });
    }
  }

  // Level 16+: complex layouts, terrain zones, traps
  if (level >= 16) {
    generateRooms(rng, cells, walls, size, 10 + Math.floor((level - 16) / 2));
    generateCorridors(rng, cells, walls, size, level);
    const portalCount = Math.min(level - 12, 8);
    for (let i = 0; i < portalCount; i++) {
      const [x1, y1] = findOpen(rng, cells, size);
      const [x2, y2] = findOpen(rng, cells, size);
      portals.push({ x: x1, y: y1, targetX: x2, targetY: y2, id: `portal_${i}` });
      portals.push({ x: x2, y: y2, targetX: x1, targetY: y1, id: `portal_${i}_r` });
    }
    const secretCount = Math.floor(rng() * 8) + 5;
    for (let i = 0; i < secretCount; i++) {
      const [sx, sy] = findOpen(rng, cells, size);
      secrets.push({ x: sx, y: sy, reward: [100, 200, 500, 1000][Math.floor(rng() * 4)] });
    }
    generateTerrainZones(rng, terrain, size, level);
  }

  // Spawn points at safe positions
  const spawnPositions = getSpawnPositions(size);
  for (const sp of spawnPositions) {
    clearArea(cells, walls, sp.x, sp.y, 11, size);
    spawns.push(sp);
  }

  // Connectivity check — ensure all open cells reachable
  ensureConnectivity(cells, size);

  function addWall(x, y) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    cells[y][x] = 1;
    walls.push({ x, y, type: 'WALL' });
  }

  return { cells, walls, portals, secrets, spawns, terrain };
}

function generateRooms(rng, cells, walls, size, roomCount) {
  for (let i = 0; i < roomCount; i++) {
    const rw = Math.floor(rng() * 6) + 4;
    const rh = Math.floor(rng() * 6) + 4;
    const rx = Math.floor(rng() * (size - rw - 4)) + 2;
    const ry = Math.floor(rng() * (size - rh - 4)) + 2;
    // Room borders
    for (let x = rx; x < rx + rw; x++) {
      if (cells[ry][x] === 0) { cells[ry][x] = 1; walls.push({ x, y: ry, type: 'WALL' }); }
      if (cells[ry + rh - 1][x] === 0) { cells[ry + rh - 1][x] = 1; walls.push({ x, y: ry + rh - 1, type: 'WALL' }); }
    }
    for (let y = ry; y < ry + rh; y++) {
      if (cells[y][rx] === 0) { cells[y][rx] = 1; walls.push({ x: rx, y, type: 'WALL' }); }
      if (cells[y][rx + rw - 1] === 0) { cells[y][rx + rw - 1] = 1; walls.push({ x: rx + rw - 1, y, type: 'WALL' }); }
    }
    // Door openings
    const doorSide = Math.floor(rng() * 4);
    const doorPos = Math.floor(rng() * (Math.min(rw, rh) - 2)) + 1;
    let dx, dy;
    if (doorSide === 0) { dx = rx + doorPos; dy = ry; }
    else if (doorSide === 1) { dx = rx + doorPos; dy = ry + rh - 1; }
    else if (doorSide === 2) { dx = rx; dy = ry + doorPos; }
    else { dx = rx + rw - 1; dy = ry + doorPos; }
    if (dx >= 0 && dx < size && dy >= 0 && dy < size) {
      cells[dy][dx] = 0;
      const idx = walls.findIndex(w => w.x === dx && w.y === dy);
      if (idx !== -1) walls.splice(idx, 1);
    }
  }
}

function generateCorridors(rng, cells, walls, size, level) {
  const corridorCount = Math.floor(level / 2) + 2;
  for (let i = 0; i < corridorCount; i++) {
    const horizontal = rng() > 0.5;
    const pos = Math.floor(rng() * (size - 10)) + 5;
    const start = Math.floor(rng() * (size - 20)) + 5;
    const len = Math.floor(rng() * 10) + 5;
    for (let j = start; j < start + len && j < size - 1; j++) {
      const wx = horizontal ? j : pos;
      const wy = horizontal ? pos : j;
      if (wx > 0 && wx < size - 1 && wy > 0 && wy < size - 1 && cells[wy][wx] === 0) {
        cells[wy][wx] = 1;
        walls.push({ x: wx, y: wy, type: 'WALL' });
      }
    }
    // Gap in corridor
    const gapPos = start + Math.floor(rng() * len);
    const gx = horizontal ? gapPos : pos;
    const gy = horizontal ? pos : gapPos;
    if (gx > 0 && gx < size - 1 && gy > 0 && gy < size - 1) {
      cells[gy][gx] = 0;
      const idx = walls.findIndex(w => w.x === gx && w.y === gy);
      if (idx !== -1) walls.splice(idx, 1);
    }
  }
}

function generateTerrainZones(rng, terrain, size, level) {
  const types = ['ICE', 'MUD', 'BOOST', 'DANGER'];
  const zoneCount = Math.floor(level / 4) + 2;
  for (let i = 0; i < zoneCount; i++) {
    const cx = Math.floor(rng() * (size - 10)) + 5;
    const cy = Math.floor(rng() * (size - 10)) + 5;
    const r = Math.floor(rng() * 4) + 2;
    const type = types[Math.floor(rng() * types.length)];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          terrain.set(`${cx + dx},${cy + dy}`, type);
        }
      }
    }
  }
}

function findOpen(rng, cells, size) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(rng() * (size - 4)) + 2;
    const y = Math.floor(rng() * (size - 4)) + 2;
    if (cells[y][x] === 0) return [x, y];
  }
  return [Math.floor(size / 2), Math.floor(size / 2)];
}

function getSpawnPositions(size) {
  const margin = 6;
  return [
    { x: margin, y: margin },
    { x: size - margin - 1, y: size - margin - 1 },
    { x: size - margin - 1, y: margin },
    { x: margin, y: size - margin - 1 },
    { x: Math.floor(size / 2), y: margin },
    { x: Math.floor(size / 2), y: size - margin - 1 },
    { x: margin, y: Math.floor(size / 2) },
    { x: size - margin - 1, y: Math.floor(size / 2) },
  ];
}

function clearArea(cells, walls, cx, cy, radius, size) {
  const half = Math.floor(radius / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
        cells[y][x] = 0;
        const idx = walls.findIndex(w => w.x === x && w.y === y);
        if (idx !== -1) walls.splice(idx, 1);
      }
    }
  }
}

function ensureConnectivity(cells, size) {
  // Find first open cell
  let startX = -1, startY = -1;
  outer: for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (cells[y][x] === 0) { startX = x; startY = y; break outer; }
    }
  }
  if (startX === -1) return;

  // Flood fill
  const visited = Array.from({ length: size }, () => new Uint8Array(size));
  const stack = [[startX, startY]];
  visited[startY][startX] = 1;
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && !visited[ny][nx] && cells[ny][nx] === 0) {
        visited[ny][nx] = 1;
        stack.push([nx, ny]);
      }
    }
  }

  // Remove walls isolating unreachable open cells
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (cells[y][x] === 0 && !visited[y][x]) {
        // Carve a path towards the visited area
        let cx = x, cy = y;
        while (cx > 1 && cx < size - 2 && cy > 1 && cy < size - 2 && !visited[cy][cx]) {
          cx += (startX > cx ? 1 : -1);
          cells[cy][cx] = 0;
          visited[cy][cx] = 1;
        }
      }
    }
  }
}

export default { generate };
