import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../../src/rooms/RoomManager.js';
import { EventBus } from '../../src/core/EventBus.js';
import { ROOM_STATUS } from '../../../shared/constants/room.js';

describe('RoomManager', () => {
  let rm, bus;

  beforeEach(() => {
    bus = new EventBus();
    rm = new RoomManager(bus);
  });

  it('creates a room with code', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    assert.ok(room.roomId);
    assert.ok(room.code);
    assert.equal(room.code.length, 6);
    assert.equal(room.gameId, 'snake');
    assert.equal(room.hostId, 'h1');
    assert.equal(room.status, ROOM_STATUS.WAITING);
    assert.equal(room.players.length, 1);
  });

  it('get returns room by id', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    assert.deepEqual(rm.get(room.roomId), room);
  });

  it('getByCode returns room', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    assert.deepEqual(rm.getByCode(room.code), room);
  });

  it('getByCode is case-insensitive', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    assert.deepEqual(rm.getByCode(room.code.toLowerCase()), room);
  });

  it('join adds player', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    const result = rm.join(room.code, { id: 'p2', name: 'Player 2' });
    assert.ok(!result.error);
    assert.equal(result.room.players.length, 2);
  });

  it('join rejects full room', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host', maxPlayers: 2 });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    const result = rm.join(room.code, { id: 'p3', name: 'P3' });
    assert.ok(result.error);
  });

  it('join rejects started game', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    room.status = ROOM_STATUS.PLAYING;
    const result = rm.join(room.code, { id: 'p2', name: 'P2' });
    assert.ok(result.error);
  });

  it('join rejects duplicate player', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    const result = rm.join(room.code, { id: 'h1', name: 'Host' });
    assert.ok(result.error);
  });

  it('leave removes player', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    rm.leave(room.roomId, 'p2');
    assert.equal(room.players.length, 1);
  });

  it('leave transfers host', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    rm.leave(room.roomId, 'h1');
    assert.equal(room.hostId, 'p2');
  });

  it('setReady marks player', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    rm.setReady(room.roomId, 'h1', true);
    rm.setReady(room.roomId, 'p2', true);
    assert.equal(room.status, ROOM_STATUS.READY);
  });

  it('unready reverts room status', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    rm.setReady(room.roomId, 'h1', true);
    rm.setReady(room.roomId, 'p2', true);
    assert.equal(room.status, ROOM_STATUS.READY);
    rm.setReady(room.roomId, 'p2', false);
    assert.equal(room.status, ROOM_STATUS.WAITING);
  });

  it('startGame transitions to STARTING', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    rm.setReady(room.roomId, 'h1', true);
    rm.setReady(room.roomId, 'p2', true);
    const started = rm.startGame(room.roomId);
    assert.ok(started);
    assert.equal(room.status, ROOM_STATUS.STARTING);
  });

  it('startGame rejects if not ready', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    assert.equal(rm.startGame(room.roomId), null);
  });

  it('finish sets FINISHED status', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.finish(room.roomId);
    assert.equal(room.status, ROOM_STATUS.FINISHED);
  });

  it('rematch resets room for new game', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.join(room.code, { id: 'p2', name: 'P2' });
    room.status = ROOM_STATUS.FINISHED;
    const rematched = rm.rematch(room.roomId);
    assert.ok(rematched);
    assert.equal(room.status, ROOM_STATUS.WAITING);
    assert.ok(room.players.every(p => !p.ready));
  });

  it('rematch fails if not finished', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    assert.equal(rm.rematch(room.roomId), null);
  });

  it('markDisconnected/markReconnected', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    rm.markDisconnected(room.roomId, 'h1');
    assert.equal(room.players[0].connected, false);
    rm.markReconnected(room.roomId, 'h1');
    assert.equal(room.players[0].connected, true);
  });

  it('findRoomByPlayer finds active room', () => {
    const room = rm.create({ gameId: 'snake', hostId: 'h1', hostName: 'Host' });
    room.status = ROOM_STATUS.PLAYING;
    const found = rm.findRoomByPlayer('h1');
    assert.ok(found);
    assert.equal(found.roomId, room.roomId);
  });
});
