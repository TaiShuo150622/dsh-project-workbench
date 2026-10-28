import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './server/store.js';
import { Worktrees } from './server/worktrees.js';
import { Native } from './server/native.js';
import { Projects } from './server/projects.js';

export const inject = ['connection', 'tools', 'systemPrompt', 'sessionController', 'agents', 'permissionPresets', 'sandboxPolicy', 'sessionPersistence'];
export async function apply(ctx, config = {}) {
  const registered = JSON.parse(await readFile(new URL('./config/hyperparams.yaml', import.meta.url), 'utf8'));
  const limits = Object.fromEntries(Object.entries(registered).map(([key, item]) => [key, item.value]));
  const dataDir = config.dataDir || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'project-workbench');
  const store = await new Store(join(dataDir, 'projects.json')).open();
  const native = new Native(ctx), trees = new Worktrees(dataDir, limits);
  const projects = new Projects(store, native, trees, limits);
  await projects.recover();
  ctx.effect(() => () => { projects.closed = true; }, 'project-workbench: lifecycle');
  ctx.on('agent/status', ({ agent, status }) => {
    if (status === 'idle') void projects.onIdle(agent.id).catch(error => { projects.lastError = error.message; });
  });
  ctx.on('agent/error', ({ agent, error }) => {
    let owned; try { owned = projects.status(agent.id); } catch { return; }
    if (owned.lead === agent.id) return;
    void projects.report(agent.id, { outcome: 'failed', summary: String(error?.message || error).slice(0, limits.maxText) }).catch(() => {});
  });
  ctx.systemPrompt.context({ name: 'project-workbench:identity', order: ctx.systemPrompt.getContextOrder('TEAM_IDENTITY'), required: true,
    text: ({ agent }) => agent ? projects.context(agent.id) : '' });
  const string = description => ({ type: 'string', description });
  const required = description => ({ ...string(description), required: true });
  function tool(name, description, parameters, action) {
    ctx.tools.register({ name, description, parameters,
      output: { schema: { type: 'object', properties: { result: { type: 'string' } }, required: ['result'], additionalProperties: false }, render: (_args, value) => [{ type: 'text', text: value.result }] },
      async execute(args, exec) {
        if (!exec.agent || ctx.agents.get(exec.agent.id) !== exec.agent) throw Error('需要当前真实的 DSH 会话');
        exec.signal.throwIfAborted();
        return { result: JSON.stringify(await action(exec.agent.id, args, exec)) };
      },
    });
  }
  tool('project_threads', 'List the current project, repositories, and persistent work threads. Only available inside a project.', {}, actor => projects.status(actor));
  tool('project_dispatch', 'Project coordinator: automatically start a persistent DSH work thread, or continue an existing thread_id. Parallel work runs independently; results return automatically. Code uses an isolated Git worktree; research is read-only. Do not poll after dispatch.', {
    title: string('Short name for a new work thread'), task: required('Self-contained task or follow-up, including expected result'), thread_id: string('Existing thread ID to continue; omit to create'), mode: { type: 'string', enum: ['research', 'code'], description: 'code for any file edits, research for read-only work' }, repo_index: { type: 'integer', description: 'Zero-based index in project repositories' }, depends_on: { type: 'array', items: { type: 'string' }, description: 'Existing thread IDs that must report results before this starts' }, nodes: { type: 'array', items: { type: 'string' }, description: 'Optional DAG node IDs this work concerns' },
  }, (actor, args, exec) => projects.dispatch(actor, args, exec.callId || exec.id));
  tool('project_report', 'Work thread: report your result to the project coordinator. Include actual validation and artifacts. review means ready for human review, not accepted or merged. Use waiting_user only for a genuine blocker.', {
    summary: required('Result, evidence, actual checks, and artifacts'), outcome: { type: 'string', enum: ['review', 'waiting_user', 'failed'], description: 'Default review' },
  }, (actor, args) => projects.report(actor, args));
  tool('project_read_thread', 'Read recent messages of a thread within this project. This does not start or interrupt work.', { thread_id: required('Project thread ID') }, (actor, args) => projects.read(actor, args.thread_id));

  const endpoints = ['list', 'create', 'join', 'action', 'diff', 'health'];
  for (const endpoint of endpoints) ctx.connection.fetch.register({ path: `/api/project-workbench/${endpoint}`, methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return new Response('JSON required', { status: 415 });
      let body; try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (body?.type !== 'client-request' || typeof body.rpcId !== 'string' || body.method !== `project-workbench/${endpoint}`) return new Response('Invalid RPC envelope', { status: 400 });
      let result;
      try {
        const args = body.payload || {};
        let value;
        if (endpoint === 'list') value = { projects: projects.list(), deliveryErrors: store.state.outbox.filter(m => m.error).map(m => ({ id: m.id, projectId: m.projectId, error: m.error })), error: projects.lastError || '' };
        if (endpoint === 'create') value = await projects.create(args);
        if (endpoint === 'join') value = await projects.join(args.projectId, args.sessionId);
        if (endpoint === 'action') value = await projects.action(args.projectId, args.threadId, args.action);
        if (endpoint === 'diff') {
          const p = store.state.projects.find(p => p.id === args.projectId);
          const t = p?.threads.find(t => t.id === args.threadId);
          if (!t) throw Error('线程不属于此项目');
          value = await trees.diff(t);
        }
        if (endpoint === 'health') value = { ready: true, version: '0.1.0', limits };
        result = { ok: true, value: value ?? null };
      } catch (error) { result = { ok: false, error: { message: error.message } }; }
      return Response.json({ type: 'server-response', rpcId: body.rpcId, result });
    },
  });
}
