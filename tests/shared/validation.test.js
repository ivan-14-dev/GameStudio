import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, validateRoomCreate, validateRoomJoin, sanitizeString } from '../../shared/schemas/validation.js';

describe('validation', () => {
  describe('validateAction', () => {
    it('accepts valid action', () => {
      assert.equal(validateAction({ type: 'move', playerId: 'p1' }), null);
    });

    it('rejects non-object', () => {
      assert.ok(validateAction('string'));
      assert.ok(validateAction(null));
    });

    it('rejects missing type', () => {
      assert.ok(validateAction({ playerId: 'p1' }));
    });

    it('rejects missing playerId', () => {
      assert.ok(validateAction({ type: 'move' }));
    });
  });

  describe('validateRoomCreate', () => {
    it('accepts valid create', () => {
      assert.equal(validateRoomCreate({ gameId: 'snake' }), null);
    });

    it('rejects missing gameId', () => {
      assert.ok(validateRoomCreate({}));
    });

    it('rejects invalid maxPlayers', () => {
      assert.ok(validateRoomCreate({ gameId: 'snake', maxPlayers: 1 }));
      assert.ok(validateRoomCreate({ gameId: 'snake', maxPlayers: 100 }));
    });

    it('accepts valid maxPlayers', () => {
      assert.equal(validateRoomCreate({ gameId: 'snake', maxPlayers: 4 }), null);
    });
  });

  describe('validateRoomJoin', () => {
    it('accepts valid join', () => {
      assert.equal(validateRoomJoin({ roomCode: 'ABCD12', playerName: 'Alice' }), null);
    });

    it('rejects short code', () => {
      assert.ok(validateRoomJoin({ roomCode: 'AB', playerName: 'Alice' }));
    });

    it('rejects empty name', () => {
      assert.ok(validateRoomJoin({ roomCode: 'ABCD12', playerName: '' }));
    });

    it('rejects too long name', () => {
      assert.ok(validateRoomJoin({ roomCode: 'ABCD12', playerName: 'A'.repeat(21) }));
    });
  });

  describe('sanitizeString', () => {
    it('escapes HTML special chars', () => {
      const s = sanitizeString('<script>alert("xss")</script>');
      assert.ok(!s.includes('<'));
      assert.ok(!s.includes('>'));
      assert.ok(!s.includes('"'));
      assert.ok(s.includes('&lt;'));
      assert.ok(s.includes('&gt;'));
    });

    it('truncates to maxLen', () => {
      const s = sanitizeString('a'.repeat(500), 10);
      assert.equal(s.length, 10);
    });

    it('returns empty string for non-string', () => {
      assert.equal(sanitizeString(42), '');
      assert.equal(sanitizeString(null), '');
      assert.equal(sanitizeString(undefined), '');
    });

    it('handles ampersands', () => {
      const s = sanitizeString('A & B');
      assert.ok(s.includes('&amp;'));
    });

    it('handles single quotes', () => {
      const s = sanitizeString("it's");
      assert.ok(s.includes('&#39;'));
    });
  });
});
