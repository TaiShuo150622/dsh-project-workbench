import { randomUUID } from 'node:crypto';

const INSTANCE = Symbol.for('dsh-project-workbench.runtime-instance');
const STATES = new Set(['running', 'idle', 'missing', 'unknown']);
const REASONS = new Set(['agent-running', 'agent-idle', 'pending-input', 'agent-state-unavailable', 'session-not-assigned', 'session-not-found', 'session-not-loaded', 'inspection-unavailable', 'task-changed-during-check']);

/** One anonymous identity per Node process, also stable across plugin hot reloads. */
export function runtimeInstance() {
  if (!globalThis[INSTANCE]) globalThis[INSTANCE] = Object.freeze({
    id: randomUUID(), startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    platform: process.platform, arch: process.arch,
  });
  return { ...globalThis[INSTANCE] };
}

export function agentObservation(agent) {
  if (!agent) return { runtimeState: 'unknown', reason: 'session-not-loaded' };
  if (agent.status === 'running') return { runtimeState: 'running', reason: 'agent-running' };
  if (agent.status !== 'idle') return { runtimeState: 'unknown', reason: 'agent-state-unavailable' };
  if (!Array.isArray(agent.inbox?.nextTurn) || !Array.isArray(agent.inbox?.nextStep)) return { runtimeState: 'unknown', reason: 'agent-state-unavailable' };
  if (agent.inbox.nextTurn.length || agent.inbox.nextStep.length) return { runtimeState: 'unknown', reason: 'pending-input' };
  return { runtimeState: 'idle', reason: 'agent-idle' };
}

export function currentRuntimeState(native, sessionId) {
  if (!sessionId) return 'missing';
  // A boolean false cannot establish that a persisted/cold Agent is idle.
  if (typeof native.runtimeState === 'function') {
    const value = native.runtimeState(sessionId);
    return STATES.has(value) ? value : 'unknown';
  }
  return native.running(sessionId) ? 'running' : 'unknown';
}

export async function observeSession(native, sessionId) {
  if (!sessionId) return { runtimeState: 'missing', reason: 'session-not-assigned' };
  try {
    const value = await native.observe(sessionId);
    return {
      runtimeState: STATES.has(value?.runtimeState) ? value.runtimeState : 'unknown',
      reason: REASONS.has(value?.reason) ? value.reason : 'inspection-unavailable',
    };
  } catch { return { runtimeState: 'unknown', reason: 'inspection-unavailable' }; }
}

function publicRuntime(native) {
  const { id, startedAt, platform, arch } = native.runtime || runtimeInstance();
  return { id, startedAt, platform, arch };
}

export function unstartedHeldTask(thread) {
  // Start persists `starting` before creating a worktree/session. Only an untouched
  // first-generation queue entry can be resumed without an existing runtime identity.
  return thread.phase === 'queued' && thread.recoveryHold === true && !thread.sessionId
    && thread.generation === 1 && !thread.startAttempted && !thread.worktree && !thread.cwd
    && !thread.summary && !thread.reportedGeneration;
}

export function continuePhase(thread) {
  return ['failed', 'interrupted', 'stopped'].includes(thread.phase)
    || (thread.recoveryHold && ['queued', 'starting', 'running'].includes(thread.phase));
}

export function resumableCreation(thread) {
  const creation = thread.creationRecovery;
  return thread.phase === 'failed' && thread.recoveryHold === true && !thread.sessionId
    && creation?.sessionState === 'not-created'
    && ['not-created', 'not-needed', 'ready'].includes(creation.worktreeState);
}

export function queuedFollowup(thread) {
  return thread.recoveryHold === true && thread.followups?.length > 0
    && ['review', 'completed', 'waiting_user'].includes(thread.phase);
}

export function checkedThread(project, thread, native) {
  if (!project.recovery?.checkedAt || project.recovery.runtime?.id !== publicRuntime(native).id) return null;
  return project.recovery.threads?.find(row => row.threadId === thread.id
    && row.sessionId === (thread.sessionId || null) && row.generation === (thread.generation || 0)) || null;
}

export async function observeProject(native, project) {
  const runtime = publicRuntime(native);
  const lead = { sessionId: project.lead, ...await observeSession(native, project.lead) };
  const threads = [];
  for (const thread of project.threads) threads.push({
    threadId: thread.id, sessionId: thread.sessionId || null, generation: thread.generation || 0,
    ...await observeSession(native, thread.sessionId),
  });
  return { checkedAt: new Date().toISOString(), runtime: { ...runtime }, lead, threads };
}

export function recoveryView(project, native) {
  const currentRuntime = publicRuntime(native);
  const saved = project.recovery;
  let reason = !saved ? 'not-checked' : saved.runtime?.id !== currentRuntime.id ? 'runtime-changed' : '';
  if (saved && !reason) {
    if (saved.lead?.sessionId !== project.lead || observationChanged(saved.lead.runtimeState, currentRuntimeState(native, project.lead))) reason = 'observation-changed';
    if (saved.threads?.length !== project.threads.length || project.threads.some(thread => {
      const row = saved.threads?.find(row => row.threadId === thread.id);
      return !row || row.sessionId !== (thread.sessionId || null) || row.generation !== (thread.generation || 0)
        || observationChanged(row.runtimeState, currentRuntimeState(native, thread.sessionId));
    })) reason = 'observation-changed';
  }
  return { ...(saved || { checkedAt: null, runtime: null, lead: null, threads: [] }), runtime: saved?.runtime ? publicRuntime({ runtime: saved.runtime }) : null, currentRuntime, stale: !!reason, staleReason: reason };
}

function observationChanged(saved, current) {
  // A cold registry cannot contradict an explicit read-only not-found response.
  return saved !== current && !(saved === 'missing' && current === 'unknown');
}

export function isRecoveryHeld(message, thread) {
  return Boolean(message?.recoveryHold || thread?.recoveryHold);
}

export async function requireIdle(native, sessionId) {
  const observed = await observeSession(native, sessionId);
  if (observed.runtimeState !== 'idle' || currentRuntimeState(native, sessionId) !== 'idle') {
    throw Error(observed.runtimeState === 'running' ? '原任务仍在运行，不能重复派发。' : '无法确认原任务已空闲，请先核对原任务状态。');
  }
  return observed;
}
