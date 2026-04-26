import { runRepl } from './repl.mjs';
import { loadConfig } from './config.mjs';
import { cmdIndex } from './cmd_index.mjs';
import { cmdSummarize } from './cmd_summarize.mjs';

function help() {
  console.log(`OfficeWiki Shell

Commands:
  /help
  /index [--vision] [--vision-max-pages N]
  /summarize
  /exit

Agent-style shorthand:
  @ontology-setup  (planned)
  @summarizer      -> /summarize

Note:
- This is a lightweight command shell inspired by modern CLI tools.
`);
}

export async function cmdShell({ workspace }) {
  const cfg = await loadConfig(workspace);
  if (!cfg) {
    console.log('No config found. Run: officewiki setup <workspace>');
  } else {
    console.log(`Workspace: ${workspace}`);
    console.log(`RawRoot: ${cfg.rawRoot}`);
    console.log(`LLM: ${cfg.llm?.provider}/${cfg.llm?.model}`);
  }

  await runRepl({
    prompt: 'officewiki> ',
    onLine: async (line) => {
      if (line === '/help') return help();
      if (line.startsWith('@')) {
        const agent = line.slice(1).trim();
        if (agent === 'summarizer') {
          await cmdSummarize({ workspace });
          return;
        }
        throw new Error(`Unknown @agent: ${agent} (try /help)`);
      }

      if (!line.startsWith('/')) {
        throw new Error('Commands must start with /. Try /help');
      }

      const parts = line.slice(1).split(/\s+/g);
      const cmd = parts[0];
      const args = parts.slice(1);

      if (cmd === 'index') {
        const vision = args.includes('--vision');
        const vIdx = args.indexOf('--vision-max-pages');
        const visionMaxPages = vIdx !== -1 ? Number(args[vIdx + 1] || '10') : 10;
        await cmdIndex({ workspace, vision, visionMaxPages });
        return;
      }

      if (cmd === 'summarize') {
        await cmdSummarize({ workspace });
        return;
      }

      throw new Error(`Unknown command: /${cmd}`);
    }
  });
}
