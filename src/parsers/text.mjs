import fs from 'node:fs/promises';

export function canParseText(filePath) {
  return filePath.endsWith('.md') || filePath.endsWith('.txt');
}

export async function parseTextToMarkdown({ filePath, relPath, sha256 }) {
  const raw = await fs.readFile(filePath, 'utf8');
  const fm = [
    '---',
    'type: officewiki-page',
    `sourceRelPath: "${relPath.replace(/\\/g,'/')}"`,
    `sourceSha256: "${sha256}"`,
    `indexedAt: "${new Date().toISOString()}"`,
    'parser: "text"',
    '---',
    ''
  ].join('\n');

  // Preserve original content verbatim under a header.
  return `${fm}${raw.endsWith('\n') ? raw : raw + '\n'}`;
}
