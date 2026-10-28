import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';

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
  constructor(ctx) { this.ctx = ctx; }
  running(id) { return this.ctx.agents.get(id)?.status === 'running'; }
  async inspect(id) { return this.ctx.sessionController.inspect(id); }
  async create(cwd, title, mode) {
    const { sessionId } = await this.ctx.sessionController.create({ cwd });
    await this.ctx.sessionController.rename({ sessionId, title });
    if (mode) {
      const agent = this.ctx.agents.get(sessionId);
      this.ctx.permissionPresets.set(agent.session, mode === 'code' ? 'workspace-write' : 'read-only');
      const policy = this.ctx.sandboxPolicy.resolve({ session: agent.session });
      if (mode === 'code' && (policy.mode !== 'workspace-write' || await realpath(policy.workspaceRoot) !== await realpath(cwd))) throw Error('工作线程的写入边界没有落到独立工作树');
      if (mode === 'research' && policy.mode !== 'read-only') throw Error('研究线程的只读边界未生效');
    }
    return sessionId;
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
