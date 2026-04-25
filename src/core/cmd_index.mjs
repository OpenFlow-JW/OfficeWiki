import fs from 'node:fs/promises';
import path from 'node:path';
import { workspacePaths } from './paths.mjs';
import { ensureDir, readJson, writeJson, sha256File } from './fsutil.mjs';
import { walkFiles } from './walk.mjs';
import { canParseText, parseTextToMarkdown } from '../parsers/text.mjs';

function toSafeName(relPath) {
  // Flatten to a safe filename to keep wiki mostly flat.
  return relPath
    .replace(/\\/g, '/')
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9._\-가-힣]/g, '_');
}

export async function cmdIndex({ workspace }) {
  const p = workspacePaths(workspace);
  await ensureDir(p.wiki);
  await ensureDir(p.stateDir);

  const index = await readJson(p.indexJson, { version: 1, files: {} });

  let scanned = 0;
  let indexed = 0;
  let skipped = 0;

  for await (const fp of walkFiles(p.raw)) {
    scanned++;
    const rel = path.relative(p.raw, fp).split(path.sep).join('/');
    if (!canParseText(fp)) { skipped++; continue; }

    const st = await fs.stat(fp);
    const key = rel;
    const prev = index.files[key];

    // Quick skip: if mtime+size unchanged, skip.
    if (prev && prev.size === st.size && prev.mtimeMs === st.mtimeMs) {
      skipped++;
      continue;
    }

    const sha = await sha256File(fp);
    // If sha unchanged, still update mtime/size but skip write.
    if (prev && prev.sha256 === sha) {
      index.files[key] = { ...prev, size: st.size, mtimeMs: st.mtimeMs };
      skipped++;
      continue;
    }

    const outName = toSafeName(rel);
    const outPath = path.join(p.wiki, outName.replace(/\.(md|txt)$/i, '.md'));

    const md = await parseTextToMarkdown({ filePath: fp, relPath: rel, sha256: sha });
    await fs.writeFile(outPath, md, 'utf8');

    index.files[key] = {
      sha256: sha,
      size: st.size,
      mtimeMs: st.mtimeMs,
      parser: 'text',
      outRelPath: path.relative(p.root, outPath).split(path.sep).join('/')
    };

    indexed++;
  }

  await writeJson(p.indexJson, index);

  console.log(JSON.stringify({ ok: true, workspace: p.root, scanned, indexed, skipped, indexPath: p.indexJson }, null, 2));
}
