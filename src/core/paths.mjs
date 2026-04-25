import path from 'node:path';

export function workspacePaths(workspace) {
  const root = path.resolve(workspace);
  return {
    root,
    raw: path.join(root, 'raw'),
    wiki: path.join(root, 'wiki'),
    ontology: path.join(root, 'ontology'),
    workflows: path.join(root, 'workflows'),
    stateDir: path.join(root, '.officewiki'),
    indexJson: path.join(root, '.officewiki', 'index.json'),
    ingestJsonl: path.join(root, '.officewiki', 'ingest.jsonl')
  };
}
