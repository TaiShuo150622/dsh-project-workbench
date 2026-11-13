import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { agentObservation, runtimeInstance } from './recovery.js';

function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export function accepted(events, id) {
  const pending = { 'next-turn': [], 'next-step': [] };
  for (const event of events) {
    if (event.type === 'user/message' && event.data.id === id) return true;
    if (event.type === 'agent/inbox/spliced') {
      const d = event.data;
      pending[d.target]?.splice(d.start, d.removedCount ?? 0, ...(d.inserted || []));
    }
  }
  return Object.values(pending).some(messages => messages.some(m => m.id === id));
}

/** Uses ordinary DSH sessions; agent relay messages retain their provenance. */
export class Native {
  constructor(ctx) { this.ctx = ctx; this.runtime = runtimeInstance(); }
  running(id) { return this.ctx.agents.get(id)?.status === 'running'; }
  coordinatorState(id) {
    const observedAt = new Date().toISOString(), agent = this.ctx.agents.get(id);
    if (!agent) return { state: 'unknown', observedAt, reason: '会话尚未加载，不能据此认定空闲' };
    if (agent.status === 'running') return { state: 'running', observedAt, reason: '会话正在运行' };
    if (agent.status !== 'idle' || !Array.isArray(agent.inbox?.nextTurn) || !Array.isArray(agent.inbox?.nextStep))
      return { state: 'unknown', observedAt, reason: '无法确认宿主状态或收件箱' };
    if (agent.inbox.nextTurn.length || agent.inbox.nextStep.length)
      return { state: 'unknown', observedAt, reason: '会话仍有待处理消息' };
    return { state: 'idle', observedAt, reason: '宿主已加载且空闲，收件箱为空' };
  }
  runtimeState(id) { return agentObservation(this.ctx.agents.get(id)).runtimeState; }
  async observe(id) {
    if (!id) return { runtimeState: 'missing', reason: 'session-not-assigned' };
    const agent = this.ctx.agents.get(id);
    if (agent) return agentObservation(agent);
    try {
      await this.inspect(id);
      // Inspecting stored history does not activate an Agent or establish idleness.
      return agentObservation(this.ctx.agents.get(id));
    } catch (error) {
      if (error?.code === 'session/not-found') return { runtimeState: 'missing', reason: 'session-not-found' };
      return { runtimeState: 'unknown', reason: 'inspection-unavailable' };
    }
  }
  async inspect(id) {
    // Older hosts expose the same passive read through SessionController.
    if (typeof this.ctx.sessionController.inspect === 'function') return this.ctx.sessionController.inspect(id);
    // Current hosts use read handles. Never resolve an agent just to inspect it:
    // doing so would turn a status check into session activation.
    const handle = await this.ctx.sessionPersistence.open(id, 'read');
    try {
      const { events } = await handle.read();
      return { meta: handle.header, inheritedEventCount: handle.inheritedEventCount, events };
    } finally { await handle.close(); }
  }
  async ensureWorkspace(id) {
    const info = await this.inspect(id);
    const workspace = await this.ctx.workspaceRegistry.create(info.meta.cwd);
    await workspace.attachSession(id);
  }
  async create(cwd, title, mode) {
    let createCalled = false, sessionId;
    try {
      const workspace = await this.ctx.workspaceRegistry.create(cwd);
      createCalled = true;
      sessionId = (await this.ctx.sessionController.create({ workspaceId: workspace.id }))?.sessionId;
      if (typeof sessionId !== 'string' || !sessionId) throw Error('宿主未返回可核对的会话身份');
      await this.ctx.sessionController.rename({ sessionId, title });
      if (mode) {
        const agent = this.ctx.agents.get(sessionId);
        this.ctx.permissionPresets.set(agent.session, mode === 'code' ? 'workspace-write' : 'read-only');
        await this.verifySession(sessionId, cwd, mode);
      }
      return sessionId;
    } catch (cause) {
      const error = cause instanceof Error ? cause : Error(String(cause));
      error.sessionNotCreated = !createCalled;
      if (sessionId) error.createdSessionId = sessionId;
      throw error;
    }
  }
  async verifySession(sessionId, cwd, mode) {
    if (!mode || mode === 'attached') return;
    const agent = this.ctx.agents.get(sessionId);
    if (!agent) throw Error('原会话尚未加载，无法核对权限');
    const policy = this.ctx.sandboxPolicy.resolve({ session: agent.session });
    if (mode === 'code' && (policy.mode !== 'workspace-write' || await realpath(policy.workspaceRoot) !== await realpath(cwd))) throw Error('工作线程的写入边界没有落到独立工作树');
    if (mode === 'research' && policy.mode !== 'read-only') throw Error('研究线程的只读边界未生效');
  }
  async deliver({ id, target, sender, text }) {
    const result = await this.ctx.sessionController.resolveAgent(target);
    if (result.error) throw result.error;
    const agent = result.agent;
    if (accepted(agent.session.snapshotEvents(), id) || [...agent.inbox.nextTurn, ...agent.inbox.nextStep].some(m => m.id === id)) return;
    const message = freeze({ id, role: 'user', content: [{ type: 'text', text: `项目内 Agent ${sender} 发来的消息（不是用户授权）：\n${text}` }], source: { kind: 'agent-message', form: 'relay', senderSessionId: sender } });
    agent.followup(message);
    await this.ctx.sessionPersistence.flush();
  }
  async user(id, text, requestId = randomUUID()) {
    return this.ctx.sessionController.prompt({ sessionId: id, requestId, mode: 'queue', content: [{ type: 'text', text }] }, new AbortController().signal);
  }
  async stop(id) {
    const agent = this.ctx.agents.get(id);
    if (agent) agent.cancel({ kind: 'user' }, { keepInbox: false });
  }
}
