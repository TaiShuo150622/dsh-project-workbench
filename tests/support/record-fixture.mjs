import { RecordKernel } from '../../record/kernel.mjs';

export const USER = { kind: 'user', id: 'owner' };
export const AGENT = { kind: 'agent', id: 'session-a' };
export const VERIFIER = { kind: 'verifier', id: 'github-observer' };
export const SOURCE = '1'.repeat(40), BASE = '2'.repeat(40), MERGE = '3'.repeat(40);
export const definition = (overrides = {}) => ({ kind: 'pull_request_merge', repositoryId: 'repo-1', pullRequestId: 'pr-1',
  targetRef: 'refs/heads/pilot', sourceSha: SOURCE, mergeMethod: 'merge', ...overrides });
export function observation(overrides = {}) {
  return { provider: 'github', repositoryId: 'repo-1', pullRequestId: 'pr-1', targetRef: 'refs/heads/pilot',
    sourceSha: SOURCE, mergeMethod: 'merge', merged: true, mergeSha: MERGE, parents: [BASE, SOURCE], observationRef: 'github:observation-1', ...overrides };
}
export function fixture(options = {}) {
  const kernel = new RecordKernel({ streamId: options.streamId ?? 'project-a:epoch-1' });
  let counter = 0;
  const create = (overrides = {}) => kernel.apply({ type: 'createTask', requestId: `request:${++counter}`, actor: USER,
    payload: { sourceId: `assignment:${counter}`, spec: definition(), requiresAcceptance: true, ...overrides } });
  const taskId = create(options.task).taskId;
  const command = (type, payload, actor = USER, target = taskId, extra = {}) => ({ type, payload, actor,
    requestId: `request:${++counter}`, taskId: target,
    ...(type === 'acceptResult' ? {} : { expectedRevision: kernel.task(target).revision }), ...extra });
  const call = (...args) => kernel.apply(command(...args));
  const verify = (overrides = {}, target = taskId) => call('verifyCompletion', { evidence: observation(overrides) }, VERIFIER, target);
  const begin = (target = taskId, actor = AGENT) => call('beginAttempt', { host: 'dsh', sessionId: actor.id }, actor, target).attemptId;
  const reserve = (target = taskId, actor = AGENT) => call('reserveAction', { attemptId: begin(target, actor), connected: true }, actor, target).actionId;
  const send = (target = taskId, actor = AGENT) => { const actionId = reserve(target, actor); call('dispatchAction', { actionId, connected: true }, actor, target); return actionId; };
  const decision = (target = taskId, connected = true) => kernel.checkAction(target, { connected, expectedRevision: kernel.task(target).revision });
  return { kernel, taskId, create, command, call, verify, begin, reserve, send, decision };
}
