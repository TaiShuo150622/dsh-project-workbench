import test from 'node:test';
import assert from 'node:assert/strict';
import { Native } from '../server/native.js';

test('current hosts inspect stored sessions without activation or write ownership', async () => {
  const calls = [], events = [{ type: 'user/message', data: { id: 'delivered' } }];
  const header = { id: 'cold-session', cwd: '/fixture' };
  const native = new Native({
    sessionController: { resolveAgent() { throw Error('inspection must not activate'); } },
    sessionPersistence: { async open(id, access) {
      calls.push(['open', id, access]);
      return { header, inheritedEventCount: 2,
        async read() { calls.push(['read']); return { events }; },
        async close() { calls.push(['close']); },
      };
    } },
  });
  assert.deepEqual(await native.inspect('cold-session'), { meta: header, inheritedEventCount: 2, events });
  assert.deepEqual(calls, [['open', 'cold-session', 'read'], ['read'], ['close']]);
});

test('passive inspection releases its handle even when the stored log cannot be read', async () => {
  let closed = 0;
  const native = new Native({ sessionController: {}, sessionPersistence: { async open() {
    return { async read() { throw Error('corrupt log'); }, async close() { closed++; } };
  } } });
  await assert.rejects(native.inspect('bad-session'), /corrupt log/);
  assert.equal(closed, 1);
});

test('older hosts keep using their existing passive inspection API', async () => {
  const info = { meta: { cwd: '/legacy' }, events: [] };
  const native = new Native({ sessionController: { async inspect(id) { assert.equal(id, 'legacy'); return info; } } });
  assert.equal(await native.inspect('legacy'), info);
});
