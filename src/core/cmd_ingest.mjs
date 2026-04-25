import fs from 'node:fs/promises';
import path from 'node:path';
import { workspacePaths } from './paths.mjs';
import { ensureDir } from './fsutil.mjs';

function isUrl(s) {
  return /^https?:\/\//i.test(s);
}

export async function cmdIngest({ workspace, target }) {
  const p = workspacePaths(workspace);
  await ensureDir(p.stateDir);

  // v0: record references only (no copy).
  const entry = {
    at: new Date().toISOString(),
    kind: isUrl(target) ? 'url' : 'path',
    target
  };

  await fs.appendFile(p.ingestJsonl, JSON.stringify(entry) + '\n', 'utf8');

  // If the user points at a file/dir, we do nothing else: raw is the workspace folder itself.
  // Later versions may support importing into raw.

  console.log(JSON.stringify({ ok: true, recorded: entry, note: 'v0 ingest records references only; put files under workspace/raw for indexing.' }, null, 2));
}
