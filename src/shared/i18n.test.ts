import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectLocale, translate } from './i18n';
import { CS_TRANSLATIONS } from './locales/cs.ui';

// Development-only screens stay Slovak and are not part of the shipped UI.
const EXCLUDED = [/\/avatar\//, /UiKitScreen\.tsx$/, /\/gallery\//, /\.(test|verify)\.tsx?$/];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !EXCLUDED.some(pattern => pattern.test(path)) ? [path] : [];
  });
}

/** Every literal passed to t(), translate() or msg() in shipped source. */
function markedStrings(): Map<string, string> {
  const found = new Map<string, string>();
  const call = /\b(?:t|msg|translate\(\s*[\w.]+\s*,)\s*\(?\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  for (const file of sourceFiles('src')) {
    // Examples in comments are not shown to anyone.
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const match of source.matchAll(call)) {
      const text = match[2].replace(/\\(['"\\])/g, '$1');
      if (!found.has(text)) found.set(text, file);
    }
  }
  return found;
}

describe('Czech translations', () => {
  const marked = markedStrings();

  it('cover every Slovak UI string marked for translation', () => {
    const missing = [...marked].filter(([text]) => !(text in CS_TRANSLATIONS)).map(([text, file]) => `${file}: ${text}`);
    expect(missing).toEqual([]);
  });

  it('contain no entries for strings the app no longer shows', () => {
    expect(Object.keys(CS_TRANSLATIONS).filter(text => !marked.has(text))).toEqual([]);
  });

  it('keep every placeholder of the Slovak source', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    const broken = Object.entries(CS_TRANSLATIONS).filter(([sk, cs]) => placeholders(sk).join() !== placeholders(cs).join());
    expect(broken).toEqual([]);
  });
});

describe('translate', () => {
  it('returns Slovak unchanged and fills placeholders', () => {
    expect(translate('sk', 'Zrušiť')).toBe('Zrušiť');
    expect(translate('sk', 'Verzia {version}', { version: 'abc1234' })).toBe('Verzia abc1234');
  });

  it('falls back to Slovak for text without a translation', () => {
    expect(translate('cs', 'Text, ktorý ešte nikto nepreložil')).toBe('Text, ktorý ešte nikto nepreložil');
  });
});

describe('detectLocale', () => {
  it('picks Czech for Czech browsers and Slovak otherwise', () => {
    expect(detectLocale(['cs-CZ', 'en'])).toBe('cs');
    expect(detectLocale(['en-US', 'cs'])).toBe('cs');
    expect(detectLocale(['sk', 'cs'])).toBe('sk');
    expect(detectLocale(['de-DE'])).toBe('sk');
    expect(detectLocale([])).toBe('sk');
  });
});
