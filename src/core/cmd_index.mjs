import fs from 'node:fs/promises';
import path from 'node:path';
import { workspacePaths } from './paths.mjs';
import { loadConfig } from './config.mjs';
import { ensureDir, readJson, writeJson, sha256File } from './fsutil.mjs';
import { walkFiles } from './walk.mjs';
import { canParseText, parseTextToMarkdown } from '../parsers/text.mjs';
import { canParsePdf, parsePdfToMarkdownPages } from '../parsers/pdf.mjs';
import { canParseDocx, parseDocxToMarkdown } from '../parsers/docx.mjs';
import { canParsePptx, parsePptxToMarkdownPages } from '../parsers/pptx.mjs';
import { canParseXlsx, parseXlsxToMarkdownPages } from '../parsers/xlsx.mjs';

function toSafeName(relPath) {
  // Flatten to a safe filename to keep wiki mostly flat.
  return relPath
    .replace(/\\/g, '/')
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9._\-가-힣]/g, '_');
}

export async function cmdIndex({ workspace, rawRoot = null }) {
  const p = workspacePaths(workspace);
  await ensureDir(p.wiki);
  await ensureDir(p.stateDir);

  const index = await readJson(p.indexJson, { version: 1, files: {} });

  let scanned = 0;
  let indexed = 0;
  let skipped = 0;

  const cfg = await loadConfig(workspace);
  const root = rawRoot || cfg?.rawRoot || p.raw;

  for await (const fp of walkFiles(root)) {
    scanned++;
    const rel = path.relative(root, fp).split(path.sep).join('/');
    const isText = canParseText(fp);
    const isPdf = canParsePdf(fp);
    const isDocx = canParseDocx(fp);
    const isPptx = canParsePptx(fp);
    const isXlsx = canParseXlsx(fp);

    if (!(isText || isPdf || isDocx || isPptx || isXlsx)) { skipped++; continue; }

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

    // Build pages (some formats fan out into multiple pages)
    let pages = [];
    let parserName = 'text';

    if (isText) {
      const md = await parseTextToMarkdown({ filePath: fp, relPath: rel, sha256: sha });
      pages = [{ key: 'doc', markdown: md }];
      parserName = 'text';
    } else if (isPdf) {
      pages = await parsePdfToMarkdownPages({ filePath: fp, relPath: rel, sha256: sha, maxPages: 100 });
      parserName = 'pdf';
    } else if (isDocx) {
      const md = await parseDocxToMarkdown({ filePath: fp, relPath: rel, sha256: sha });
      pages = [{ key: 'doc', markdown: md }];
      parserName = 'docx';
    } else if (isPptx) {
      pages = await parsePptxToMarkdownPages({ filePath: fp, relPath: rel, sha256: sha });
      parserName = 'pptx';
    } else if (isXlsx) {
      pages = await parseXlsxToMarkdownPages({ filePath: fp, relPath: rel, sha256: sha });
      parserName = 'xlsx';
    }

    // write out pages
    const outRelPaths = [];
    if (pages.length === 1 && pages[0].key === 'doc') {
      const outPath = path.join(p.wiki, outName.replace(/\.[^.]+$/i, '.md'));
      await fs.writeFile(outPath, pages[0].markdown, 'utf8');
      outRelPaths.push(path.relative(p.root, outPath).split(path.sep).join('/'));
    } else {
      const subdir = path.join(p.wiki, outName.replace(/\.[^.]+$/i, ''));
      await ensureDir(subdir);
      for (const pg of pages) {
        const outPath = path.join(subdir, `${pg.key}.md`);
        await fs.writeFile(outPath, pg.markdown, 'utf8');
        outRelPaths.push(path.relative(p.root, outPath).split(path.sep).join('/'));
      }
    }

    index.files[key] = {
      sha256: sha,
      size: st.size,
      mtimeMs: st.mtimeMs,
      parser: parserName,
      outRelPaths
    };

    indexed++;
  }

  await writeJson(p.indexJson, index);

  console.log(JSON.stringify({ ok: true, workspace: p.root, scanned, indexed, skipped, indexPath: p.indexJson }, null, 2));
}
