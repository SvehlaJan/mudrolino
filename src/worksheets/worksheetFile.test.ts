import { describe, expect, it } from 'vitest';
import { buildJpegPdf, A4_HEIGHT_PT, A4_WIDTH_PT } from './jpegPdf';
import { takeNextWorksheetFileNumber, worksheetFileBaseName, WORKSHEET_FILE_COUNTER_KEY } from './worksheetFile';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe('worksheet file names', () => {
  it('name the file after Mudrolino with a padded number, per language', () => {
    expect(worksheetFileBaseName('sk', 7)).toBe('Mudrolino-pracovne-listy-007');
    expect(worksheetFileBaseName('cs', 1234)).toBe('Mudrolino-pracovni-listy-1234');
    expect(worksheetFileBaseName('xx', 1)).toBe('Mudrolino-pracovne-listy-001');
  });

  it('count up across downloads so two files never share a name', () => {
    const storage = memoryStorage();
    expect([1, 2, 3].map(() => takeNextWorksheetFileNumber(storage))).toEqual([1, 2, 3]);
    expect(storage.getItem(WORKSHEET_FILE_COUNTER_KEY)).toBe('3');
  });

  it('restart from one after a corrupted counter', () => {
    expect(takeNextWorksheetFileNumber(memoryStorage({ [WORKSHEET_FILE_COUNTER_KEY]: 'abc' }))).toBe(1);
  });

  it('fall back to a time-based number when storage is unavailable', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => undefined };
    expect(takeNextWorksheetFileNumber(blocked, () => 1_700_000_123_000)).toBe(123);
    expect(takeNextWorksheetFileNumber(null, () => 1_700_000_456_000)).toBe(456);
  });
});

describe('buildJpegPdf', () => {
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0x01, 0x02, 0xff, 0xd9]);
  const decode = (pdf: Uint8Array) => new TextDecoder('latin1').decode(pdf);

  it('writes one A4 page per image with a cross-reference table pointing at each object', () => {
    const pdf = buildJpegPdf([
      { jpeg: fakeJpeg, widthPx: 1588, heightPx: 2246 },
      { jpeg: fakeJpeg, widthPx: 1588, heightPx: 800 },
    ], 'Mudrolino-pracovne-listy-001');
    const text = decode(pdf);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(text).toContain('/Count 2');
    expect(text).toContain(`/MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}]`);
    expect(text).toContain('/Title (Mudrolino-pracovne-listy-001)');

    const startxref = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]));
    expect(entries).toHaveLength(9);
    entries.forEach((offset, index) => {
      expect(text.slice(offset, offset + `${index + 1} 0 obj`.length)).toBe(`${index + 1} 0 obj`);
    });
  });

  it('anchors a short image at the top of the page', () => {
    const text = decode(buildJpegPdf([{ jpeg: fakeJpeg, widthPx: 1000, heightPx: 500 }]));
    // Half as tall as wide: 297.64pt high, placed 841.89 - 297.64 from the bottom.
    expect(text).toContain('q 595.28 0 0 297.64 0 544.25 cm /Im0 Do Q');
  });

  it('keeps the title ASCII so every PDF viewer can show it', () => {
    expect(decode(buildJpegPdf([{ jpeg: fakeJpeg, widthPx: 10, heightPx: 10 }], 'Pracovné (listy)'))).toContain(
      '/Title (Pracovne \\(listy\\))',
    );
  });
});
