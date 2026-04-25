import { workspacePaths } from './paths.mjs';
import { ensureDir, fileExists, writeJson } from './fsutil.mjs';

export async function cmdInit({ workspace }) {
  const p = workspacePaths(workspace);

  await ensureDir(p.root);
  await ensureDir(p.raw);
  await ensureDir(p.wiki);
  await ensureDir(p.ontology);
  await ensureDir(p.workflows);
  await ensureDir(p.stateDir);

  if (!(await fileExists(p.indexJson))) {
    await writeJson(p.indexJson, { version: 1, files: {} });
  }

  console.log(JSON.stringify({ ok: true, workspace: p.root }, null, 2));
}
