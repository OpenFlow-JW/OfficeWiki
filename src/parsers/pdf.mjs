import fs from 'node:fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export function canParsePdf(filePath) {
  return filePath.toLowerCase().endsWith('.pdf');
}

export async function parsePdfToMarkdownPages({ filePath, relPath, sha256, maxPages = 50 }) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = Math.min(pdf.numPages, maxPages);

  const out = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map(it => it.str).filter(s => s && s.trim() !== '');

    const md = [
      '---',
      'type: officewiki-page',
      `sourceRelPath: "${relPath}"`,
      `sourceSha256: "${sha256}"`,
      `indexedAt: "${new Date().toISOString()}"`,
      `parser: "pdf"`,
      `page: ${i}`,
      '---',
      '',
      `# Page ${i}`,
      '',
      strings.length ? strings.join('\n') : '*(No extractable text on this page — likely image/chart.)*',
      ''
    ].join('\n');

    out.push({ key: `page-${String(i).padStart(3,'0')}`, markdown: md });
  }

  return out;
}
