import fs from 'node:fs/promises';
import path from 'node:path';
import { Minimatch } from 'minimatch';

const DEFAULT_EXCLUDE_DIRS = new Set([
  '.git', 'node_modules', '.obsidian', 'dist', 'build', 'venv', '__pycache__', '.DS_Store'
]);

const EXT_WEIGHT = {
  '.pptx': 6,
  '.xlsx': 5,
  '.docx': 4,
  '.pdf': 3,
  '.md': 2,
  '.txt': 1
};

function extLower(p) {
  return path.extname(p).toLowerCase();
}

export async function* walk(root, { excludeDirNames = DEFAULT_EXCLUDE_DIRS } = {}) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(root, ent.name);
    if (ent.isDirectory()) {
      if (excludeDirNames.has(ent.name)) continue;
      if (ent.name.startsWith('.')) continue;
      yield* walk(full, { excludeDirNames });
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

export async function findCandidates(root, { limit = 10 } = {}) {
  const out = [];
  const now = Date.now();

  for await (const fp of walk(root)) {
    const ext = extLower(fp);
    if (!EXT_WEIGHT[ext]) continue;
    const st = await fs.stat(fp);

    // score: ext weight + recency (days) + size (log)
    const days = Math.max(0, (now - st.mtimeMs) / (1000 * 60 * 60 * 24));
    const recency = Math.max(0, 30 - days); // up to 30
    const sizeScore = Math.min(10, Math.log10(Math.max(1, st.size)));
    const score = (EXT_WEIGHT[ext] * 10) + recency + sizeScore;

    out.push({
      path: fp,
      rel: path.relative(root, fp).split(path.sep).join('/'),
      ext,
      mtimeMs: st.mtimeMs,
      size: st.size,
      score
    });
  }

  out.sort((a,b) => b.score - a.score);
  return out.slice(0, limit);
}
