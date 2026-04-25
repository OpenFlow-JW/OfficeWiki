import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';

export async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

export async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function readJson(p, fallback = null) {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

export async function sha256File(p) {
  const h = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    createReadStream(p)
      .on('data', (d) => h.update(d))
      .on('error', reject)
      .on('end', resolve);
  });
  return h.digest('hex');
}
