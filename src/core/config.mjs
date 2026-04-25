import path from 'node:path';
import { workspacePaths } from './paths.mjs';
import { readJson, writeJson, ensureDir } from './fsutil.mjs';

export function configPath(workspace) {
  const p = workspacePaths(workspace);
  return path.join(p.stateDir, 'config.json');
}

export async function loadConfig(workspace) {
  const p = workspacePaths(workspace);
  const cfg = await readJson(configPath(workspace), null);
  return cfg;
}

export async function saveConfig(workspace, cfg) {
  const p = workspacePaths(workspace);
  await ensureDir(p.stateDir);
  await writeJson(configPath(workspace), cfg);
}
