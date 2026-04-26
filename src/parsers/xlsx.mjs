import { openZip, listZipEntries, readZipEntryText, stripXmlToText } from './ooxml_util.mjs';

export function canParseXlsx(filePath) {
  return filePath.toLowerCase().endsWith('.xlsx');
}

export async function parseXlsxToMarkdownPages({ filePath, relPath, sha256 }) {
  const zip = await openZip(filePath);
  try {
    const sheets = await listZipEntries(zip, 'xl/worksheets/');
    const sheetFiles = sheets.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));

    const pages = [];
    for (const sf of sheetFiles) {
      const xml = await readZipEntryText(zip, sf);
      const text = stripXmlToText(xml);
      const n = Number(sf.match(/sheet(\d+)\.xml/)[1]);
      const md = [
        '---',
        'type: officewiki-page',
        `sourceRelPath: "${relPath}"`,
        `sourceSha256: "${sha256}"`,
        `indexedAt: "${new Date().toISOString()}"`,
        `parser: "xlsx"`,
        `sheet: ${n}`,
        '---',
        '',
        `# Sheet ${n}`,
        '',
        text,
        ''
      ].join('\n');
      pages.push({ key: `sheet-${String(n).padStart(2,'0')}`, markdown: md });
    }

    if (pages.length === 0) {
      const md = [
        '---',
        'type: officewiki-page',
        `sourceRelPath: "${relPath}"`,
        `sourceSha256: "${sha256}"`,
        `indexedAt: "${new Date().toISOString()}"`,
        'parser: "xlsx"',
        '---',
        '',
        '*(No worksheet XML found — unsupported XLSX variant.)*',
        ''
      ].join('\n');
      pages.push({ key: 'sheets', markdown: md });
    }

    return pages;
  } finally {
    zip.close();
  }
}
