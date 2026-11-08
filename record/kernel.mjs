import { createHash } from 'node:crypto';

// S1 is a deterministic, single-writer model. Actors and observations must be
// authenticated by an adapter; this module does not authenticate an LLM claim.
export class RecordError extends Error {
  constructor(code, message = code) { super(message); this.name = 'RecordError'; this.code = code; }
}
const fail = (code, message) => { throw new RecordError(code, message); };
const need = (condition, code, message) => { if (!condition) fail(code, message); };
const copy = value => structuredClone(value);
function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, canonical).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  fail('INVALID_INPUT', 'Only plain JSON values are supported');
}
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
function shape(value, required, optional = []) {
  need(value && Object.getPrototypeOf(value) === Object.prototype, 'INVALID_INPUT', 'Expected a plain object');
  const keys = Object.keys(value);
  need(required.every(key => Object.hasOwn(value, key)) && keys.every(key => [...required, ...optional].includes(key)), 'INVALID_INPUT', 'Unexpected or missing field');
}
function text(value, name = 'value', max = 2000) {
  need(typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), 'INVALID_INPUT', `Invalid ${name}`);
  return value;
}
function id(value) { return text(value, 'identifier', 200); }
function integer(value, min = 0) { need(Number.isSafeInteger(value) && value >= min, 'INVALID_INPUT', 'Invalid integer'); return value; }
function bool(value) { need(typeof value === 'boolean', 'INVALID_INPUT', 'Expected a boolean'); return value; }
function sha(value) { need(typeof value === 'string' && /^[0-9a-f]{40}$/.test(value), 'INVALID_INPUT', 'Expected a lowercase Git SHA-1'); return value; }
function spec(value) {
  shape(value, ['kind', 'repositoryId', 'pullRequestId', 'targetRef', 'sourceSha', 'mergeMethod']);
  need(value.kind === 'pull_request_merge' && value.mergeMethod === 'merge', 'UNSUPPORTED_SPEC');
  id(value.repositoryId); id(value.pullRequestId); sha(value.sourceSha); text(value.targetRef, 'target ref', 256);
  need(value.targetRef.startsWith('refs/heads/') && value.targetRef.length > 11 && !/[\s~^:?*\[\\]/.test(value.targetRef)
    && !value.targetRef.includes('..') && !value.targetRef.includes('@{')
    && value.targetRef.split('/').every(part => part && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock')), 'INVALID_INPUT', 'Invalid target ref');
  return copy(value);
}
const goalKey = value => digest(value);
const resourceKey = value => canonical([value.repositoryId, value.targetRef]);
const roles = (actor, allowed) => need(allowed.includes(actor.kind), 'FORBIDDEN');
const activeAction = action => ['reserved', 'sent', 'unknown'].includes(action.status);
const currentCompletion = task => task.completions.find(item => item.id === task.completionId && item.valid);
const currentResult = task => task.results.find(item => item.id === currentCompletion(task)?.resultId);
function evidence(value, expected) {
  shape(value, ['provider', 'repositoryId', 'pullRequestId', 'targetRef', 'sourceSha', 'mergeMethod', 'merged', 'mergeSha', 'parents', 'observationRef']);
  need(value.provider === 'github', 'INVALID_EVIDENCE');
  id(value.observationRef); sha(value.mergeSha); bool(value.merged);
  need(Array.isArray(value.parents) && value.parents.length === 2, 'INVALID_EVIDENCE');
  value.parents.forEach(sha);
  for (const key of ['repositoryId', 'pullRequestId', 'targetRef', 'sourceSha', 'mergeMethod']) {
    need(value[key] === expected[key], 'EVIDENCE_SCOPE_MISMATCH', `Evidence ${key} does not match`);
  }
  need(value.merged === true && value.parents[1] === expected.sourceSha && value.parents[0] !== value.parents[1]
    && !value.parents.includes(value.mergeSha), 'INVALID_EVIDENCE', 'An actual ordinary merge observation is required');
  return copy(value);
}
function tokenFor(task, streamId) {
  const completed = currentCompletion(task), result = currentResult(task);
  need(task.status === 'completed' && completed && result?.available === true, 'RESULT_NOT_ACCEPTABLE');
  return { streamId, taskId: task.id, specVersion: task.specVersion, completionId: completed.id, resultId: result.id,
    availabilityRevision: result.availabilityRevision, acceptanceRevision: task.acceptanceRevision };
}
function validateToken(token) {
  shape(token, ['streamId', 'taskId', 'specVersion', 'completionId', 'resultId', 'availabilityRevision', 'acceptanceRevision']);
  id(token.streamId); id(token.taskId); id(token.completionId); id(token.resultId);
  integer(token.specVersion, 1); integer(token.availabilityRevision, 1); integer(token.acceptanceRevision);
}
function complete(state, task, observed, sequence) {
  const fingerprint = digest({ spec: task.spec, mergeSha: observed.mergeSha });
  const old = currentCompletion(task);
  need(!old || task.results.find(item => item.id === old.resultId)?.fingerprint === fingerprint, 'COMPLETION_CONFLICT', 'Withdraw and resolve the conflicting completion explicitly');
  let result = state.results.get(`result:${fingerprint}`);
  // A later positive historical merge observation cannot undo a known revert.
  if (!result) {
    result = { id: `result:${fingerprint}`, fingerprint, mergeSha: observed.mergeSha, available: true, availabilityRevision: 1 };
    state.results.set(result.id, result);
  }
  if (!task.results.some(item => item.id === result.id)) task.results.push(result);
  if (old?.resultId === result.id) return old;
  const completed = { id: `completion:${sequence}`, resultId: result.id, specVersion: task.specVersion,
    evidence: copy(observed), valid: true, sequence };
  task.completions.push(completed); task.completionId = completed.id; task.status = 'completed';
  return completed;
}
function actionDecision(state, task, connected, expectedRevision) {
  if (!connected) return { decision: 'wait', reason: 'record-unavailable' };
  if (task.revision !== expectedRevision) return { decision: 'wait', reason: 'stale-revision' };
  if (task.status === 'completed') return { decision: 'skip', reason: 'completed' };
  if (task.status === 'cancelled') return { decision: 'skip', reason: 'cancelled' };
  if (task.status === 'disputed') return { decision: 'wait', reason: 'disputed' };
  if (task.paused || !task.authorization.active) return { decision: 'wait', reason: task.paused ? 'paused' : 'not-authorized' };
  const conflict = [...state.actions.values()].find(action => activeAction(action) && resourceKey(action.spec) === resourceKey(task.spec));
  if (conflict) return { decision: 'wait', reason: 'action-unresolved', actionId: conflict.id };
  const prior = [...state.actions.values()].find(action => action.status === 'succeeded' && goalKey(action.spec) === goalKey(task.spec));
  if (prior) return { decision: 'verify', reason: 'prior-result', actionId: prior.id };
  return { decision: 'allow', reason: 'authorized-open' };
}
function abortReservations(state, task) {
  for (const action of state.actions.values()) if (action.taskId === task.id && action.status === 'reserved') action.status = 'aborted';
}

export class RecordKernel {
  #state;
  #journal = [];
  #requests = new Map();
  constructor({ streamId }) {
    id(streamId);
    this.#state = { streamId, cursor: 0, tasks: new Map(), assignments: new Map(), definitionSources: new Set(), actions: new Map(), results: new Map() };
  }

  apply(command) {
    canonical(command); // Reject values that could change meaning during JSON persistence.
    shape(command, ['type', 'requestId', 'actor', 'payload'], ['taskId', 'expectedRevision']);
    id(command.type); id(command.requestId); shape(command.actor, ['kind', 'id']); id(command.actor.id);
    need(['user', 'agent', 'verifier'].includes(command.actor.kind), 'FORBIDDEN');
    const fingerprint = digest(command), known = this.#requests.get(command.requestId);
    if (known) {
      need(known.fingerprint === fingerprint, 'REQUEST_REUSED');
      return copy(known.receipt);
    }
    const draft = copy(this.#state), sequence = draft.cursor + 1;
    const output = this.#execute(draft, copy(command), sequence);
    draft.cursor = sequence;
    const receipt = { streamId: draft.streamId, cursor: sequence, requestId: command.requestId, ...output };
    const event = { sequence, command: copy(command), receipt: copy(receipt) };
    // One synchronous publication boundary; failed commands publish nothing.
    this.#state = draft;
    this.#journal.push(event);
    this.#requests.set(command.requestId, { fingerprint, receipt });
    return copy(receipt);
  }

  #execute(state, command, sequence) {
    const { type, actor, payload } = command;
    if (type === 'createTask') {
      roles(actor, ['user']);
      need(!Object.hasOwn(command, 'taskId') && !Object.hasOwn(command, 'expectedRevision'), 'INVALID_INPUT');
      shape(payload, ['sourceId', 'spec', 'requiresAcceptance'], ['reissueOf', 'relatedTaskId']);
      id(payload.sourceId); const definition = spec(payload.spec); bool(payload.requiresAcceptance);
      const identity = digest({ actor, payload });
      const assignment = state.assignments.get(payload.sourceId);
      if (assignment) {
        need(assignment.identity === identity, 'SOURCE_REUSED');
        return { taskId: assignment.taskId, revision: state.tasks.get(assignment.taskId).revision };
      }
      need(!state.definitionSources.has(payload.sourceId), 'SOURCE_REUSED');
      if (payload.reissueOf !== undefined) {
        id(payload.reissueOf);
        need(state.tasks.get(payload.reissueOf)?.status === 'cancelled', 'REISSUE_REQUIRES_CANCELLED');
      }
      if (payload.relatedTaskId !== undefined) { id(payload.relatedTaskId); need(state.tasks.has(payload.relatedTaskId), 'TASK_NOT_FOUND'); }
      const duplicate = [...state.tasks.values()].find(task => task.status !== 'cancelled' && goalKey(task.spec) === goalKey(definition));
      need(!duplicate, 'DUPLICATE_TASK', 'Bind the existing task instead of creating another');
      const cancelled = [...state.tasks.values()].some(task => task.status === 'cancelled' && goalKey(task.spec) === goalKey(definition));
      need(!cancelled || payload.reissueOf !== undefined, 'REISSUE_LINK_REQUIRED');
      const task = { id: `task:${sequence}`, sourceId: payload.sourceId, spec: definition, specVersion: 1, revision: 1,
        status: 'open', paused: false, requiresAcceptance: payload.requiresAcceptance,
        reissueOf: payload.reissueOf ?? null, relatedTaskId: payload.relatedTaskId ?? null,
        authorization: { sourceId: payload.sourceId, active: true, revision: 1 },
        attempts: [], reports: [], completions: [], completionId: null, results: [], acceptances: [], acceptanceRevision: 0,
        problems: [], notes: [] };
      state.tasks.set(task.id, task); state.assignments.set(payload.sourceId, { identity, taskId: task.id });
      state.definitionSources.add(payload.sourceId);
      return { taskId: task.id, revision: task.revision };
    }
    id(command.taskId); const task = state.tasks.get(command.taskId);
    need(task, 'TASK_NOT_FOUND');
    // Acceptance uses only the result/validity/acceptance version displayed by
    // the user, not unrelated note or attempt revisions.
    if (type === 'acceptResult') {
      need(!Object.hasOwn(command, 'expectedRevision'), 'INVALID_INPUT');
    } else {
      integer(command.expectedRevision, 1);
      need(command.expectedRevision === task.revision, 'REVISION_CONFLICT');
    }
    let output = {};
    switch (type) {
      case 'beginAttempt': {
        roles(actor, ['user', 'agent']); shape(payload, ['host', 'sessionId']); id(payload.sessionId);
        need(['dsh', 'codex', 'claude-code'].includes(payload.host), 'INVALID_INPUT');
        need(task.status === 'open' && !task.paused && task.authorization.active, 'TASK_NOT_EXECUTABLE');
        const attempt = { id: `attempt:${sequence}`, host: payload.host, sessionId: payload.sessionId, actorId: actor.id };
        task.attempts.push(attempt); output.attemptId = attempt.id; break;
      }
      case 'report': {
        roles(actor, ['agent', 'user']); shape(payload, ['attemptId', 'summary']); text(payload.summary);
        const attempt = task.attempts.find(item => item.id === payload.attemptId);
        need(attempt && attempt.actorId === actor.id, 'FORBIDDEN');
        task.reports.push({ id: `report:${sequence}`, ...payload }); break;
      }
      case 'note': {
        roles(actor, ['user', 'agent']); shape(payload, ['text']); text(payload.text);
        task.notes.push({ actor: copy(actor), text: payload.text }); break;
      }
      case 'pause': {
        roles(actor, ['user']); shape(payload, ['paused']); bool(payload.paused);
        need(task.status === 'open', 'TASK_NOT_EXECUTABLE'); task.paused = payload.paused;
        if (task.paused) abortReservations(state, task); break;
      }
      case 'cancel': {
        roles(actor, ['user']); shape(payload, ['reason']); text(payload.reason);
        need(task.status !== 'completed' && task.status !== 'cancelled', 'INVALID_TRANSITION');
        task.status = 'cancelled'; task.authorization.active = false; task.authorization.revision++;
        task.problems.push({ kind: 'cancelled', reason: payload.reason, sequence }); abortReservations(state, task); break;
      }
      case 'authorize': {
        roles(actor, ['user']); shape(payload, ['sourceId', 'active']); id(payload.sourceId); bool(payload.active);
        need(task.status !== 'cancelled' && task.status !== 'completed', 'INVALID_TRANSITION');
        task.authorization = { sourceId: payload.sourceId, active: payload.active, revision: task.authorization.revision + 1 };
        // Every replacement grant invalidates unsent reservations of the old
        // authorization revision, including active-to-active replacement.
        abortReservations(state, task); break;
      }
      case 'reviseTask': {
        roles(actor, ['user']); shape(payload, ['spec', 'sourceId']); id(payload.sourceId);
        need(task.status === 'open' && ![...state.actions.values()].some(action => action.taskId === task.id && activeAction(action)), 'INVALID_TRANSITION');
        const definition = spec(payload.spec);
        need(!state.definitionSources.has(payload.sourceId), 'SOURCE_REUSED');
        need(goalKey(definition) !== goalKey(task.spec), 'UNCHANGED_SPEC');
        need(![...state.tasks.values()].some(other => other.id !== task.id && other.status !== 'cancelled' && goalKey(other.spec) === goalKey(definition)), 'DUPLICATE_TASK');
        task.spec = definition; task.specVersion++;
        state.definitionSources.add(payload.sourceId);
        task.authorization = { sourceId: payload.sourceId, active: true, revision: task.authorization.revision + 1 }; break;
      }
      case 'verifyCompletion': {
        roles(actor, ['verifier']); shape(payload, ['evidence']);
        need(task.status === 'open' || task.status === 'completed', 'INVALID_TRANSITION');
        output.completionId = complete(state, task, evidence(payload.evidence, task.spec), sequence).id;
        abortReservations(state, task); break;
      }
      case 'withdrawCompletion': {
        roles(actor, ['verifier']); shape(payload, ['completionId', 'reason']); text(payload.reason);
        const completed = currentCompletion(task);
        need(completed && completed.id === payload.completionId && task.status === 'completed', 'INVALID_TRANSITION');
        completed.valid = false; completed.withdrawal = { reason: payload.reason, sequence };
        for (const action of state.actions.values()) {
          if (action.status !== 'succeeded' || goalKey(action.spec) !== goalKey(task.spec) || action.evidence?.mergeSha !== completed.evidence.mergeSha) continue;
          action.corrections ??= [];
          action.corrections.push({ previousStatus: 'succeeded', completionId: completed.id, reason: payload.reason, sequence });
          // Disproving success does not prove the sender terminated. Keep the
          // resource occupied until a fresh trusted terminal result resolves it.
          action.status = 'unknown'; action.evidenceValid = false;
          if (action.taskId !== task.id) state.tasks.get(action.taskId).revision++;
        }
        task.status = 'disputed'; task.problems.push({ kind: 'wrong-completion', reason: payload.reason, sequence }); break;
      }
      case 'resolveDispute': {
        roles(actor, ['verifier']); shape(payload, ['conclusion', 'reference'], ['evidence']); id(payload.reference);
        need(task.status === 'disputed', 'INVALID_TRANSITION');
        if (payload.conclusion === 'met') output.completionId = complete(state, task, evidence(payload.evidence, task.spec), sequence).id;
        else {
          need(payload.conclusion === 'unmet' && !Object.hasOwn(payload, 'evidence'), 'INVALID_INPUT');
          task.status = 'open'; task.completionId = null;
        }
        task.problems.push({ kind: 'dispute-resolved', conclusion: payload.conclusion, reference: payload.reference, sequence }); break;
      }
      case 'markUnavailable': {
        roles(actor, ['verifier']); shape(payload, ['resultId', 'reference']); id(payload.reference);
        const result = task.results.find(item => item.id === payload.resultId); need(result, 'RESULT_NOT_FOUND');
        result.available = false; result.availabilityRevision++;
        for (const other of state.tasks.values()) if (other.id !== task.id && other.results.some(item => item.id === result.id)) other.revision++;
        task.problems.push({ kind: 'result-unavailable', resultId: result.id, reference: payload.reference, sequence }); break;
      }
      case 'acceptResult': {
        roles(actor, ['user']); shape(payload, ['token'], ['reuseAcceptanceId']); validateToken(payload.token);
        const current = tokenFor(task, state.streamId);
        need(canonical(payload.token) === canonical(current), 'ACCEPTANCE_CONFLICT');
        need(task.requiresAcceptance, 'ACCEPTANCE_NOT_REQUIRED');
        if (payload.reuseAcceptanceId !== undefined) {
          id(payload.reuseAcceptanceId);
          const old = task.acceptances.find(item => item.id === payload.reuseAcceptanceId);
          need(old && old.resultId === current.resultId && old.specVersion === current.specVersion && old.actorId === actor.id, 'ACCEPTANCE_REUSE_MISMATCH');
        }
        const accepted = { id: `acceptance:${sequence}`, ...current, actorId: actor.id, sequence, reuseAcceptanceId: payload.reuseAcceptanceId ?? null };
        task.acceptances.push(accepted); task.acceptanceRevision++; output.acceptanceId = accepted.id; break;
      }
      case 'reserveAction': {
        roles(actor, ['agent', 'user']); shape(payload, ['attemptId', 'connected']); bool(payload.connected);
        const attempt = task.attempts.find(item => item.id === payload.attemptId);
        need(attempt?.actorId === actor.id, 'FORBIDDEN');
        const decision = actionDecision(state, task, payload.connected, command.expectedRevision);
        need(decision.decision === 'allow', 'ACTION_BLOCKED', decision.reason);
        const action = { id: `action:${sequence}`, taskId: task.id, attemptId: attempt.id, actorId: actor.id,
          spec: copy(task.spec), specVersion: task.specVersion, authorizationRevision: task.authorization.revision,
          status: 'reserved' };
        state.actions.set(action.id, action); output.actionId = action.id; break;
      }
      case 'dispatchAction': {
        roles(actor, ['agent', 'user']); shape(payload, ['actionId', 'connected']); bool(payload.connected);
        const action = state.actions.get(payload.actionId);
        need(action && action.taskId === task.id && action.actorId === actor.id, 'FORBIDDEN');
        need(payload.connected && action.status === 'reserved' && task.status === 'open' && !task.paused
          && task.authorization.active && action.authorizationRevision === task.authorization.revision
          && action.specVersion === task.specVersion, 'ACTION_BLOCKED');
        // A correction can revive another task's unresolved action after this
        // reservation was granted. Recheck shared occupancy at final admission.
        need(![...state.actions.values()].some(other => other.id !== action.id && activeAction(other)
          && resourceKey(other.spec) === resourceKey(action.spec)), 'ACTION_BLOCKED');
        action.status = 'sent'; break;
      }
      case 'resolveAction': {
        shape(payload, ['actionId', 'outcome'], ['evidence', 'proof']);
        const action = state.actions.get(payload.actionId);
        need(action && action.taskId === task.id && ['sent', 'unknown'].includes(action.status), 'INVALID_TRANSITION');
        if (payload.outcome === 'unknown') {
          roles(actor, ['agent', 'user', 'verifier']);
          need(actor.kind === 'verifier' || actor.id === action.actorId, 'FORBIDDEN');
          need(!Object.hasOwn(payload, 'evidence') && !Object.hasOwn(payload, 'proof'), 'INVALID_INPUT'); action.status = 'unknown';
        } else if (payload.outcome === 'succeeded') {
          roles(actor, ['verifier']); need(!Object.hasOwn(payload, 'proof'), 'INVALID_INPUT');
          const observed = evidence(payload.evidence, action.spec);
          action.status = 'succeeded'; action.evidence = observed; action.evidenceValid = true;
          if (task.status !== 'cancelled' && task.status !== 'disputed' && task.specVersion === action.specVersion) {
            output.completionId = complete(state, task, observed, sequence).id; abortReservations(state, task);
          }
        } else {
          roles(actor, ['verifier']); need(payload.outcome === 'not_applied' && !Object.hasOwn(payload, 'evidence'), 'INVALID_INPUT');
          shape(payload.proof, ['senderTerminated', 'notApplied', 'reference']); id(payload.proof.reference);
          need(payload.proof.senderTerminated === true && payload.proof.notApplied === true, 'TERMINAL_PROOF_REQUIRED');
          action.status = 'not_applied'; action.proof = copy(payload.proof);
        }
        break;
      }
      default: fail('UNKNOWN_COMMAND');
    }
    task.revision++;
    return { taskId: task.id, revision: task.revision, ...output };
  }

  task(taskId) { const task = this.#state.tasks.get(taskId); need(task, 'TASK_NOT_FOUND'); return copy(task); }
  action(actionId) { const action = this.#state.actions.get(actionId); need(action, 'ACTION_NOT_FOUND'); return copy(action); }
  acceptanceToken(taskId) { return copy(tokenFor(this.task(taskId), this.#state.streamId)); }
  checkAction(taskId, options) {
    shape(options, ['connected', 'expectedRevision']); bool(options.connected); integer(options.expectedRevision, 1);
    return copy(actionDecision(this.#state, this.task(taskId), options.connected, options.expectedRevision));
  }
  dependency(taskId, kind) {
    const task = this.task(taskId), completed = currentCompletion(task), result = currentResult(task);
    if (kind === 'historical-completion') return Boolean(completed);
    if (kind === 'current-result') return Boolean(completed && result?.available);
    need(kind === 'current-acceptance', 'INVALID_INPUT');
    return Boolean(completed && result?.available && task.acceptances.some(item => item.completionId === completed.id
      && item.resultId === result.id && item.availabilityRevision === result.availabilityRevision));
  }
  snapshot() {
    const body = { schemaVersion: 1, streamId: this.#state.streamId, cursor: this.#state.cursor,
      tasks: [...this.#state.tasks.values()], actions: [...this.#state.actions.values()] };
    return copy({ ...body, digest: digest(body) });
  }
  eventsSince(cursor) {
    integer(cursor); need(cursor <= this.#state.cursor, 'CURSOR_AHEAD');
    return { streamId: this.#state.streamId, fromCursor: cursor, cursor: this.#state.cursor, events: copy(this.#journal.slice(cursor)) };
  }
  journal() { return { schemaVersion: 1, streamId: this.#state.streamId, events: copy(this.#journal) }; }
  static replay(journal) {
    shape(journal, ['schemaVersion', 'streamId', 'events']); need(journal.schemaVersion === 1 && Array.isArray(journal.events), 'INVALID_JOURNAL');
    const kernel = new RecordKernel({ streamId: journal.streamId });
    for (const [index, event] of journal.events.entries()) {
      shape(event, ['sequence', 'command', 'receipt']); need(event.sequence === index + 1, 'EVENT_GAP');
      const receipt = kernel.apply(event.command);
      need(receipt.cursor === event.sequence && canonical(receipt) === canonical(event.receipt), 'INVALID_JOURNAL');
    }
    return kernel;
  }
}

// A cache may only adopt snapshots for the same stream incarnation. A digest
// detects accidental corruption; it is not an authentication mechanism.
export function installSnapshot(current, incoming) {
  function validate(snapshot) {
    shape(snapshot, ['schemaVersion', 'streamId', 'cursor', 'tasks', 'actions', 'digest']);
    const { digest: hash, ...body } = snapshot;
    need(body.schemaVersion === 1 && Array.isArray(body.tasks) && Array.isArray(body.actions), 'INVALID_SNAPSHOT');
    id(body.streamId); integer(body.cursor); need(hash === digest(body), 'INVALID_SNAPSHOT');
  }
  validate(incoming);
  if (current === null) return copy(incoming);
  validate(current); need(current.streamId === incoming.streamId, 'STREAM_MISMATCH');
  if (incoming.cursor < current.cursor) return copy(current);
  if (incoming.cursor === current.cursor) need(incoming.digest === current.digest, 'SNAPSHOT_CONFLICT');
  return copy(incoming);
}
