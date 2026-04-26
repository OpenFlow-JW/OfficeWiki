import fs from 'node:fs/promises';
import path from 'node:path';
import { cmdInit } from './cmd_init.mjs';
import { cmdIndex } from './cmd_index.mjs';
import { cmdSummarize } from './cmd_summarize.mjs';
import { loadConfig, saveConfig } from './config.mjs';
import { ask } from './prompt.mjs';
import { ensureDir, readJson } from './fsutil.mjs';
import { findCandidates } from './scan_candidates.mjs';
import { workspacePaths } from './paths.mjs';
import { llmChat } from './llm.mjs';
import { tuiMultiSelect } from './tui_select.mjs';

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
  if (n < 1024*1024*1024) return `${(n/1024/1024).toFixed(1)} MB`;
  return `${(n/1024/1024/1024).toFixed(1)} GB`;
}

function defaultSelection(n) {
  if (n === 0) return '';
  if (n === 1) return '1';
  return '1 2';
}

function parseSelection(input, maxIndex, { maxPick = 5 } = {}) {
  const parts = input.trim().split(/\s+/g).filter(Boolean);
  const nums = parts.map(p => Number(p)).filter(n => Number.isFinite(n));
  const unique = Array.from(new Set(nums)).filter(n => n >= 1 && n <= maxIndex);
  return unique.slice(0, maxPick);
}

async function loadWikiSnippets(workspace, outRelPaths, { maxChars = 6000 } = {}) {
  const p = workspacePaths(workspace);
  let text = '';
  for (const rel of outRelPaths) {
    const abs = path.join(p.root, rel);
    try {
      const raw = await fs.readFile(abs, 'utf8');
      text += `\n\n=== ${rel} ===\n` + raw.slice(0, 3000);
      if (text.length > maxChars) break;
    } catch {
      // ignore
    }
  }
  return text.slice(0, maxChars);
}

async function writeTrySummary({ workspace, rawRoot, selected, indexResult }) {
  const cfg = await loadConfig(workspace);
  const llm = cfg?.llm;
  if (!llm) throw new Error('Missing LLM config. Run: officewiki setup <workspace>');

  const p = workspacePaths(workspace);
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const outDir = path.join(p.root, 'ontology', 'candidates', `try-${ts}`);
  await ensureDir(outDir);

  const relPaths = [];
  for (const s of selected) {
    const key = path.relative(rawRoot, s.copiedTo).split(path.sep).join('/');
    const meta = indexResult?.indexJson?.files?.[key];
    if (meta?.outRelPaths) relPaths.push(...meta.outRelPaths);
  }

  const snippets = await loadWikiSnippets(workspace, relPaths);

  const prompt = `You are OfficeWiki.
We are doing a quick onboarding try.

Task:
- Extract candidate ontology entities and aliases.
- Extract candidate decisions (1-5) in question form.
- For each decision, map Data/Logic/Action.
- Identify workflow/business rules hinted by the documents.

Output MUST be markdown.
- Use sections: ## Entities, ## Aliases, ## Decisions, ## Data/Logic/Action, ## Workflow/Rules
- Use checkboxes for candidates, e.g. - [ ] ...
- Keep original language (do not translate); if mixed, keep as-is.

Context:
- workspace: ${workspace}
- rawRoot: ${rawRoot}
- selected files: ${selected.map(s => s.rel).join(', ')}

WIKI SNIPPETS:
${snippets}
`;

  const md = await llmChat({
    provider: llm.provider,
    model: llm.model,
    baseUrl: llm.baseUrl,
    messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
    maxTokens: 1800
  });

  const header = `# Try summary\n\n- rawRoot: ${rawRoot}\n- selected: ${selected.map(s => s.rel).join(', ')}\n- generatedAt: ${new Date().toISOString()}\n\n`;
  await fs.writeFile(path.join(outDir, 'try_summary.md'), header + (md || ''), 'utf8');

  return { outDir };
}

export async function cmdTry({ workspace }) {
  const p = workspacePaths(workspace);
  await cmdInit({ workspace });

  let cfg = await loadConfig(workspace);
  if (!cfg) {
    // minimal config bootstrap (LLM BYOK)
    const provider = await ask('LLM provider (openai|anthropic|gemini|openai_compat)', { defaultValue: 'openai' });
    const modelDefault = provider === 'anthropic' ? 'claude-3-5-sonnet-latest'
      : provider === 'gemini' ? 'gemini-2.0-flash'
      : 'gpt-4o-mini';
    const model = await ask('Model', { defaultValue: modelDefault });
    const baseUrl = (provider === 'openai_compat')
      ? await ask('OpenAI-compatible baseUrl (e.g. http://localhost:11434/v1)', { defaultValue: 'http://localhost:11434/v1' })
      : null;

    cfg = {
      version: 1,
      rawRoot: path.join(p.root, 'raw'),
      llm: { provider, model, ...(baseUrl ? { baseUrl } : {}) }
    };
    await saveConfig(workspace, cfg);
  }

  const scanDir = await ask('테스트로 훑어볼 디렉토리 경로', { defaultValue: process.cwd() });
  const candidates = await findCandidates(scanDir, { limit: 10 });
  if (candidates.length === 0) {
    console.log(JSON.stringify({ ok: false, reason: 'no_candidates', scanDir }, null, 2));
    return;
  }

  const uiLines = candidates.map((c) => {
    const dt = new Date(c.mtimeMs).toISOString().slice(0, 10);
    return `[${c.ext}] ${c.rel}  (${fmtBytes(c.size)}, ${dt})`;
  });

  let picks = null;
  if (process.stdout.isTTY) {
    picks = await tuiMultiSelect({
      title: '아래와 같은 파일을 찾았습니다. Ontology를 만들어볼만한 파일을 선택해보면 어떨까요?',
      items: uiLines,
      defaultSelectedIdx: candidates.length >= 2 ? [0, 1] : [0],
      minPick: 1,
      maxPick: 5
    });
    if (picks === null) return; // cancelled
    // tui returns 0-based indices
    picks = picks.map(i => i + 1);
  } else {
    console.log('\n아래와 같은 파일을 찾았습니다. Ontology를 만들어볼만한 파일을 선택해보면 어떨까요?');
    candidates.forEach((c, i) => {
      const dt = new Date(c.mtimeMs).toISOString().slice(0, 10);
      console.log(`${String(i + 1).padStart(2, ' ')}. [${c.ext}] ${c.rel}  (${fmtBytes(c.size)}, ${dt})`);
    });

    const selRaw = await ask('선택 (기본 2개, 최대 5개) — 예: "1 2"', { defaultValue: defaultSelection(candidates.length) });
    picks = parseSelection(selRaw, candidates.length, { maxPick: 5 });
    if (picks.length === 0) throw new Error('No files selected.');
  }

  // Copy selected into workspace/raw for indexing (non-destructive).
  const rawRoot = cfg.rawRoot || path.join(p.root, 'raw');
  await ensureDir(rawRoot);

  const selected = [];
  for (const n of picks) {
    const c = candidates[n - 1];
    const base = path.basename(c.path);
    const dst = path.join(rawRoot, base);
    await fs.copyFile(c.path, dst);
    selected.push({ ...c, copiedTo: dst });
  }

  // Index and summarize.
  await cmdIndex({ workspace });
  const indexJson = await readJson(path.join(p.stateDir, 'index.json'), { version: 1, files: {} });
  await cmdSummarize({ workspace, rawRoot });
  const { outDir } = await writeTrySummary({ workspace, rawRoot, selected, indexResult: { indexJson } });

  console.log(JSON.stringify({ ok: true, workspace: p.root, scanDir, selected: selected.map(s => s.rel), wrote: outDir }, null, 2));
}

