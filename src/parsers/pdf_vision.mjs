import fs from 'node:fs/promises';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { llmChat } from '../core/llm.mjs';

function toDataUrlPng(buf) {
  return `data:image/png;base64,${buf.toString('base64')}`;
}

export async function renderPdfPagesToPngBuffers({ filePath, maxPages = 10, scale = 2 }) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const out = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const png = await canvas.encode('png');
    out.push({ page: i, png });
  }

  return { numPages: pdf.numPages, pages: out };
}

export async function visionTranscribePdf({ provider, model, baseUrl, filePath, relPath, sha256, maxPages = 10 }) {
  const { numPages, pages } = await renderPdfPagesToPngBuffers({ filePath, maxPages });

  const results = [];
  for (const p of pages) {
    const prompt = `You are OfficeWiki.
Transcribe and extract as much structured content as possible from this PDF page image.
- Output in the ORIGINAL language of the document.
- Prefer verbatim transcription for text.
- If it is a chart/table: extract axes, legends, series names, key values, trends.
- Include a short section: "## Extracted facts" with bullet points.
- Do NOT include any personal-identifying information.

Return markdown.`;

    // Use OpenAI-compatible image inputs via data URL (only provider=openai/openai_compat supported for now)
    if (provider !== 'openai' && provider !== 'openai_compat') {
      throw new Error(`visionTranscribePdf currently supports provider=openai/openai_compat only (got ${provider})`);
    }

    const content = await llmChat({
      provider,
      model,
      baseUrl,
      messages: [
        {
          role: 'user',
          // OpenAI chat supports multimodal content blocks.
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: toDataUrlPng(p.png) } }
          ]
        }
      ],
      maxTokens: 1200
    });

    const md = [
      '---',
      'type: officewiki-page',
      `sourceRelPath: "${relPath}"`,
      `sourceSha256: "${sha256}"`,
      `indexedAt: "${new Date().toISOString()}"`,
      'parser: "pdf_vision"',
      `page: ${p.page}`,
      `totalPages: ${numPages}`,
      '---',
      '',
      `# Page ${p.page}`,
      '',
      content?.trim() || '',
      ''
    ].join('\n');

    results.push({ key: `page-${String(p.page).padStart(3,'0')}`, markdown: md });
  }

  return results;
}
