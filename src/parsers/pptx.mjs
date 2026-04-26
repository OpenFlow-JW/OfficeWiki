import { openZip, listZipEntries, readZipEntryText, stripXmlToText } from './ooxml_util.mjs';

export function canParsePptx(filePath) {
  return filePath.toLowerCase().endsWith('.pptx');
}

export async function parsePptxToMarkdownPages({ filePath, relPath, sha256 }) {
  const zip = await openZip(filePath);
  try {
    const slides = await listZipEntries(zip, 'ppt/slides/');
    const slideFiles = slides
      .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a,b) => {
        const na = Number(a.match(/slide(\d+)\.xml/)[1]);
        const nb = Number(b.match(/slide(\d+)\.xml/)[1]);
        return na-nb;
      });

    const pages = [];
    for (const sf of slideFiles) {
      const xml = await readZipEntryText(zip, sf);
      const text = stripXmlToText(xml);
      const n = Number(sf.match(/slide(\d+)\.xml/)[1]);
      const md = [
        '---',
        'type: officewiki-page',
        `sourceRelPath: "${relPath}"`,
        `sourceSha256: "${sha256}"`,
        `indexedAt: "${new Date().toISOString()}"`,
        `parser: "pptx"`,
        `slide: ${n}`,
        '---',
        '',
        `# Slide ${n}`,
        '',
        text,
        ''
      ].join('\n');
      pages.push({ key: `slide-${String(n).padStart(2,'0')}`, markdown: md });
    }

    // If we couldn't find slides, fall back to empty.
    if (pages.length === 0) {
      const md = [
        '---',
        'type: officewiki-page',
        `sourceRelPath: "${relPath}"`,
        `sourceSha256: "${sha256}"`,
        `indexedAt: "${new Date().toISOString()}"`,
        'parser: "pptx"',
        '---',
        '',
        '*(No slide XML found — unsupported PPTX variant.)*',
        ''
      ].join('\n');
      pages.push({ key: 'slides', markdown: md });
    }

    return pages;
  } finally {
    zip.close();
  }
}
