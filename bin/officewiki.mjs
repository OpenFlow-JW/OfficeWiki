#!/usr/bin/env node
import { cmdInit } from '../src/core/cmd_init.mjs';
import { cmdIndex } from '../src/core/cmd_index.mjs';
import { cmdIngest } from '../src/core/cmd_ingest.mjs';

function usage() {
  console.log(`OfficeWiki (v0)

Usage:
  officewiki init <workspace>
  officewiki ingest <workspace> <path_or_url>
  officewiki index <workspace>

Notes:
- v0 is text-first (.md/.txt).
- workspace/raw is the source-of-truth; ingest records references (no copy by default).
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
    } else if (cmd === 'ingest') {
      const [workspace, target] = rest;
      if (!workspace || !target) throw new Error('Missing <workspace> or <path_or_url>');
      await cmdIngest({ workspace, target });
    } else if (cmd === 'index') {
      const [workspace] = rest;
      if (!workspace) throw new Error('Missing <workspace>');
      await cmdIndex({ workspace });
    } else {
      throw new Error(`Unknown command: ${cmd}`);
    }
  } catch (e) {
    console.error(String(e?.message || e));
    process.exit(1);
  }
}

main(process.argv.slice(2));
