import fs from 'node:fs/promises';
import yauzl from 'yauzl';

export function openZip(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}

export async function readZipEntryText(zipfile, entryFileName) {
  return new Promise((resolve, reject) => {
    let found = false;
    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
      if (entry.fileName === entryFileName) {
        found = true;
        zipfile.openReadStream(entry, (err, stream) => {
          if (err) return reject(err);
          const chunks = [];
          stream.on('data', (d) => chunks.push(d));
          stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          stream.on('error', reject);
        });
      } else {
        zipfile.readEntry();
      }
    });
    zipfile.on('end', () => {
      if (!found) resolve(null);
    });
    zipfile.on('error', reject);
  });
}

export async function listZipEntries(zipfile, prefix = '') {
  const out = [];
  return new Promise((resolve, reject) => {
    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
      if (!entry.fileName.endsWith('/') && entry.fileName.startsWith(prefix)) out.push(entry.fileName);
      zipfile.readEntry();
    });
    zipfile.on('end', () => resolve(out));
    zipfile.on('error', reject);
  });
}

export function stripXmlToText(xml) {
  if (!xml) return '';
  // crude XML tag stripping; good enough for v0 text extraction.
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fileShaHint(filePath) {
  const st = await fs.stat(filePath);
  return `${st.size}:${st.mtimeMs}`;
}
