import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ActionValidator } from '../../src/security/ActionValidator.js';

describe('ActionValidator', () => {
  const validator = new ActionValidator();

  it('parses valid JSON string', () => {
    const r = validator.validate('{"type":"test"}');
    assert.ok(r.valid);
    assert.equal(r.data.type, 'test');
  });

  it('accepts valid object', () => {
    const r = validator.validate({ type: 'game:action', data: 'hello' });
    assert.ok(r.valid);
  });

  it('rejects oversized message', () => {
    const huge = JSON.stringify({ type: 'test', data: 'x'.repeat(3000) });
    const r = validator.validate(huge);
    assert.equal(r.valid, false);
    assert.match(r.error, /too large/i);
  });

  it('rejects invalid JSON', () => {
    const r = validator.validate('not json{');
    assert.equal(r.valid, false);
  });

  it('rejects non-object', () => {
    assert.equal(validator.validate('"string"').valid, false);
    assert.equal(validator.validate('42').valid, false);
    assert.equal(validator.validate('null').valid, false);
    assert.equal(validator.validate('[]').valid, false);
  });

  it('rejects missing type', () => {
    const r = validator.validate({ data: 'hello' });
    assert.equal(r.valid, false);
  });

  it('rejects empty type', () => {
    const r = validator.validate({ type: '' });
    assert.equal(r.valid, false);
  });

  it('rejects overly long type', () => {
    const r = validator.validate({ type: 'a'.repeat(51) });
    assert.equal(r.valid, false);
  });

  it('sanitizes string fields', () => {
    const r = validator.validate({ type: 'test', name: '<script>alert(1)</script>' });
    assert.ok(r.valid);
    assert.ok(!r.data.name.includes('<script>'));
    assert.ok(r.data.name.includes('&lt;'));
  });

  it('preserves non-string fields', () => {
    const r = validator.validate({ type: 'test', count: 42, active: true });
    assert.ok(r.valid);
    assert.equal(r.data.count, 42);
    assert.equal(r.data.active, true);
  });
});
