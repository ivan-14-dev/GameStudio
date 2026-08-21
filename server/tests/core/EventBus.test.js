import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../../src/core/EventBus.js';

describe('EventBus', () => {
  it('emits and receives events', () => {
    const bus = new EventBus();
    let received = null;
    bus.on('test', (data) => { received = data; });
    bus.emit('test', { value: 42 });
    assert.deepEqual(received, { value: 42 });
  });

  it('supports multiple listeners', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('test', () => count++);
    bus.on('test', () => count++);
    bus.emit('test');
    assert.equal(count, 2);
  });

  it('off removes listener', () => {
    const bus = new EventBus();
    let count = 0;
    const fn = () => count++;
    bus.on('test', fn);
    bus.off('test', fn);
    bus.emit('test');
    assert.equal(count, 0);
  });

  it('on returns unsubscribe function', () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on('test', () => count++);
    unsub();
    bus.emit('test');
    assert.equal(count, 0);
  });

  it('emit with no listeners is a no-op', () => {
    const bus = new EventBus();
    assert.doesNotThrow(() => bus.emit('none', {}));
  });
});
