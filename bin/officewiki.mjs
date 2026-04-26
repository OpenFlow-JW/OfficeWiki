#!/usr/bin/env node
import { cmdInit } from '../src/core/cmd_init.mjs';
import { cmdIngest } from '../src/core/cmd_ingest.mjs';
import { cmdIndex } from '../src/core/cmd_index.mjs';
import { cmdSetup } from '../src/core/cmd_setup.mjs';
import { cmdSummarize } from '../src/core/cmd_summarize.mjs';
import { cmdShell } from '../src/core/cmd_shell.mjs';
import { cmdTry } from '../src/core/cmd_try.mjs';
import { hasFlag, getFlagValue } from '../src/core/args.mjs';
import { resolveWorkspaceArg, DEFAULT_WORKSPACE_DIRNAME } from '../src/core/workspace_default.mjs';

function usage() {
  console.log(`OfficeWiki (v0)

Usage:
  officewiki init [workspace]
  officewiki setup [workspace]
  officewiki ingest [workspace] <path_or_url>
  officewiki index [workspace] [--vision] [--vision-max-pages N]
  officewiki summarize [workspace]
  officewiki ontology-setup [workspace]
  officewiki try [workspace]
  officewiki shell [workspace]

Default workspace:
  ./${DEFAULT_WORKSPACE_DIRNAME}

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
      const workspace = resolveWorkspaceArg(rest[0]);
      await cmdInit({ workspace });
      return;
    }

    if (cmd === 'setup') {
      const workspace = resolveWorkspaceArg(rest[0]);
      await cmdSetup({ workspace });
      return;
    }

    if (cmd === 'ingest') {
      // If first arg is a path/url, workspace is default.
      const workspace = (rest[0] && (rest[0].startsWith('http') || rest[0].startsWith('/') || rest[0].startsWith('./') || rest[0].startsWith('../')))
        ? resolveWorkspaceArg(null)
        : resolveWorkspaceArg(rest[0]);
      const t = (workspace === resolveWorkspaceArg(null)) ? rest[0] : rest[1];
      if (!t) throw new Error('Missing <path_or_url>');
      await cmdIngest({ workspace, target: t });
      return;
    }

    if (cmd === 'index') {
      const workspace = resolveWorkspaceArg(rest[0]);
      const args = (rest[0] && !rest[0].startsWith('-')) ? rest.slice(1) : rest;
      const vision = hasFlag(args, '--vision');
      const visionMaxPages = Number(getFlagValue(args, '--vision-max-pages', '10'));
      await cmdIndex({ workspace, vision, visionMaxPages });
      return;
    }

    if (cmd === 'summarize') {
      const workspace = resolveWorkspaceArg(rest[0]);
      await cmdSummarize({ workspace });
      return;
    }

    if (cmd === 'ontology-setup') {
      const workspace = resolveWorkspaceArg(rest[0]);
      const { cmdOntologySetup } = await import('../src/core/cmd_ontology_setup.mjs');
      await cmdOntologySetup({ workspace });
      return;
    }

    if (cmd === 'try') {
      const workspace = resolveWorkspaceArg(rest[0]);
      await cmdTry({ workspace });
      return;
    }

    if (cmd === 'shell') {
      const workspace = resolveWorkspaceArg(rest[0]);
      await cmdShell({ workspace });
      return;
    }

    throw new Error(`Unknown command: ${cmd}`);
  } catch (e) {
    console.error(String(e?.message || e));
    process.exit(1);
  }
}

main(process.argv.slice(2));
