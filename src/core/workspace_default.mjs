import path from 'node:path';

export const DEFAULT_WORKSPACE_DIRNAME = 'officewiki_workspace';

export function resolveWorkspaceArg(maybeWorkspace) {
  if (maybeWorkspace && !maybeWorkspace.startsWith('-')) return maybeWorkspace;
  return path.resolve(process.cwd(), DEFAULT_WORKSPACE_DIRNAME);
}
