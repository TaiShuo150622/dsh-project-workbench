import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordError, RecordKernel, installSnapshot } from '../record/kernel.mjs';
import { fixture, definition, observation, AGENT, VERIFIER } from './support/record-fixture.mjs';

const error = code => value => value instanceof RecordError && value.code === code;

test('R1-P1 a replacement active authorization cannot strand an unsent reservation', () => {
  // The sender has reserved but has not crossed the external send boundary.
  const f = fixture();
  const actionId = f.reserve();
  f.call('authorize', { sourceId: 'replacement-authorization', active: true });

  // A reservation made under the old grant must fail final admission.
  assert.throws(() => f.call('dispatchAction', { actionId, connected: true }, AGENT), error('ACTION_BLOCKED'));
  const task = f.kernel.task(f.taskId);
  assert.equal(task.status, 'open');
  assert.equal(task.authorization.active, true);

  // It is unsent and no longer dispatchable. It must not hold the branch lock
  // against work already authorized under the replacement grant.
  const decision = f.decision();
  assert.equal(decision.decision, 'allow', JSON.stringify({
    decision, action: f.kernel.action(actionId), authorization: task.authorization,
  }));
});

test('R1 protocol control: replay preserves a cancelled unknown sender before and after terminal proof', () => {
  const f = fixture();
  const actionId = f.send();
  f.call('resolveAction', { actionId, outcome: 'unknown' }, AGENT);
  f.call('cancel', { reason: 'User ends the assignment while the sender remains unknown' });
  const nextTaskId = f.create({ reissueOf: f.taskId }).taskId;

  const journal = JSON.parse(JSON.stringify(f.kernel.journal()));
  const replay = RecordKernel.replay(journal);
  assert.deepEqual(replay.snapshot(), f.kernel.snapshot());
  const check = kernel => kernel.checkAction(nextTaskId, {
    connected: true, expectedRevision: kernel.task(nextTaskId).revision,
  });
  assert.equal(check(replay).reason, 'action-unresolved');

  const proofCommand = f.command('resolveAction', {
    actionId, outcome: 'not_applied',
    proof: { senderTerminated: true, notApplied: true, reference: 'terminal-proof-after-replay' },
  }, VERIFIER);
  const receipt = replay.apply(proofCommand);
  assert.equal(check(replay).decision, 'allow');
  const afterProof = replay.snapshot();
  assert.deepEqual(replay.apply(JSON.parse(JSON.stringify(proofCommand))), receipt);
  assert.deepEqual(replay.snapshot(), afterProof);

  // A delayed pre-proof snapshot must not reacquire the released resource.
  assert.deepEqual(installSnapshot(afterProof, f.kernel.snapshot()), afterProof);
});
