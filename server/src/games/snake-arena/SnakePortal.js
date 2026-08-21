// Snake Arena — Portal management

/** Create portal objects from map data */
export function createPortals(map) {
  return (map.portals || []).map(p => ({
    ...p,
    active: true,
    temporary: false,
    cooldown: 0,
    lastUsed: 0,
  }));
}

/** Teleport a player through a portal */
export function enterPortal(player, portal, tickCount) {
  if (!portal.active) return false;
  if (portal.cooldown > 0 && tickCount - portal.lastUsed < portal.cooldown) return false;

  // Move head to target
  player.body[0] = [portal.targetX, portal.targetY];
  portal.lastUsed = tickCount;
  return true;
}

/** Update portals each tick (handle temporary/shifting portals) */
export function updatePortals(portals, tickCount) {
  for (const portal of portals) {
    // Temporary portals expire
    if (portal.temporary && portal.expiresAt && tickCount >= portal.expiresAt) {
      portal.active = false;
    }

    // Shifting portals change target periodically
    if (portal.shifting && tickCount % portal.shiftInterval === 0) {
      portal.targetX += Math.round(Math.random() * 6 - 3);
      portal.targetY += Math.round(Math.random() * 6 - 3);
    }
  }
}

/** Create a temporary portal (from events) */
export function createTemporaryPortal(x, y, targetX, targetY, duration, tickCount) {
  return {
    id: `temp_portal_${tickCount}`,
    x, y, targetX, targetY,
    active: true, temporary: true,
    expiresAt: tickCount + duration,
    cooldown: 0, lastUsed: 0,
  };
}

export default { createPortals, enterPortal, updatePortals, createTemporaryPortal };
