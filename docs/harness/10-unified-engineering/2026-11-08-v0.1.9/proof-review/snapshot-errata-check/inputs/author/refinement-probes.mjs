// R-04: read-only execution of exact 7264be1 source copies. No I/O effects beyond stdout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const inputs = JSON.parse(readFileSync(new URL('./inputs.json', import.meta.url), 'utf8'));
for (const entry of inputs.entries.filter(e => e.git_commit)) {
  const bytes = readFileSync(new URL(entry.prepared_source, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256,
    `Frozen input changed: ${entry.prepared_source}`);
}
const { fixture, definition, observation, USER, AGENT, VERIFIER } =
  await import('./inputs/tests/support/record-fixture.mjs');
const { RecordKernel } = await import('./inputs/record/kernel.mjs');
const cases = [];
function probe(id, title, category, claim, fn) {
  const trace = [];
  const record = (event, observed) => trace.push({ step: trace.length + 1, event, observed });
  try {
    fn(record);
    cases.push({ id, title, category, claim_under_review: claim,
      outcome: category === 'refinement_gap' ? 'COUNTEREXAMPLE_REPRODUCED' : 'SCOPED_BEHAVIOR_CONFIRMED', trace });
  } catch (error) {
    cases.push({ id, title, category, claim_under_review: claim, outcome: 'HARNESS_ASSERTION_FAILED',
      error: String(error.stack), trace });
  }
}
function rejected(thunk, expectedCode) {
  let caught;
  try { thunk(); } catch (e) { caught = e; }
  assert.equal(caught?.code, expectedCode);
  return caught.code;
}

probe('RF01', 'An attempt created under v1 can reserve and dispatch the v2 scope', 'refinement_gap',
  'Every S1 attempt is bound to its creation specVersion and a successor retires its write authority.', record => {
  const f = fixture();
  const oldAttempt = f.begin();
  record('create v1 and begin A1', { taskId: f.taskId, specVersion: f.kernel.task(f.taskId).specVersion,
    attempt: f.kernel.task(f.taskId).attempts[0] });
  f.call('reviseTask', { sourceId: 'new-scope-v2', spec: definition({ sourceSha: '4'.repeat(40) }) });
  const successorActor = { kind: 'agent', id: 'successor-agent' };
  const newAttempt = f.begin(f.taskId, successorActor);
  record('revise to v2 and begin A2', { specVersion: f.kernel.task(f.taskId).specVersion, newAttempt });
  const action = f.call('reserveAction', { attemptId: oldAttempt, connected: true }, AGENT).actionId;
  f.call('dispatchAction', { actionId: action, connected: true }, AGENT);
  const actual = f.kernel.action(action);
  assert.equal(actual.attemptId, oldAttempt); assert.equal(actual.specVersion, 2);
  assert.equal(actual.spec.sourceSha, '4'.repeat(40)); assert.equal(actual.status, 'sent');
  record('A1 uses current revision to reserve and dispatch', actual);
});

probe('RF02', 'A command routed to another history can mutate its colliding local task ID', 'refinement_gap',
  'Every S1 command independently rejects a different history incarnation.', record => {
  const old = fixture({ streamId: 'project:old', task: { sourceId: 'old-assignment' } });
  const fresh = fixture({ streamId: 'project:fresh', task: { sourceId: 'fresh-assignment' } });
  assert.equal(old.taskId, fresh.taskId);
  const command = old.command('cancel', { reason: 'cancel the old assignment only' });
  record('independent histories collide on local ID and revision', {
    oldStream: old.kernel.snapshot().streamId, freshStream: fresh.kernel.snapshot().streamId,
    taskId: old.taskId, oldSource: old.kernel.task(old.taskId).sourceId,
    freshSource: fresh.kernel.task(fresh.taskId).sourceId, command });
  const receipt = fresh.kernel.apply(command);
  assert.equal(fresh.kernel.task(fresh.taskId).status, 'cancelled');
  assert.equal(old.kernel.task(old.taskId).status, 'open');
  record('route the unmodified old command into the fresh kernel', {
    receipt, freshStatus: fresh.kernel.task(fresh.taskId).status, oldStatus: old.kernel.task(old.taskId).status });
  // Positive control: result tokens DO carry history identity.
  const a = fixture({ streamId: 'token-history:a' }), b = fixture({ streamId: 'token-history:b' });
  a.verify(); b.verify();
  const code = rejected(() => b.call('acceptResult', { token: a.kernel.acceptanceToken(a.taskId) }), 'ACCEPTANCE_CONFLICT');
  record('control: cross-history acceptance token', { rejected: code });
});

probe('RF03', 'A repeated same-result observation does not become an alternative support witness', 'refinement_gap',
  'S1 completion withdrawal implements general OR-support preservation.', record => {
  const f = fixture(); f.verify({ observationRef: 'observer:first' });
  const firstCompletion = f.kernel.task(f.taskId).completionId;
  f.verify({ observationRef: 'observer:independent-second' });
  const before = f.kernel.task(f.taskId);
  assert.equal(before.completions.length, 1);
  assert.equal(before.completions[0].evidence.observationRef, 'observer:first');
  const refs = f.kernel.journal().events.filter(e => e.command.type === 'verifyCompletion')
    .map(e => e.command.payload.evidence.observationRef);
  assert.deepEqual(refs, ['observer:first', 'observer:independent-second']);
  record('accept two same-result observations', { completionCount: before.completions.length,
    retainedWitness: before.completions[0].evidence.observationRef, journalObservationRefs: refs });
  f.call('withdrawCompletion', { completionId: firstCompletion, reason: 'first source attribution withdrawn' }, VERIFIER);
  assert.equal(f.kernel.dependency(f.taskId, 'historical-completion'), false);
  record('withdraw the one current completion', { supported: f.kernel.dependency(f.taskId, 'historical-completion'),
    status: f.kernel.task(f.taskId).status, completionCount: f.kernel.task(f.taskId).completions.length,
    secondObservationRemainsInJournal: true });
});

probe('RF04', 'New-action precheck is not the dispatch guard for an existing reservation', 'refinement_gap',
  'checkAction is the same admissibility predicate as dispatchAction for a reserved action.', record => {
  const f = fixture(), actionId = f.reserve();
  const decision = f.decision();
  assert.equal(decision.decision, 'wait'); assert.equal(decision.actionId, actionId);
  record('query checkAction after own reservation', { actionId, decision });
  f.call('dispatchAction', { actionId, connected: true }, AGENT);
  assert.equal(f.kernel.action(actionId).status, 'sent');
  record('dispatch the same reservation', { status: f.kernel.action(actionId).status });
});

probe('RF05', 'The first historical merge observation initializes availability without a separate readback', 'refinement_gap',
  'S1 current-result alone establishes independently observed Usable_L(t,q,n).', record => {
  const f = fixture(); const observed = observation({ observationRef: 'historical-merge-only' });
  f.call('verifyCompletion', { evidence: observed }, VERIFIER);
  const result = f.kernel.task(f.taskId).results[0];
  assert.equal(result.available, true);
  assert.equal(f.kernel.dependency(f.taskId, 'current-result'), true);
  record('supply only the documented ordinary-merge observation', { evidenceFields: Object.keys(observed),
    result, currentResult: f.kernel.dependency(f.taskId, 'current-result'),
    separateAvailabilityReadSubmitted: false });
  f.call('markUnavailable', { resultId: result.id, reference: 'later-global-revert' }, VERIFIER);
  f.verify({ observationRef: 'repeat-historical-merge' });
  assert.equal(f.kernel.dependency(f.taskId, 'current-result'), false);
  record('control: later known invalidation survives a repeated merge observation', {
    historicalCompletion: f.kernel.dependency(f.taskId, 'historical-completion'),
    currentResult: f.kernel.dependency(f.taskId, 'current-result') });
});

probe('RF06', 'A post-assignment completion conflict rolls back the draft action mutation', 'scoped_control',
  'A rejected synchronous command publishes no state, event or request receipt.', record => {
  const f = fixture(), actionId = f.send(); f.verify();
  const command = f.command('resolveAction', { actionId, outcome: 'succeeded',
    evidence: observation({ mergeSha: '4'.repeat(40) }) }, VERIFIER);
  const before = f.kernel.snapshot(), journal = f.kernel.journal();
  record('sent action exists while a different completion has been accepted', {
    action: f.kernel.action(actionId), completion: f.kernel.task(f.taskId).completionId });
  const code = rejected(() => f.kernel.apply(command), 'COMPLETION_CONFLICT');
  assert.deepEqual(f.kernel.snapshot(), before); assert.deepEqual(f.kernel.journal(), journal);
  // Repeating the failed request is not converted into a historical success receipt.
  rejected(() => f.kernel.apply(command), 'COMPLETION_CONFLICT');
  record('resolveAction assigns succeeded in the draft, then complete rejects; repeat stays rejected', {
    error: code, currentActionStatus: f.kernel.action(actionId).status,
    cursorUnchanged: f.kernel.snapshot().cursor === before.cursor, journalUnchanged: true });
});

probe('RF07', 'C01 must use explicit successor mode for a completed S1 task', 'scoped_control',
  'The supported C01 variant rejects in-place completed-task mutation and does not inherit acceptance.', record => {
  const f = fixture(); f.verify(); f.call('acceptResult', { token: f.kernel.acceptanceToken(f.taskId) });
  const before = f.kernel.snapshot();
  const revised = definition({ sourceSha: '4'.repeat(40) });
  const code = rejected(() => f.call('reviseTask', { sourceId: 'post-completion-revision', spec: revised }), 'INVALID_TRANSITION');
  assert.deepEqual(f.kernel.snapshot(), before);
  const successor = f.create({ sourceId: 'explicit-successor', relatedTaskId: f.taskId, spec: revised }).taskId;
  assert.equal(f.kernel.dependency(f.taskId, 'current-acceptance'), true);
  assert.equal(f.kernel.dependency(successor, 'current-acceptance'), false);
  record('reject in-place mutation and create a related new assignment', {
    rejected: code, oldTaskId: f.taskId, newTaskId: successor,
    oldAccepted: true, newAccepted: false, newSpecVersion: f.kernel.task(successor).specVersion });
});

probe('RF08', 'Cancellation and late evidence retain separate task and action outcomes', 'scoped_control',
  'Cancellation of a sent action does not assert not_applied; late trusted success stays attributed to the old action.', record => {
  const f = fixture(), actionId = f.send(); f.call('cancel', { reason: 'after modeled dispatch' });
  assert.equal(f.kernel.action(actionId).status, 'sent');
  record('cancel after dispatch', { taskStatus: f.kernel.task(f.taskId).status, actionStatus: f.kernel.action(actionId).status });
  f.call('resolveAction', { actionId, outcome: 'unknown' }, AGENT);
  const next = f.create({ reissueOf: f.taskId }).taskId;
  assert.equal(f.decision(next).decision, 'wait');
  record('record uncertainty and create successor assignment', { successorDecision: f.decision(next) });
  f.call('resolveAction', { actionId, outcome: 'succeeded', evidence: observation() }, VERIFIER);
  assert.equal(f.kernel.task(f.taskId).status, 'cancelled'); assert.equal(f.decision(next).decision, 'verify');
  record('accept a trusted synthetic late result', { oldTaskStatus: f.kernel.task(f.taskId).status,
    oldActionStatus: f.kernel.action(actionId).status, successorDecision: f.decision(next) });
});

const failed = cases.filter(c => c.outcome === 'HARNESS_ASSERTION_FAILED');
console.log(JSON.stringify({ schema_version: 1, execution_kind: 'frozen_source_synchronous_probe',
  base_commit: inputs.base_commit, node_version: process.version, cases,
  summary: { cases: cases.length, assertion_failures: failed.length,
    refinement_gap_counterexamples: cases.filter(c => c.category === 'refinement_gap').length,
    scoped_controls: cases.filter(c => c.category === 'scoped_control').length },
  limitations: ['No network, authentication, target effects, crash persistence or concurrent process execution.',
    'COUNTEREXAMPLE_REPRODUCED rejects the quoted stronger mapping, not the narrower documented S1 contract.',
    'These are short constructed traces, not exhaustive state enumeration or a formal simulation proof.'] }, null, 2));
if (failed.length) process.exitCode = 1;
