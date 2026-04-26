import { cmdInit } from './cmd_init.mjs';
import { saveConfig } from './config.mjs';
import { ask } from './prompt.mjs';
import { cmdIndex } from './cmd_index.mjs';
import { cmdSummarize } from './cmd_summarize.mjs';

export async function cmdSetup({ workspace }) {
  await cmdInit({ workspace });

  const rawRoot = await ask('Raw root directory to index', { defaultValue: `${workspace}/officewiki-raw` });
  const provider = await ask('LLM provider (openai|anthropic|gemini|openai_compat)', { defaultValue: 'openai' });
  const modelDefault = provider === 'anthropic' ? 'claude-3-5-sonnet-latest'
    : provider === 'gemini' ? 'gemini-2.0-flash'
    : 'gpt-4o-mini';
  const model = await ask('Model', { defaultValue: modelDefault });
  const baseUrl = (provider === 'openai_compat')
    ? await ask('OpenAI-compatible baseUrl (e.g. http://localhost:11434/v1)', { defaultValue: 'http://localhost:11434/v1' })
    : null;

  // Ensure rawRoot exists (we create it by default)
  // This is a convenience: user can just start dropping files.
  const { ensureDir } = await import('./fsutil.mjs');
  await ensureDir(rawRoot);

  const cfg = {
    version: 1,
    rawRoot,
    llm: {
      provider,
      model,
      ...(baseUrl ? { baseUrl } : {})
    }
  };

  await saveConfig(workspace, cfg);

  console.log(JSON.stringify({ ok: true, workspace, config: cfg }, null, 2));

  // one-shot run
  await cmdIndex({ workspace, rawRoot });
  await cmdSummarize({ workspace, rawRoot });
}
