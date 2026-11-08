import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordError } from '../record/kernel.mjs';
import { fixture, definition, VERIFIER } from './support/record-fixture.mjs';

const recordError = error => error instanceof RecordError;
const errorCode = code => error => error instanceof RecordError && error.code === code;

// README: the fixed source SHA binds one authorized batch, and a revision
// requires a NEW explicit scope source. A different requestId is not a new source.
test('R1-I01 an assignment source cannot authorize a different source SHA through revision', () => {
  const f = fixture();
  const originalSourceId = f.kernel.task(f.taskId).sourceId;
  const before = f.kernel.snapshot();

  assert.throws(() => f.call('reviseTask', {
    sourceId: originalSourceId,
    spec: definition({ sourceSha: '4'.repeat(40) }),
  }), recordError, 'changing the authorized batch must consume a new scope source');
  assert.deepEqual(f.kernel.snapshot(), before, 'rejection must publish no changed scope or event');
});

test('R1-I01 positive control a genuinely new source can revise an open batch', () => {
  const f = fixture();
  const replacementSha = '4'.repeat(40);
  f.call('reviseTask', {
    sourceId: 'new-explicit-scope-source',
    spec: definition({ sourceSha: replacementSha }),
  });
  assert.equal(f.kernel.task(f.taskId).specVersion, 2);
  assert.equal(f.kernel.task(f.taskId).spec.sourceSha, replacementSha);
  assert.equal(f.decision().decision, 'allow');
  const beforeOldEvidence = f.kernel.snapshot();
  assert.throws(() => f.verify(), errorCode('EVIDENCE_SCOPE_MISMATCH'));
  assert.deepEqual(f.kernel.snapshot(), beforeOldEvidence);
  f.verify({ sourceSha: replacementSha, parents: ['2'.repeat(40), replacementSha] });
  assert.equal(f.kernel.task(f.taskId).status, 'completed');
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
  f.call('acceptResult', { token: f.kernel.acceptanceToken(f.taskId) });
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), true);
});

// README: a repeated historical merged observation cannot undo known
// unavailability; restoration needs a related NEW task/result, not the same
// result fingerprint becoming available solely because its assignment changed.
test('R1-I02 reissuing an assignment cannot restore a known unavailable identical result', () => {
  const f = fixture();
  f.verify();
  const oldToken = f.kernel.acceptanceToken(f.taskId);
  f.call('markUnavailable', { resultId: oldToken.resultId, reference: 'later-revert' }, VERIFIER);
  f.call('withdrawCompletion', {
    completionId: oldToken.completionId,
    reason: 'the old observation was incorrectly used to prove current satisfaction',
  }, VERIFIER);
  f.call('cancel', { reason: 'end the incorrect assignment' });
  const nextTaskId = f.create({ reissueOf: f.taskId }).taskId;
  f.verify({}, nextTaskId); // The exact same historical observation; no restoration occurred.

  assert.equal(f.kernel.task(nextTaskId).results[0].id, oldToken.resultId,
    'the new assignment is observing the identical result, not a restoration result');
  assert.equal(f.kernel.dependency(f.taskId, 'current-result'), false);
  assert.equal(f.kernel.dependency(nextTaskId, 'current-result'), false,
    'a new task ID cannot make the same known reverted result currently available');
});

test('R1-I02 positive control a related task with a new result can satisfy current dependencies', () => {
  const f = fixture();
  f.verify();
  const oldToken = f.kernel.acceptanceToken(f.taskId);
  f.call('acceptResult', { token: oldToken });
  f.call('markUnavailable', { resultId: oldToken.resultId, reference: 'later-revert' }, VERIFIER);

  const nextSha = '4'.repeat(40);
  const nextMerge = '5'.repeat(40);
  const nextTaskId = f.create({
    relatedTaskId: f.taskId,
    spec: definition({ pullRequestId: 'pr-restoration', sourceSha: nextSha }),
  }).taskId;
  f.verify({
    pullRequestId: 'pr-restoration', sourceSha: nextSha,
    mergeSha: nextMerge, parents: ['2'.repeat(40), nextSha],
    observationRef: 'github:restoration-observation',
  }, nextTaskId);
  assert.equal(f.kernel.dependency(f.taskId, 'historical-completion'), true);
  assert.equal(f.kernel.dependency(f.taskId, 'current-result'), false);
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
  assert.equal(f.kernel.dependency(nextTaskId, 'current-result'), true);
  assert.equal(f.kernel.dependency(nextTaskId, 'current-acceptance'), false);
  const token = f.kernel.acceptanceToken(nextTaskId);
  assert.notEqual(token.resultId, oldToken.resultId);
  f.call('acceptResult', { token }, undefined, nextTaskId);
  assert.equal(f.kernel.dependency(nextTaskId, 'current-acceptance'), true);
});

test('R1-I03 positive control a pre-cancellation button cannot accept the same result on a reissue', () => {
  const f = fixture();
  f.verify();
  const oldToken = f.kernel.acceptanceToken(f.taskId);
  f.call('withdrawCompletion', { completionId: oldToken.completionId, reason: 'wrong assignment attribution' }, VERIFIER);
  f.call('cancel', { reason: 'end the earlier assignment' });
  const nextTaskId = f.create({ reissueOf: f.taskId }).taskId;
  f.verify({}, nextTaskId);
  const currentToken = f.kernel.acceptanceToken(nextTaskId);
  assert.equal(currentToken.resultId, oldToken.resultId, 'identical result does not mean identical assignment');
  assert.notEqual(currentToken.taskId, oldToken.taskId);
  assert.notEqual(currentToken.completionId, oldToken.completionId);
  const beforeOldClick = f.kernel.snapshot();
  assert.throws(() => f.call('acceptResult', { token: oldToken }, undefined, nextTaskId), errorCode('ACCEPTANCE_CONFLICT'));
  assert.deepEqual(f.kernel.snapshot(), beforeOldClick);
  f.call('acceptResult', { token: currentToken }, undefined, nextTaskId);
  assert.equal(f.kernel.dependency(nextTaskId, 'current-acceptance'), true);
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
});
