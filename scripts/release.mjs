import { readFile, writeFile, mkdir, cp, copyFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import YAML from 'yaml';
const root = fileURLToPath(new URL('../', import.meta.url));
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const base = arg('--releases'), patchPath = arg('--patch');
if (!base || !patchPath) throw Error('Usage: node scripts/release.mjs --releases <directory> --patch <profile/cordis.patch.yml>');
const build = JSON.parse(await readFile(join(root, 'build.json'), 'utf8'));
const target = resolve(base, build.id);
await mkdir(target, { recursive: true });
for (const name of ['package.json', 'index.js', 'client.js', 'build.json', 'cordis.patch.yml', 'server', 'config', 'README.md']) await cp(join(root, name), join(target, name), { recursive: true });
const raw = await readFile(patchPath, 'utf8');
const doc = YAML.parseDocument(raw, { strict: false });
if (doc.errors.length || !YAML.isSeq(doc.contents)) throw Error('Profile patch must be a valid YAML sequence');
// Modify only this plugin's nodes. Keeping the YAML document retains other plugins' custom tags.
let disabled = false;
for (const entry of doc.contents.items) {
  if (entry?.get?.('id') === 'project-workbench') { entry.set('disabled', true); disabled = true; }
  const list = entry?.get?.('insert');
  if (YAML.isSeq(list)) list.items = list.items.filter(item => !String(item?.get?.('id') || '').startsWith('project-workbench-release-'));
}
if (!disabled) doc.contents.add(doc.createNode({ id: 'project-workbench', disabled: true }));
doc.contents.add(doc.createNode({ insert: [{ id: `project-workbench-release-${build.id}`, name: pathToFileURL(join(target, 'index.js')).href }] }));
await mkdir(dirname(patchPath), { recursive: true });
await copyFile(patchPath, `${patchPath}.before-project-${build.id}`);
await writeFile(patchPath, String(doc));
console.log(JSON.stringify({ build: build.id, release: target, patch: patchPath }));
