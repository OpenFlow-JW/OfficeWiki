import fs from 'node:fs/promises';
import path from 'node:path';
import { workspacePaths } from './paths.mjs';
import { ensureDir, fileExists, readJson, writeJson } from './fsutil.mjs';
import { walkFiles } from './walk.mjs';
import { loadConfig } from './config.mjs';
import { llmChat } from './llm.mjs';

function extOf(p) {
  const m = p.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : '';
}

export async function cmdSummarize({ workspace, rawRoot = null }) {
  const cfg = await loadConfig(workspace);
  const p = workspacePaths(workspace);
  const root = rawRoot || cfg?.rawRoot || p.raw;

  await ensureDir(p.stateDir);
  const reportDir = path.join(p.stateDir, 'reports');
  await ensureDir(reportDir);

  let count = 0;
  const byExt = {};
  const recent = [];

  for await (const fp of walkFiles(root)) {
    count++;
    const st = await fs.stat(fp);
    const e = extOf(fp) || '(none)';
    byExt[e] = (byExt[e] || 0) + 1;
    recent.push({ fp, mtimeMs: st.mtimeMs, size: st.size });
  }

  recent.sort((a,b) => b.mtimeMs - a.mtimeMs);
  const topRecent = recent.slice(0, 20).map(r => ({
    rel: path.relative(root, r.fp).split(path.sep).join('/'),
    mtimeMs: r.mtimeMs,
    size: r.size
  }));

  const stats = { rawRoot: root, totalFiles: count, byExt, recent: topRecent };
  await writeJson(path.join(reportDir, 'stats.json'), stats);

  // LLM summary if configured
  let llmSummary = null;
  if (cfg?.llm?.provider) {
    const provider = cfg.llm.provider;
    const model = cfg.llm.model;
    const baseUrl = cfg.llm.baseUrl;

    const prompt = `You are OfficeWiki.
Summarize this workspace directory at a high level for a human.
- Provide 5-10 bullet summary.
- Identify likely topics/areas.
- Propose 10 ontology candidate entities and 10 relationships (rough guesses).
- Output in Korean.
\n\nSTATS JSON:\n${JSON.stringify(stats, null, 2)}`;

    llmSummary = await llmChat({
      provider,
      model,
      baseUrl,
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
      maxTokens: 900
    });

    await fs.writeFile(path.join(reportDir, 'summary.md'), llmSummary + '\n', 'utf8');
  }

  console.log(JSON.stringify({ ok: true, workspace: p.root, rawRoot: root, wrote: reportDir, llm: !!llmSummary }, null, 2));
}
