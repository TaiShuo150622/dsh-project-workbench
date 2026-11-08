import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordError, RecordKernel } from '../record/kernel.mjs';
import { fixture, definition, observation, VERIFIER } from './support/record-fixture.mjs';

// Revision of R1-P2 only. Keep the original candidate and report unchanged.
// README:65 requires senderTerminated + notApplied proof for negative release.
// A positive PR observation does not independently prove sender termination.
function correctedMistakenSuccess() {
  const f = fixture();
  const actionId = f.send();
  f.call('resolveAction', { actionId, outcome: 'succeeded', evidence: observation() }, VERIFIER);
  const { completionId } = f.kernel.acceptanceToken(f.taskId);
  f.call('withdrawCompletion', {
    completionId, reason: 'The positive PR observation was incorrectly attributed',
  }, VERIFIER);
  f.call('resolveDispute', { conclusion: 'unmet', reference: 'confirmed-objective-not-met' }, VERIFIER);
  return { ...f, actionId };
}

test('R1-P2 correction: invalidated success waits for sender proof instead of reusing the old result', () => {
  const f = correctedMistakenSuccess();
  assert.equal(f.kernel.task(f.taskId).status, 'open');
  assert.equal(f.kernel.dependency(f.taskId, 'historical-completion'), false);

  const sameResourceTaskId = f.create({ spec: definition({ pullRequestId: 'pr-2' }) }).taskId;
  const actual = {
    correctedTask: f.decision().decision,
    otherTaskOnSameBranch: f.decision(sameResourceTaskId).decision,
  };

  // With the positive evidence withdrawn there is no usable prior result.
  // The sender is still unproven, so neither this task nor another PR on the
  // same repository/target may start another external action.
  assert.deepEqual(actual, { correctedTask: 'wait', otherTaskOnSameBranch: 'wait' },
    JSON.stringify({ actual, oldAction: f.kernel.action(f.actionId) }));
});

test('R1-P2 correction: only terminal not-applied proof releases the corrected action', () => {
  const f = correctedMistakenSuccess();
  const beforeProof = f.kernel.snapshot();

  for (const proof of [
    { senderTerminated: false, notApplied: true, reference: 'absent-but-sender-not-terminated' },
    { senderTerminated: true, notApplied: false, reference: 'terminated-but-application-not-disproved' },
  ]) {
    assert.throws(() => f.call('resolveAction', {
      actionId: f.actionId, outcome: 'not_applied', proof,
    }, VERIFIER), value => value instanceof RecordError);
    assert.deepEqual(f.kernel.snapshot(), beforeProof);
  }

  const proofCommand = f.command('resolveAction', {
    actionId: f.actionId, outcome: 'not_applied',
    proof: { senderTerminated: true, notApplied: true, reference: 'trusted-terminal-negative-proof' },
  }, VERIFIER);
  assert.doesNotThrow(() => f.kernel.apply(proofCommand),
    'A corrected mistaken success must remain resolvable by trusted terminal negative proof');
  assert.equal(f.kernel.action(f.actionId).status, 'not_applied');
  assert.equal(f.decision().decision, 'allow');
  assert.equal(f.kernel.dependency(f.taskId, 'historical-completion'), false);

  // Correction/release is durable in the S1 journal semantics; replay must not
  // resurrect the superseded success observation or lose the proof request ID.
  const replay = RecordKernel.replay(JSON.parse(JSON.stringify(f.kernel.journal())));
  const released = f.kernel.snapshot();
  assert.deepEqual(replay.snapshot(), released);
  replay.apply(JSON.parse(JSON.stringify(proofCommand)));
  assert.deepEqual(replay.snapshot(), released);
  assert.equal(replay.checkAction(f.taskId, {
    connected: true, expectedRevision: replay.task(f.taskId).revision,
  }).decision, 'allow');
});
