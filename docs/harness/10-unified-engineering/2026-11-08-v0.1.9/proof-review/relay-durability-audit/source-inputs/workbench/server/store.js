import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

/** All project mutations share one durable transaction queue. Session transcripts stay with DSH. */
export class Store {
  constructor(path) { this.path = path; this.queue = Promise.resolve(); this.state = { version: 1, projects: [], outbox: [] }; }
  async open() {
    try {
      const state = JSON.parse(await readFile(this.path, 'utf8'));
      if (state.version !== 1 || !Array.isArray(state.projects) || !Array.isArray(state.outbox)) throw Error('项目记录格式不支持');
      this.state = state;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return this;
  }
  snapshot() { return structuredClone(this.state); }
  change(fn) {
    const job = this.queue.then(async () => {
      const next = structuredClone(this.state);
      const result = await fn(next);
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      const temp = `${this.path}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
      await rename(temp, this.path);
      this.state = next;
      return structuredClone(result);
    });
    this.queue = job.catch(() => {});
    return job;
  }
}
