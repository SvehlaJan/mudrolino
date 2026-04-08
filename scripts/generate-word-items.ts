#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'data', 'words.csv');
const OUT_PATH = join(ROOT, 'src', 'shared', 'wordItems.generated.ts');

const csvContent = readFileSync(CSV_PATH, 'utf8');
const csvLines = csvContent.split('\n');

// Skip header row (index 0)
const dataLines = csvLines.slice(1);

const rows: { word: string; syllables: string; emoji: string; audioKey: string }[] = [];

for (let i = 0; i < dataLines.length; i++) {
  const line = dataLines[i].trim();
  if (!line) continue;

  const fields = line.split(',');
  if (fields.length !== 4) {
    throw new Error(`Row ${i + 2}: expected 4 fields, got ${fields.length}: "${line}"`);
  }

  const [word, syllables, emoji, audioKey] = fields.map(f => f.trim());

  if (!word || !syllables || !emoji || !audioKey) {
    throw new Error(`Row ${i + 2}: empty field in: "${line}"`);
  }

  rows.push({ word, syllables, emoji, audioKey });
}

const itemLines = rows.map(r =>
  `  { word: '${r.word}', syllables: '${r.syllables}', emoji: '${r.emoji}', audioKey: '${r.audioKey}' },`
);

const output = [
  `// AUTO-GENERATED — do not edit by hand. Run \`npm run codegen\` to regenerate.`,
  `import type { Word } from './types';`,
  ``,
  `export const WORD_ITEMS: Word[] = [`,
  ...itemLines,
  `];`,
  ``,
].join('\n');

writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Generated ${rows.length} word items → src/shared/wordItems.generated.ts`);
