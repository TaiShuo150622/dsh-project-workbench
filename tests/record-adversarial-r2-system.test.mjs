import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordError, RecordKernel } from '../record/kernel.mjs';
import { fixture, definition, observation, AGENT, VERIFIER } from './support/record-fixture.mjs';

const recordError = value => value instanceof RecordError;
const errorCode = code => value => value instanceof RecordError && value.code === code;
const json = value => JSON.parse(JSON.stringify(value));

function mistakenSuccessWithAnotherReservation() {
  const f = fixture();
  const firstActionId = f.send();
  const successCommand = f.command('resolveAction', {
    actionId: firstActionId, outcome: 'succeeded', evidence: observation(),
  }, VERIFIER);
  const successReceipt = f.kernel.apply(successCommand);
  const secondTaskId = f.create({ spec: definition({ pullRequestId: 'pr-2' }) }).taskId;
  const secondActionId = f.reserve(secondTaskId);
  f.call('withdrawCompletion', {
    completionId: f.kernel.task(f.taskId).completionId,
    reason: 'the earlier success observation was mistakenly attributed',
  }, VERIFIER);
  return { ...f, firstActionId, secondTaskId, secondActionId, successCommand, successReceipt };
}

// The README promises final admission and serialization across task IDs.
// A reservation was legitimate when made, but the first sender is now unknown.
test('R2-S01 final admission blocks an existing reservation after another success is withdrawn', () => {
  const f = mistakenSuccessWithAnotherReservation();
  assert.equal(f.kernel.action(f.firstActionId).status, 'unknown');
  assert.equal(f.decision(f.secondTaskId).reason, 'action-unresolved');
  const before = f.kernel.snapshot(), journalBefore = f.kernel.journal();

  assert.throws(() => f.call('dispatchAction', {
    actionId: f.secondActionId, connected: true,
  }, AGENT, f.secondTaskId), recordError,
  'the second sender must not cross final admission while the same branch has an unknown sender');
  assert.deepEqual(f.kernel.snapshot(), before, 'a rejected send must publish no state change');
  assert.deepEqual(f.kernel.journal(), journalBefore, 'a rejected send must publish no event');
});

test('R2-S01 control terminal proof releases the original reservation after replay', () => {
  const f = mistakenSuccessWithAnotherReservation();
  const replay = RecordKernel.replay(json(f.kernel.journal()));
  assert.deepEqual(replay.snapshot(), f.kernel.snapshot());
  const beforeOldReceipt = replay.snapshot();
  assert.deepEqual(replay.apply(json(f.successCommand)), f.successReceipt);
  assert.deepEqual(replay.snapshot(), beforeOldReceipt, 'a historical receipt cannot revive the withdrawn success');

  const proofCommand = f.command('resolveAction', {
    actionId: f.firstActionId, outcome: 'not_applied',
    proof: { senderTerminated: true, notApplied: true, reference: 'trusted-terminal-negative-proof-r2' },
  }, VERIFIER);
  const proofReceipt = replay.apply(json(proofCommand));
  assert.equal(replay.action(f.firstActionId).status, 'not_applied');
  const released = replay.snapshot();
  assert.deepEqual(replay.apply(json(proofCommand)), proofReceipt);
  assert.deepEqual(replay.apply(json(f.successCommand)), f.successReceipt);
  assert.deepEqual(replay.snapshot(), released, 'retry receipts cannot change the terminal resolution');

  const dispatchCommand = f.command('dispatchAction', {
    actionId: f.secondActionId, connected: true,
  }, AGENT, f.secondTaskId);
  dispatchCommand.expectedRevision = replay.task(f.secondTaskId).revision;
  assert.doesNotThrow(() => replay.apply(json(dispatchCommand)),
    'the unchanged authorized reservation can proceed once the other sender is conclusively resolved');
  assert.equal(replay.action(f.secondActionId).status, 'sent');
  assert.equal(replay.action(f.firstActionId).status, 'not_applied');
});

// This candidate applies the confirmed result-button identity rule to the
// README's project/history incarnation boundary. README does not explicitly
// specify token transport between streams; the coordinator reviews that scope.
test('R2-S02 a result button from another history cannot accept an independent assignment', () => {
  const shown = fixture({ streamId: 'project-a:epoch-1' });
  const independent = fixture({ streamId: 'project-a:epoch-2' });
  shown.verify(); independent.verify();
  const shownToken = json(shown.kernel.acceptanceToken(shown.taskId));
  const independentToken = independent.kernel.acceptanceToken(independent.taskId);
  assert.equal(shownToken.taskId, independentToken.taskId, 'local sequence IDs intentionally collide');
  assert.equal(shownToken.completionId, independentToken.completionId);
  assert.equal(shownToken.resultId, independentToken.resultId, 'the merge result itself is identical');
  const before = independent.kernel.snapshot(), journalBefore = independent.kernel.journal();

  assert.throws(() => independent.call('acceptResult', { token: shownToken }), recordError,
    'viewing the old history must not accept the independent assignment in a new history');
  assert.deepEqual(independent.kernel.snapshot(), before);
  assert.deepEqual(independent.kernel.journal(), journalBefore);
  assert.equal(independent.kernel.dependency(independent.taskId, 'current-acceptance'), false);
});

test('R2-S02 control same-history result tokens and submitted requests survive JSON replay', () => {
  const f = fixture({ streamId: 'project-a:same-history-token-control' });
  f.verify();
  const token = json(f.kernel.acceptanceToken(f.taskId));
  f.call('note', { text: 'an unrelated note after the result was displayed' });
  const replay = RecordKernel.replay(json(f.kernel.journal()));
  const acceptCommand = json(f.command('acceptResult', { token }));
  const receipt = replay.apply(acceptCommand);
  assert.equal(replay.dependency(f.taskId, 'current-acceptance'), true);
  const accepted = replay.snapshot();
  assert.deepEqual(replay.apply(json(acceptCommand)), receipt);
  assert.deepEqual(replay.snapshot(), accepted);

  const secondReplay = RecordKernel.replay(json(replay.journal()));
  assert.deepEqual(secondReplay.snapshot(), accepted);
  assert.deepEqual(secondReplay.apply(json(acceptCommand)), receipt);
  assert.deepEqual(secondReplay.snapshot(), accepted);
  assert.equal(secondReplay.task(f.taskId).acceptances.length, 1);
});

test('R2-S03 control a revert learned through an old assignment invalidates its peer token after replay', () => {
  const f = fixture({ streamId: 'project-a:shared-availability-control' });
  f.verify();
  const oldToken = f.kernel.acceptanceToken(f.taskId);
  f.call('acceptResult', { token: oldToken });
  f.call('withdrawCompletion', {
    completionId: oldToken.completionId, reason: 'completion belonged to a later assignment',
  }, VERIFIER);
  f.call('cancel', { reason: 'end the earlier assignment' });
  const peerTaskId = f.create({ reissueOf: f.taskId }).taskId;
  f.verify({}, peerTaskId);
  const peerToken = json(f.kernel.acceptanceToken(peerTaskId));
  assert.equal(peerToken.resultId, oldToken.resultId);
  const peerRevision = f.kernel.task(peerTaskId).revision;
  const pendingNote = f.command('note', { text: 'prepared before the revert was learned' }, undefined, peerTaskId);
  const pendingAcceptance = f.command('acceptResult', { token: peerToken }, undefined, peerTaskId);
  const unavailableCommand = f.command('markUnavailable', {
    resultId: oldToken.resultId, reference: 'later-revert-reported-through-old-assignment',
  }, VERIFIER);
  const replay = RecordKernel.replay(json(f.kernel.journal()));
  replay.apply(json(unavailableCommand));

  assert.equal(replay.task(peerTaskId).revision, peerRevision + 1);
  assert.equal(replay.task(peerTaskId).results.find(item => item.id === peerToken.resultId).available, false);
  assert.equal(replay.dependency(peerTaskId, 'historical-completion'), true);
  assert.equal(replay.dependency(peerTaskId, 'current-result'), false);
  assert.equal(replay.dependency(peerTaskId, 'current-acceptance'), false);
  assert.equal(replay.task(f.taskId).acceptances.length, 1, 'old acceptance history remains available for audit');
  const beforeRejected = replay.snapshot(), journalBefore = replay.journal();
  assert.throws(() => replay.apply(json(pendingNote)), errorCode('REVISION_CONFLICT'));
  assert.throws(() => replay.apply(json(pendingAcceptance)), recordError);
  assert.deepEqual(replay.snapshot(), beforeRejected);
  assert.deepEqual(replay.journal(), journalBefore);
  assert.deepEqual(RecordKernel.replay(json(replay.journal())).snapshot(), beforeRejected);
});
