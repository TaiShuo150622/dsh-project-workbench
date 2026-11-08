import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const expectedInputs = {
  'inputs/native.mjs': '0b5ba4a2cad4e301273f499e0a91a27661d740781118d8e4897cb08a2b6b4400',
  'inputs/projects.mjs': '565ab91d3c9cba7e1d171844d719ee04d4a6f4288673e073143f1454c7839713',
};
const manifestBytes = await readFile(new URL('./input-manifest.json', import.meta.url));
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.source_commit, '7264be10387963f4d575d8688ed8573f4c16c8c4');
for (const [path, hash] of Object.entries(expectedInputs)) {
  assert.equal(sha256(await readFile(new URL(path, import.meta.url))), hash, path);
  assert.equal(manifest.files.find(item => item.copied_path === path)?.sha256, hash);
}
// Only these byte-verified research copies are imported. No product runtime is started.
const { Native, accepted } = await import('./inputs/native.mjs');
const { Projects } = await import('./inputs/projects.mjs');

const clone = value => structuredClone(value);

// "retainedEvents" is a synthetic memory array, NOT a disk or actual DSH receipt.
class FakeHost {
  constructor(target, mode, trace) {
    Object.assign(this, { target, mode, trace, liveEvents: [], retainedEvents: [], followupCalls: 0, flushCalls: 0 });
    this.agent = {
      status: 'running',
      session: { snapshotEvents: () => clone(this.liveEvents) },
      inbox: { nextTurn: [], nextStep: [] },
      followup: message => {
        this.followupCalls++;
        const start = this.agent.inbox.nextTurn.length;
        this.agent.inbox.nextTurn.push(message);
        this.liveEvents.push({ type: 'agent/inbox/spliced', data: { target: 'next-turn', start, inserted: [message] } });
        this.trace.push({ step: 'fake.followup.live_publish', messageId: message.id });
      },
    };
    this.context = {
      sessionController: {
        resolveAgent: async targetId => {
          assert.equal(targetId, this.target, 'unexpected target');
          this.trace.push({ step: 'fake.resolveAgent', target: targetId });
          return { agent: this.agent };
        },
      },
      sessionPersistence: {
        flush: async () => {
          this.flushCalls++;
          this.trace.push({ step: 'fake.persistence.flush', mode: this.mode });
          if (this.mode === 'target_no_commit') {
            throw new AggregateError([new Error('synthetic target writer failed before commit')], 'synthetic flush failed: target writer');
          }
          this.retainedEvents = clone(this.liveEvents);
          this.trace.push({ step: 'fake.target_prefix.retained' });
          if (this.mode === 'other_writer_failure') {
            throw new AggregateError([new Error('synthetic other writer failed')], 'synthetic flush failed: other writer');
          }
          assert.equal(this.mode, 'success', 'unknown fake mode');
        },
      },
    };
  }
  retained(id) { return accepted(this.retainedEvents, id); }
  live(id) { return accepted(this.liveEvents, id); }
  forgetVolatileOnly() {
    this.liveEvents = [];
    this.agent.inbox.nextTurn = [];
    this.agent.inbox.nextStep = [];
    this.trace.push({ step: 'fake.memory_drop', note: 'logical operation only; no real process crash' });
  }
}

// Sequential in-memory callback holder. It does not emulate fsync, rename,
// real Store locking, power failure, or the real Store implementation.
class FakeStore {
  constructor(initial, failSentMarkerOnce, trace) {
    Object.assign(this, { state: clone(initial), retainedState: clone(initial), failSentMarkerOnce, trace, changeCalls: 0 });
  }
  snapshot() { return clone(this.state); }
  async change(fn) {
    this.changeCalls++;
    const next = clone(this.state);
    const value = await fn(next);
    const marksSent = next.outbox.some(item => item.sent && !this.state.outbox.find(old => old.id === item.id)?.sent);
    this.trace.push({ step: 'fake.store.change_attempt', marksSent });
    if (marksSent && this.failSentMarkerOnce) {
      this.failSentMarkerOnce = false;
      this.trace.push({ step: 'fake.store.fail_before_publish' });
      throw new Error('synthetic sent-marker write failed');
    }
    this.state = next;
    this.retainedState = clone(next);
    this.trace.push({ step: 'fake.store.commit', sent: next.outbox[0].sent, error: next.outbox[0].error });
    return clone(value);
  }
}

function fixture({ hostMode = 'success', workerTarget = false, failSentMarkerOnce = false } = {}) {
  const trace = [];
  const target = workerTarget ? 'synthetic-worker' : 'synthetic-lead';
  const message = { id: 'synthetic-relay-001', projectId: 'synthetic-project', sender: workerTarget ? 'synthetic-lead' : 'synthetic-worker', target, text: 'Synthetic probe payload only.', sent: false, error: '', created: '2026-11-08T00:00:00Z' };
  const state = { version: 1, projects: [{ id: message.projectId, lead: 'synthetic-lead', threads: workerTarget ? [{ id: 'synthetic-thread', sessionId: target, phase: 'running' }] : [] }], outbox: [message] };
  const store = new FakeStore(state, failSentMarkerOnce, trace);
  const host = new FakeHost(target, hostMode, trace);
  const native = new Native(host.context);
  const receiver = {
    store, native, closed: false, flushing: null,
    kick() { trace.push({ step: 'fake.kick.not_scheduled' }); },
  };
  return {
    store, host, native, message, trace,
    flush: () => Projects.prototype.flush.call(receiver),
    // The real retry_delivery branch clears errors. Its kick is deliberately
    // a recorded no-op; the probe explicitly invokes only the real flush.
    retryDelivery: () => Projects.prototype.action.call(receiver, message.projectId, null, 'retry_delivery'),
    observe: () => ({
      followupCalls: host.followupCalls, persistenceFlushCalls: host.flushCalls,
      liveAccepted: host.live(message.id), syntheticRetainedAcceptance: host.retained(message.id),
      outbox: store.snapshot().outbox[0], threads: store.snapshot().projects[0].threads,
    }),
  };
}

const probes = [];
async function probe(id, title, assumptions, body) {
  const record = { id, title, assumptions, assertions: [], observations: {}, trace: [], status: 'RUNNING' };
  const check = (condition, description) => {
    assert.ok(condition, description);
    record.assertions.push({ description, passed: true });
  };
  try {
    await body(record, check);
    record.status = 'PASS';
  } catch (error) {
    record.status = 'FAIL';
    record.error = { name: error.name, message: error.message };
    process.exitCode = 1;
  }
  probes.push(record);
}

await probe('RP01', 'Positive control: successful new delivery then durable duplicate', ['fake target flush succeeds and copies live events to retainedEvents'], async (r, check) => {
  const f = fixture();
  r.trace = f.trace;
  const first = await f.flush();
  check(first === undefined, 'Projects.flush fulfills normally');
  check(f.host.retained(f.message.id), 'fake target retains the message after successful flush');
  check(f.store.state.outbox[0].sent, 'real Projects.flush marks outbox sent');
  await f.native.deliver(f.message);
  check(f.host.followupCalls === 1 && f.host.flushCalls === 1, 'durable duplicate does not enqueue or flush again');
  r.observations = f.observe();
  r.method_receipts = ['Projects.flush fulfilled with undefined', 'Native.deliver duplicate fulfilled with undefined'];
});

await probe('RP02', 'Live-only same ID returns without persistence flush', ['a synthetic live inbox splice exists but retainedEvents is empty'], async (r, check) => {
  const f = fixture();
  r.trace = f.trace;
  f.host.agent.followup({ id: f.message.id, role: 'user', content: [{ type: 'text', text: 'Synthetic pre-existing live message.' }] });
  const before = f.host.followupCalls;
  await f.native.deliver(f.message);
  check(f.host.followupCalls === before, 'same ID suppresses a second followup');
  check(f.host.flushCalls === 0, 'live-ID early return does not invoke persistence.flush');
  check(!f.host.retained(f.message.id), 'method return does not make fake live-only acceptance retained');
  r.observations = f.observe();
  r.method_receipts = ['Native.deliver fulfilled with undefined'];
});

await probe('RP03', 'Target failure then same-ID lead relay retry can mark sent without retained acceptance', ['worker-to-lead relay has no matching worker thread gate', 'fake target fails before commit', 'no background or later successful drain is simulated', 'fake Store commits its marker independently'], async (r, check) => {
  const f = fixture({ hostMode: 'target_no_commit' });
  r.trace = f.trace;
  await f.flush();
  r.observations.after_first_attempt = f.observe();
  check(!f.store.state.outbox[0].sent && !!f.store.state.outbox[0].error, 'real flush catches delivery failure and records an unsent error');
  check(f.host.live(f.message.id) && !f.host.retained(f.message.id), 'live acceptance exists while target retained acceptance does not');
  await f.retryDelivery();
  check(f.store.state.outbox[0].error === '', 'real retry_delivery branch clears the outbox error');
  await f.flush();
  check(f.host.followupCalls === 1 && f.host.flushCalls === 1, 'same-ID retry skips both new followup and a second persistence barrier');
  check(f.store.state.outbox[0].sent, 'real flush marks sent after the duplicate branch returns');
  f.host.forgetVolatileOnly();
  check(!f.host.retained(f.message.id) && f.store.retainedState.outbox[0].sent, 'synthetic retained snapshots expose sent=true with no retained target message');
  r.observations.after_retry_and_fake_memory_drop = f.observe();
  r.method_receipts = ['first Projects.flush fulfilled after internal catch', 'Projects.action retry_delivery fulfilled', 'second Projects.flush fulfilled'];
});

await probe('RP04', 'Other writer failure does not imply target acceptance failed', ['fake flush first retains target events, then rejects for another synthetic writer'], async (r, check) => {
  const f = fixture({ hostMode: 'other_writer_failure' });
  r.trace = f.trace;
  await f.flush();
  r.observations.after_first_attempt = f.observe();
  check(f.host.retained(f.message.id), 'target prefix is retained despite service-wide flush rejection');
  check(!f.store.state.outbox[0].sent && !!f.store.state.outbox[0].error, 'real Projects.flush records the aggregate rejection as delivery error');
  await f.retryDelivery();
  await f.flush();
  check(f.store.state.outbox[0].sent && f.host.retained(f.message.id), 'same-ID retry can reconcile the local marker when target was retained');
  check(f.host.followupCalls === 1 && f.host.flushCalls === 1, 'retry does not enqueue another copy or repeat the failed global barrier');
  r.observations.after_retry = f.observe();
  r.method_receipts = ['first Projects.flush fulfilled after internal catch', 'retry_delivery and second flush fulfilled'];
});

await probe('RP05', 'Sent-marker failure is caught after target persistence succeeded', ['fake target flush succeeds', 'fake Store fails once before publishing sent=true', 'subsequent error-state change succeeds', 'worker target begins in running phase'], async (r, check) => {
  const f = fixture({ workerTarget: true, failSentMarkerOnce: true });
  r.trace = f.trace;
  await f.flush();
  const after = f.observe();
  check(after.syntheticRetainedAcceptance && after.persistenceFlushCalls === 1, 'target retains message before marker write fails');
  check(!after.outbox.sent && after.outbox.error === 'synthetic sent-marker write failed', 'catch records marker failure while sent stays false');
  check(after.threads[0].phase === 'failed', 'real catch transitions running worker to failed');
  check(after.threads[0].error.startsWith('消息尚未投递：'), 'displayed not-delivered wording is used even for marker-write failure');
  check(f.store.changeCalls === 2, 'marker attempt and error-state commit are distinct Store calls');
  r.observations = after;
  r.method_receipts = ['Projects.flush fulfilled after internal catch'];
});

const report = {
  schema_version: '1.0.0', probe_catalog: 'M07-RELAY-CONTROL-FLOW',
  executed_at_utc: new Date().toISOString(), node_version: process.version,
  actual_execution: true, execution_kind: 'fixed_source_methods_with_controlled_fakes',
  real_dsh_host_execution: false, real_persistence_execution: false,
  real_process_crash: false, real_network_send: false, business_effect_execution: false,
  source_commit: manifest.source_commit, input_manifest_sha256: sha256(manifestBytes),
  source_sha256: expectedInputs, probe_source_sha256: sha256(await readFile(new URL('./run-probes.mjs', import.meta.url))),
  simulated_interfaces: {
    host: 'resolveAgent, snapshotEvents, inbox and followup with only in-memory arrays',
    persistence: 'success, target-before-commit failure, or target-success/other-writer failure; retainedEvents is synthetic memory',
    store: 'sequential clone/callback/publish, with optional sent-marker failure; retainedState is synthetic memory',
    scheduling: 'kick only records an event; no agent driver, background drain or actual task execution',
  },
  limitations: [
    'No actual DSH implementation, filesystem durability mechanism, process crash or external effect is executed.',
    'Fake persistence implements declared conditions from M06; it does not reproduce all JSONL concurrency, rollback or background flush behavior.',
    'Only Native.deliver and Projects.flush/retry_delivery control flow is exercised from fixed unmodified source copies.',
    'PASS means the stated conditional branch assertions held, not that production delivery succeeded or a real loss incident was reproduced.',
  ],
  summary: { total: probes.length, passed: probes.filter(p => p.status === 'PASS').length, failed: probes.filter(p => p.status === 'FAIL').length },
  probes,
};
await writeFile(new URL('./results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ actual_execution: true, execution_kind: report.execution_kind, ...report.summary, real_dsh_host_execution: false }));

