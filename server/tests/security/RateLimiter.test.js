import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../../src/security/RateLimiter.js';

describe('RateLimiter', () => {
  it('allows requests under limit', () => {
    const limiter = new RateLimiter({ maxPerWindow: 5, windowMs: 1000 });
    for (let i = 0; i < 5; i++) {
      assert.ok(limiter.check('user1'));
    }
  });

  it('blocks requests over limit', () => {
    const limiter = new RateLimiter({ maxPerWindow: 3, windowMs: 10000 });
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');
    assert.equal(limiter.check('user1'), false);
  });

  it('tracks users independently', () => {
    const limiter = new RateLimiter({ maxPerWindow: 2, windowMs: 10000 });
    limiter.check('user1');
    limiter.check('user1');
    assert.ok(limiter.check('user2'));
    assert.equal(limiter.check('user1'), false);
  });

  it('remove clears user', () => {
    const limiter = new RateLimiter({ maxPerWindow: 1, windowMs: 10000 });
    limiter.check('user1');
    limiter.remove('user1');
    assert.ok(limiter.check('user1'));
  });
});
