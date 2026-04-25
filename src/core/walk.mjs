import fs from 'node:fs/promises';
import path from 'node:path';

export async function* walkFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === '.officewiki') continue;
      yield* walkFiles(full);
    } else if (ent.isFile()) {
      yield full;
    }
  }
}
