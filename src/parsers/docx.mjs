import { openZip, readZipEntryText, stripXmlToText } from './ooxml_util.mjs';

export function canParseDocx(filePath) {
  return filePath.toLowerCase().endsWith('.docx');
}

export async function parseDocxToMarkdown({ filePath, relPath, sha256 }) {
  const zip = await openZip(filePath);
  try {
    const xml = await readZipEntryText(zip, 'word/document.xml');
    const text = stripXmlToText(xml);
    const fm = [
      '---',
      'type: officewiki-page',
      `sourceRelPath: "${relPath}"`,
      `sourceSha256: "${sha256}"`,
      `indexedAt: "${new Date().toISOString()}"`,
      'parser: "docx"',
      '---',
      ''
    ].join('\n');

    return `${fm}${text}\n`;
  } finally {
    zip.close();
  }
}
