import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordKernel, RecordError, installSnapshot } from '../record/kernel.mjs';
import { fixture, definition, observation, USER, AGENT, VERIFIER, MERGE } from './support/record-fixture.mjs';

const error = code => value => value instanceof RecordError && value.code === code;
test('record completion exits execution before acceptance while new authorized work proceeds', () => {
  const f = fixture(); f.verify();
  assert.equal(f.kernel.task(f.taskId).status, 'completed');
  assert.equal(f.decision().decision, 'skip');
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
  const b = f.create({ spec: definition({ pullRequestId: 'pr-2' }) });
  assert.equal(f.decision(b.taskId).decision, 'allow');
});
test('record reports and host attempts do not establish objective completion', () => {
  const f = fixture(), attemptId = f.begin();
  f.call('report', { attemptId, summary: 'completed and accepted' }, AGENT);
  assert.equal(f.kernel.task(f.taskId).status, 'open');
  assert.equal(f.kernel.dependency(f.taskId, 'historical-completion'), false);
  assert.throws(() => f.call('verifyCompletion', { evidence: observation() }, AGENT), error('FORBIDDEN'));
});
test('record evidence must match repository PR target source and actual ordinary merge', () => {
  for (const patch of [{ repositoryId: 'wrong' }, { pullRequestId: 'wrong' }, { targetRef: 'refs/heads/main' },
    { sourceSha: '4'.repeat(40) }, { mergeMethod: 'squash' }]) {
    const f = fixture(), before = f.kernel.snapshot();
    assert.throws(() => f.verify(patch), error('EVIDENCE_SCOPE_MISMATCH'));
    assert.deepEqual(f.kernel.snapshot(), before);
  }
  for (const patch of [{ merged: false }, { parents: ['1'.repeat(40), '1'.repeat(40)] }, { mergeSha: '1'.repeat(40) }]) {
    assert.throws(() => fixture().verify(patch), error('INVALID_EVIDENCE'));
  }
});
test('record same request retries return original receipt without another event', () => {
  const f = fixture(), command = f.command('note', { text: 'receipt may be lost' });
  const receipt = f.kernel.apply(command), before = f.kernel.snapshot();
  assert.deepEqual(f.kernel.apply(structuredClone(command)), receipt);
  assert.deepEqual(f.kernel.snapshot(), before);
  assert.throws(() => f.kernel.apply({ ...command, payload: { text: 'different' } }), error('REQUEST_REUSED'));
  assert.throws(() => f.kernel.apply({ ...command, actor: AGENT }), error('REQUEST_REUSED'));
});
test('record failed writes are atomic and stale task revisions cannot overwrite state', () => {
  const f = fixture(), command = f.command('cancel', { reason: 'old request' });
  f.call('note', { text: 'new state' }); const before = f.kernel.snapshot();
  assert.throws(() => f.kernel.apply(command), error('REVISION_CONFLICT'));
  assert.deepEqual(f.kernel.snapshot(), before);
  assert.throws(() => f.call('pause', { paused: 'false' }), error('INVALID_INPUT'));
  assert.deepEqual(f.kernel.snapshot(), before);
});
test('record cancellation preserves assignment identity and reissue links a new task', () => {
  const f = fixture(), original = f.kernel.journal().events[0].command;
  f.call('cancel', { reason: 'not now' });
  const same = f.kernel.apply({ ...original, requestId: 'assignment-redelivery' });
  assert.equal(same.taskId, f.taskId); assert.equal(f.kernel.task(f.taskId).status, 'cancelled');
  assert.throws(() => f.create(), error('REISSUE_LINK_REQUIRED'));
  const newTask = f.create({ reissueOf: f.taskId });
  assert.notEqual(newTask.taskId, f.taskId);
  assert.equal(f.kernel.task(newTask.taskId).reissueOf, f.taskId);
  assert.equal(f.decision(newTask.taskId).decision, 'allow');
});
test('record pausing and retrying preserve task identity and stop new actions', () => {
  const f = fixture(); const a = f.begin();
  f.call('pause', { paused: true }); assert.equal(f.decision().reason, 'paused');
  f.call('pause', { paused: false }); const b = f.begin();
  assert.notEqual(a, b); assert.equal(f.kernel.snapshot().tasks.length, 1);
  assert.equal(f.decision().decision, 'allow');
});
test('record duplicate targets require binding and assignments cannot change meaning', () => {
  const f = fixture(), initial = f.kernel.journal().events[0].command;
  assert.throws(() => f.create(), error('DUPLICATE_TASK'));
  assert.throws(() => f.kernel.apply({ ...initial, requestId: 'another', payload: { ...initial.payload, spec: definition({ pullRequestId: 'pr-2' }) } }), error('SOURCE_REUSED'));
});
test('record spec revisions reject earlier evidence and need a new authorization source', () => {
  const f = fixture(); f.call('reviseTask', { sourceId: 'scope-change', spec: definition({ sourceSha: '4'.repeat(40) }) });
  assert.equal(f.kernel.task(f.taskId).specVersion, 2);
  assert.throws(() => f.verify(), error('EVIDENCE_SCOPE_MISMATCH'));
  f.verify({ sourceSha: '4'.repeat(40), parents: ['2'.repeat(40), '4'.repeat(40)] });
  assert.throws(() => f.call('reviseTask', { sourceId: 'later', spec: definition() }), error('INVALID_TRANSITION'));
});
test('record acceptance uses immutable result binding while unrelated notes stay valid', () => {
  const f = fixture(); f.verify(); const token = f.kernel.acceptanceToken(f.taskId);
  f.call('note', { text: 'display metadata corrected' });
  const command = f.command('acceptResult', { token }); const receipt = f.kernel.apply(command);
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), true);
  assert.deepEqual(f.kernel.apply(command), receipt);
  assert.throws(() => f.call('acceptResult', { token }), error('ACCEPTANCE_CONFLICT'));
  assert.equal(f.kernel.task(f.taskId).acceptances.length, 1);
});
test('record old result button cannot accept a corrected different result', () => {
  const f = fixture(); f.verify(); const old = f.kernel.acceptanceToken(f.taskId);
  f.call('withdrawCompletion', { completionId: old.completionId, reason: 'wrong observation' }, VERIFIER);
  f.call('resolveDispute', { conclusion: 'met', reference: 'corrected', evidence: observation({ mergeSha: '4'.repeat(40) }) }, VERIFIER);
  assert.throws(() => f.call('acceptResult', { token: old }), error('ACCEPTANCE_CONFLICT'));
  f.call('acceptResult', { token: f.kernel.acceptanceToken(f.taskId) });
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), true);
});
test('record contradictory completion cannot silently replace an established result', () => {
  const f = fixture(); f.verify(); const before = f.kernel.snapshot();
  assert.throws(() => f.verify({ mergeSha: '4'.repeat(40) }), error('COMPLETION_CONFLICT'));
  assert.deepEqual(f.kernel.snapshot(), before);
});
test('record wrong completion suspends acceptance and same result needs explicit reuse', () => {
  const f = fixture(); f.verify(); const token = f.kernel.acceptanceToken(f.taskId);
  const accepted = f.call('acceptResult', { token });
  f.call('withdrawCompletion', { completionId: token.completionId, reason: 'evidence attributed incorrectly' }, VERIFIER);
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
  assert.equal(f.kernel.task(f.taskId).acceptances.length, 1);
  assert.equal(f.decision().reason, 'disputed');
  assert.throws(() => f.verify(), error('INVALID_TRANSITION'));
  f.call('resolveDispute', { conclusion: 'met', reference: 'fresh-observation', evidence: observation() }, VERIFIER);
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
  f.call('acceptResult', { token: f.kernel.acceptanceToken(f.taskId), reuseAcceptanceId: accepted.acceptanceId });
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), true);
});
test('record changed result cannot reuse old acceptance and unmet dispute has an explicit exit', () => {
  const f = fixture(); f.verify(); const token = f.kernel.acceptanceToken(f.taskId);
  const old = f.call('acceptResult', { token });
  f.call('withdrawCompletion', { completionId: token.completionId, reason: 'incorrect completion' }, VERIFIER);
  f.call('resolveDispute', { conclusion: 'unmet', reference: 'confirmed-unmet' }, VERIFIER);
  assert.equal(f.kernel.task(f.taskId).status, 'open'); assert.equal(f.decision().decision, 'allow');
  f.verify({ mergeSha: '4'.repeat(40) });
  assert.throws(() => f.call('acceptResult', { token: f.kernel.acceptanceToken(f.taskId), reuseAcceptanceId: old.acceptanceId }), error('ACCEPTANCE_REUSE_MISMATCH'));
});
test('record revert keeps historical completion but invalidates current dependencies', () => {
  const f = fixture(); f.verify(); const token = f.kernel.acceptanceToken(f.taskId); f.call('acceptResult', { token });
  f.call('markUnavailable', { resultId: token.resultId, reference: 'revert-observation' }, VERIFIER);
  assert.equal(f.kernel.task(f.taskId).status, 'completed');
  assert.equal(f.kernel.dependency(f.taskId, 'historical-completion'), true);
  assert.equal(f.kernel.dependency(f.taskId, 'current-result'), false);
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), false);
  f.verify(); // A repeated historical PR observation does not prove content restoration.
  assert.equal(f.kernel.dependency(f.taskId, 'current-result'), false);
  assert.equal(f.decision().decision, 'skip');
});
test('record does not invent human acceptance requirements for unrequired tasks', () => {
  const f = fixture({ task: { requiresAcceptance: false } }); f.verify();
  assert.throws(() => f.call('acceptResult', { token: f.kernel.acceptanceToken(f.taskId) }), error('ACCEPTANCE_NOT_REQUIRED'));
  assert.equal(f.decision().decision, 'skip');
});
test('record disconnection blocks shared changes and leaves read views available', () => {
  const f = fixture(), attemptId = f.begin();
  assert.equal(f.decision(f.taskId, false).reason, 'record-unavailable');
  assert.throws(() => f.call('reserveAction', { attemptId, connected: false }, AGENT), error('ACTION_BLOCKED'));
  assert.equal(f.kernel.task(f.taskId).status, 'open');
  const actionId = f.call('reserveAction', { attemptId, connected: true }, AGENT).actionId;
  assert.throws(() => f.call('dispatchAction', { actionId, connected: false }, AGENT), error('ACTION_BLOCKED'));
  assert.equal(f.kernel.action(actionId).status, 'reserved');
});
test('record resource reservation excludes different tasks targeting the same branch', () => {
  const f = fixture(); const b = f.create({ spec: definition({ pullRequestId: 'pr-2' }) }).taskId;
  f.reserve(); const attemptId = f.begin(b);
  assert.equal(f.decision(b).reason, 'action-unresolved');
  assert.throws(() => f.call('reserveAction', { attemptId, connected: true }, AGENT, b), error('ACTION_BLOCKED'));
});
test('record cancellation or authorization change before send aborts reservations', () => {
  for (const [type, payload] of [['cancel', { reason: 'stop before dispatch' }], ['authorize', { sourceId: 'revoke', active: false }], ['pause', { paused: true }]]) {
    const f = fixture(), actionId = f.reserve(); f.call(type, payload);
    assert.equal(f.kernel.action(actionId).status, 'aborted');
    assert.throws(() => f.call('dispatchAction', { actionId, connected: true }, AGENT), error('ACTION_BLOCKED'));
  }
});
test('record unknown sent action cannot be replaced after cancellation and reissue', () => {
  const f = fixture(), actionId = f.send();
  f.call('resolveAction', { actionId, outcome: 'unknown' }, AGENT);
  f.call('cancel', { reason: 'cancel after sending' });
  const next = f.create({ reissueOf: f.taskId }).taskId;
  assert.equal(f.decision(next).reason, 'action-unresolved');
  assert.throws(() => f.call('resolveAction', { actionId, outcome: 'not_applied', proof: { senderTerminated: false, notApplied: true, reference: 'no-result-yet' } }, VERIFIER), error('TERMINAL_PROOF_REQUIRED'));
  f.call('resolveAction', { actionId, outcome: 'not_applied', proof: { senderTerminated: true, notApplied: true, reference: 'sender-fenced-and-absent' } }, VERIFIER);
  assert.equal(f.decision(next).decision, 'allow');
});
test('record cancelled late success is reused through verification without another action', () => {
  const f = fixture(), actionId = f.send(); f.call('cancel', { reason: 'too late' });
  f.call('resolveAction', { actionId, outcome: 'succeeded', evidence: observation() }, VERIFIER);
  assert.equal(f.kernel.task(f.taskId).status, 'cancelled');
  const next = f.create({ reissueOf: f.taskId }).taskId;
  assert.equal(f.decision(next).decision, 'verify');
  f.verify({}, next); assert.equal(f.decision(next).decision, 'skip');
});
test('record successful action and completion publish atomically', () => {
  const f = fixture(), actionId = f.send();
  f.call('resolveAction', { actionId, outcome: 'succeeded', evidence: observation() }, VERIFIER);
  assert.equal(f.kernel.action(actionId).status, 'succeeded');
  assert.equal(f.kernel.task(f.taskId).status, 'completed');
  assert.equal(f.decision().decision, 'skip');
});
test('record actions are owned and task scope cannot change while a sender is unresolved', () => {
  const f = fixture(), actionId = f.reserve();
  assert.throws(() => f.call('dispatchAction', { actionId, connected: true }, { kind: 'agent', id: 'other' }), error('FORBIDDEN'));
  assert.throws(() => f.call('reviseTask', { sourceId: 'change', spec: definition({ pullRequestId: 'pr-2' }) }), error('INVALID_TRANSITION'));
});
test('record journal replay retains idempotency and rejects event gaps or altered receipts', () => {
  const f = fixture(); const command = f.command('verifyCompletion', { evidence: observation() }, VERIFIER); f.kernel.apply(command);
  const replay = RecordKernel.replay(JSON.parse(JSON.stringify(f.kernel.journal())));
  assert.deepEqual(replay.snapshot(), f.kernel.snapshot());
  replay.apply(command); assert.deepEqual(replay.snapshot(), f.kernel.snapshot());
  const gap = f.kernel.journal(); gap.events[1].sequence++;
  assert.throws(() => RecordKernel.replay(gap), error('EVENT_GAP'));
  const changed = f.kernel.journal(); changed.events[1].receipt.revision++;
  assert.throws(() => RecordKernel.replay(changed), error('INVALID_JOURNAL'));
});
test('record stale snapshots cannot replace newer state or cross stream identities', () => {
  const f = fixture(), old = f.kernel.snapshot(); f.verify(); const current = f.kernel.snapshot();
  assert.deepEqual(installSnapshot(current, old), current);
  assert.deepEqual(installSnapshot(old, current), current);
  assert.throws(() => installSnapshot(current, fixture({ streamId: 'another-project' }).kernel.snapshot()), error('STREAM_MISMATCH'));
  const corrupt = structuredClone(current); corrupt.tasks[0].status = 'open';
  assert.throws(() => installSnapshot(current, corrupt), error('INVALID_SNAPSHOT'));
});
test('record read snapshots cursors and receipts are defensive copies', () => {
  const f = fixture(); const cursor = f.kernel.snapshot().cursor;
  f.kernel.task(f.taskId).status = 'completed';
  f.kernel.snapshot().tasks.length = 0;
  const change = f.call('note', { text: 'change' }); change.cursor = 0;
  const delta = f.kernel.eventsSince(cursor);
  assert.equal(delta.events.length, 1); assert.equal(delta.cursor, f.kernel.snapshot().cursor);
  delta.events[0].command.payload.text = 'corrupted';
  assert.equal(f.kernel.task(f.taskId).notes[0].text, 'change');
  assert.throws(() => f.kernel.eventsSince(1000), error('CURSOR_AHEAD'));
});
test('record malformed commands do not mutate state and identifiers are not object keys', () => {
  const f = fixture(), before = f.kernel.snapshot();
  for (const payload of [{ paused: 1 }, { paused: true, completed: true }]) assert.throws(() => f.call('pause', payload), error('INVALID_INPUT'));
  assert.throws(() => f.call('note', { text: undefined }), error('INVALID_INPUT'));
  assert.deepEqual(f.kernel.snapshot(), before);
  const other = fixture({ task: { sourceId: '__proto__' } }); other.verify();
  assert.equal(other.kernel.task(other.taskId).status, 'completed');
  assert.equal({}.status, undefined);
});
