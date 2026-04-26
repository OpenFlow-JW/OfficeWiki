import path from 'node:path';

export function extLower(filePath) {
  return path.extname(filePath).toLowerCase();
}

export function isSupportedExt(filePath) {
  return ['.md', '.txt', '.pdf', '.docx', '.pptx', '.xlsx'].includes(extLower(filePath));
}
