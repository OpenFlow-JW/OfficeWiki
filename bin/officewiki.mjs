#!/usr/bin/env node
import { cmdInit } from '../src/core/cmd_init.mjs';
import { cmdIngest } from '../src/core/cmd_ingest.mjs';
import { cmdIndex } from '../src/core/cmd_index.mjs';
import { cmdSetup } from '../src/core/cmd_setup.mjs';
import { cmdSummarize } from '../src/core/cmd_summarize.mjs';
import { hasFlag, getFlagValue } from '../src/core/args.mjs';

function usage() {
  console.log(`OfficeWiki (v0)

Usage:
  officewiki init <workspace>
  officewiki setup <workspace>
  officewiki ingest <workspace> <path_or_url>
  officewiki index <workspace> [--vision] [--vision-max-pages N]
  officewiki summarize <workspace>

Notes:
- workspace is the output home (wiki/ontology/workflows/state).
- rawRoot is a directory you point OfficeWiki at; files are never moved or copied by default.
- LLM is BYOK (keys via env only). See docs/BYOK.md
`);
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') {
    usage();
    process.exit(0);
  }

  try {
    if (cmd === 'init') {
      const [workspace] = rest;
      if (!workspace) throw new Error('Missing <workspace>');
      await cmdInit({ workspace });
      return;
    }

    if (cmd === 'setup') {
      const [workspace] = rest;
      if (!workspace) throw new Error('Missing <workspace>');
      await cmdSetup({ workspace });
      return;
    }

    if (cmd === 'ingest') {
      const [workspace, target] = rest;
      if (!workspace || !target) throw new Error('Missing <workspace> or <path_or_url>');
      await cmdIngest({ workspace, target });
      return;
    }

    if (cmd === 'index') {
      const [workspace, ...args] = rest;
      if (!workspace) throw new Error('Missing <workspace>');
      const vision = hasFlag(args, '--vision');
      const visionMaxPages = Number(getFlagValue(args, '--vision-max-pages', '10'));
      await cmdIndex({ workspace, vision, visionMaxPages });
      return;
    }

    if (cmd === 'summarize') {
      const [workspace] = rest;
      if (!workspace) throw new Error('Missing <workspace>');
      await cmdSummarize({ workspace });
      return;
    }

    throw new Error(`Unknown command: ${cmd}`);
  } catch (e) {
    console.error(String(e?.message || e));
    process.exit(1);
  }
}

main(process.argv.slice(2));
