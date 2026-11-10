/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildJpegPdf, type JpegPdfPage } from './jpegPdf';

/** 794 CSS px is A4 width at 96 dpi; twice that gives ~190 dpi pages, sharp on paper. */
export const PDF_SHEET_WIDTH_PX = 794;
const PIXEL_RATIO = 2;
const JPEG_QUALITY = 0.85;

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Canvas could not be encoded as JPEG.'));
          return;
        }
        blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)), reject);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Captures each rendered sheet as an image and writes them into one A4 PDF. The sheets must be
 * laid out (not display:none) at `PDF_SHEET_WIDTH_PX`. html-to-image loads only when a parent
 * actually downloads a PDF.
 */
export async function renderSheetsToPdf(sheets: readonly HTMLElement[], title: string): Promise<Blob> {
  if (sheets.length === 0) throw new Error('There are no sheets to export.');
  const { getFontEmbedCSS, toCanvas } = await import('html-to-image');
  await document.fonts.ready;
  const fontEmbedCSS = await getFontEmbedCSS(sheets[0]);

  const pages: JpegPdfPage[] = [];
  for (const sheet of sheets) {
    const canvas = await toCanvas(sheet, { pixelRatio: PIXEL_RATIO, backgroundColor: '#ffffff', fontEmbedCSS });
    pages.push({ jpeg: await canvasToJpeg(canvas), widthPx: canvas.width, heightPx: canvas.height });
  }
  const pdf = buildJpegPdf(pages, title);
  return new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Safari starts the download asynchronously; revoking at once can cancel it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
