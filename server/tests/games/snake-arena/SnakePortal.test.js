import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPortals, enterPortal, updatePortals, createTemporaryPortal } from '../../../src/games/snake-arena/SnakePortal.js';

describe('createPortals', () => {
  it('creates portal objects from map data', () => {
    const map = {
      portals: [
        { x: 5, y: 5, targetX: 10, targetY: 10, id: 'p1' },
        { x: 10, y: 10, targetX: 5, targetY: 5, id: 'p2' },
      ],
    };
    const portals = createPortals(map);
    assert.equal(portals.length, 2);
    assert.ok(portals[0].active);
    assert.equal(portals[0].temporary, false);
    assert.equal(portals[0].cooldown, 0);
  });

  it('returns empty array for map with no portals', () => {
    assert.deepEqual(createPortals({}), []);
    assert.deepEqual(createPortals({ portals: [] }), []);
  });
});

describe('enterPortal', () => {
  it('teleports player to target', () => {
    const player = { body: [[5, 5], [5, 6]] };
    const portal = { active: true, cooldown: 0, lastUsed: 0, targetX: 15, targetY: 15 };
    const result = enterPortal(player, portal, 10);
    assert.ok(result);
    assert.deepEqual(player.body[0], [15, 15]);
  });

  it('rejects inactive portal', () => {
    const player = { body: [[5, 5]] };
    const portal = { active: false, cooldown: 0, lastUsed: 0, targetX: 15, targetY: 15 };
    assert.ok(!enterPortal(player, portal, 10));
    assert.deepEqual(player.body[0], [5, 5]);
  });

  it('respects cooldown', () => {
    const player = { body: [[5, 5]] };
    const portal = { active: true, cooldown: 20, lastUsed: 5, targetX: 15, targetY: 15 };
    // tickCount=10, cooldown=20, lastUsed=5: 10 - 5 = 5 < 20 → blocked
    assert.ok(!enterPortal(player, portal, 10));
  });

  it('allows use after cooldown expires', () => {
    const player = { body: [[5, 5]] };
    const portal = { active: true, cooldown: 5, lastUsed: 0, targetX: 15, targetY: 15 };
    assert.ok(enterPortal(player, portal, 10));
  });

  it('updates lastUsed on success', () => {
    const player = { body: [[5, 5]] };
    const portal = { active: true, cooldown: 0, lastUsed: 0, targetX: 15, targetY: 15 };
    enterPortal(player, portal, 42);
    assert.equal(portal.lastUsed, 42);
  });
});

describe('updatePortals', () => {
  it('deactivates expired temporary portals', () => {
    const portals = [
      { active: true, temporary: true, expiresAt: 50 },
    ];
    updatePortals(portals, 60);
    assert.ok(!portals[0].active);
  });

  it('keeps non-expired temporary portals active', () => {
    const portals = [
      { active: true, temporary: true, expiresAt: 100 },
    ];
    updatePortals(portals, 50);
    assert.ok(portals[0].active);
  });

  it('permanent portals stay active', () => {
    const portals = [
      { active: true, temporary: false },
    ];
    updatePortals(portals, 9999);
    assert.ok(portals[0].active);
  });
});

describe('createTemporaryPortal', () => {
  it('creates portal with correct fields', () => {
    const p = createTemporaryPortal(3, 4, 10, 11, 100, 50);
    assert.equal(p.x, 3);
    assert.equal(p.y, 4);
    assert.equal(p.targetX, 10);
    assert.equal(p.targetY, 11);
    assert.ok(p.active);
    assert.ok(p.temporary);
    assert.equal(p.expiresAt, 150); // tickCount + duration
    assert.ok(p.id.includes('temp_portal'));
  });
});
