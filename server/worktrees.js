import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';
const run = promisify(execFile);

export class Worktrees {
  constructor(home, limits) { this.home = home; this.limits = limits; }
  async git(cwd, args) {
    const { stdout } = await run('git', ['-C', cwd, ...args], { timeout: this.limits.gitTimeoutMs, maxBuffer: this.limits.gitOutputBytes });
    return stdout.trimEnd();
  }
  async repo(path) {
    const canonical = await realpath(path);
    if (!(await stat(canonical)).isDirectory()) throw Error('工作区必须是文件夹');
    let root = null;
    try { root = await realpath(await this.git(canonical, ['rev-parse', '--show-toplevel'])); } catch {}
    return { path: canonical, gitRoot: root };
  }
  async create(repo, projectId, threadId) {
    let addCalled = false;
    try {
      if (!repo.gitRoot) throw Error('代码线程需要 Git 仓库；普通目录可创建研究线程');
      const base = await this.git(repo.gitRoot, ['rev-parse', 'HEAD']);
      const dirty = !!(await this.git(repo.gitRoot, ['status', '--porcelain']));
      const folder = join(this.home, 'worktrees', projectId);
      await mkdir(folder, { recursive: true });
      const path = join(folder, threadId);
      const branch = `codex/project-${projectId.slice(0, 8)}-${threadId.slice(0, 8)}`;
      addCalled = true;
      await this.git(repo.gitRoot, ['worktree', 'add', '-b', branch, path, base]);
      return { path: await realpath(path), base, branch, sourceDirty: dirty };
    } catch (cause) {
      const error = cause instanceof Error ? cause : Error(String(cause));
      error.worktreeNotCreated = !addCalled;
      throw error;
    }
  }
  async diff(thread) {
    if (!thread.worktree) return { text: '此线程没有独立代码分支。', files: '', truncated: false };
    const cwd = thread.worktree.path;
    const files = await this.git(cwd, ['status', '--short']);
    const text = await this.git(cwd, ['diff', thread.worktree.base, '--']);
    const untracked = await this.git(cwd, ['ls-files', '--others', '--exclude-standard']);
    return { files, text: text.slice(0, this.limits.maxDiffChars), truncated: text.length > this.limits.maxDiffChars, untracked, branch: thread.worktree.branch, path: cwd };
  }
}
