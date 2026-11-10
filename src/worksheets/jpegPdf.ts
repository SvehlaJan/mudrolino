/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** A4 in PDF points (1/72 inch). */
export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;

export interface JpegPdfPage {
  /** Baseline JPEG bytes, as `canvas.toBlob(…, 'image/jpeg')` produces them. */
  jpeg: Uint8Array;
  widthPx: number;
  heightPx: number;
}

const encoder = new TextEncoder();

/** PDF literal string: escape the delimiters and drop anything outside printable ASCII. */
function pdfText(value: string): string {
  const ascii = value.normalize('NFD').replace(/[^\x20-\x7e]/g, '');
  return `(${ascii.replace(/[\\()]/g, match => `\\${match}`)})`;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * Writes a minimal PDF with one A4 page per JPEG, each scaled to the full page width and
 * anchored at the top (a shorter image leaves the bottom blank).
 * JPEG data embeds as-is through DCTDecode, so no PDF library is needed.
 */
export function buildJpegPdf(pages: readonly JpegPdfPage[], title = ''): Uint8Array {
  if (pages.length === 0) throw new Error('A PDF needs at least one page.');

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  // Objects: 1 catalog, 2 page tree, 3 info, then page/content/image triples from 4.
  const pageId = (index: number) => 4 + index * 3;
  const objectCount = 3 + pages.length * 3;

  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${pageId(index)} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  startObject(3);
  push(`<< /Title ${pdfText(title)} /Producer ${pdfText('Mudrolino')} >>\nendobj\n`);

  pages.forEach((page, index) => {
    const id = pageId(index);
    const imageHeight = Math.min(A4_HEIGHT_PT, (A4_WIDTH_PT * page.heightPx) / page.widthPx);
    const content = `q ${formatNumber(A4_WIDTH_PT)} 0 0 ${formatNumber(imageHeight)} 0 ${formatNumber(A4_HEIGHT_PT - imageHeight)} cm /Im0 Do Q\n`;

    startObject(id);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] `
      + `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>\nendobj\n`,
    );
    startObject(id + 1);
    push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);
    startObject(id + 2);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} `
      + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push('\nendstream\nendobj\n');
  });

  const xrefOffset = length;
  push(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= objectCount; id += 1) {
    push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const pdf = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, position);
    position += chunk.length;
  }
  return pdf;
}
