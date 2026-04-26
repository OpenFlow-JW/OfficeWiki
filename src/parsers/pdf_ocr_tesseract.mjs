import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pExecFile = promisify(execFile);

export async function hasTesseract() {
  try {
    await pExecFile('tesseract', ['--version']);
    return true;
  } catch {
    return false;
  }
}

// v0 stub: OCR requires page images. We intentionally do not render here yet.
export async function ocrPdfWithTesseract() {
  throw new Error('Tesseract OCR pipeline not wired yet (needs PDF->image render + per-page OCR). Use --vision for now.');
}
