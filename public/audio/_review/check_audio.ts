#!/usr/bin/env npx tsx
/**
 * check_audio.ts
 * ==============
 * Unit-test style checks that all audio files expected by contentRegistry.ts
 * are present on disk, and no unrecognised files exist.
 *
 * Run: npx tsx public/audio/_review/check_audio.ts
 * Or:  npm run test:audio
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LETTER_ITEMS,
  SYLLABLE_ITEMS,
  WORD_ITEMS,
  NUMBER_ITEMS,
  PRAISE_ENTRIES,
} from '../../../src/shared/contentRegistry.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..');

// Phrase keys are not stored in contentRegistry — keep them here.
const PHRASE_KEYS = [
  'najdi-pismeno',
  'toto-je-pismeno',
  'skus-to-znova',
  'cislo',
  'slabika',
  'spocitaj-predmety',
  'ano-je-ich',
  'nie-je-ich',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Result {
  missing: string[];
  orphaned: string[];
}

function checkFolder(folder: string, expectedKeys: string[]): Result {
  const folderPath = join(AUDIO_DIR, folder);
  const expectedFiles = new Set(expectedKeys.map(k => `${k}.mp3`));

  const missing = expectedKeys.filter(
    key => !existsSync(join(folderPath, `${key}.mp3`))
  );

  const orphaned: string[] = [];
  if (existsSync(folderPath)) {
    for (const fname of readdirSync(folderPath)) {
      if (fname.endsWith('.mp3') && !expectedFiles.has(fname)) {
        orphaned.push(fname);
      }
    }
  }

  return { missing, orphaned };
}

let passed = 0;
let failed = 0;

function test(name: string, folder: string, keys: string[]): void {
  const { missing, orphaned } = checkFolder(folder, keys);
  const ok = missing.length === 0 && orphaned.length === 0;

  if (ok) {
    console.log(`  ✓  ${name} (${keys.length} files)`);
    passed++;
    return;
  }

  console.log(`  ✗  ${name}`);
  for (const k of missing)   console.log(`       missing:    ${k}.mp3`);
  for (const f of orphaned)  console.log(`       unrecognised: ${f}`);
  failed++;
}

// ---------------------------------------------------------------------------
// Tests — one per audio category
// ---------------------------------------------------------------------------

console.log('\nAudio file coverage\n');

test(
  'letters',
  'letters',
  LETTER_ITEMS.map(l => l.audioKey)
);

test(
  'syllables',
  'syllables',
  SYLLABLE_ITEMS.map(s => s.audioKey)
);

test(
  'words',
  'words',
  WORD_ITEMS.map(w => w.audioKey)
);

test(
  'numbers',
  'numbers',
  NUMBER_ITEMS.map(n => n.audioKey)
);

test(
  'praise',
  'praise',
  PRAISE_ENTRIES.map(p => p.audioKey)
);

test(
  'phrases',
  'phrases',
  PHRASE_KEYS
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`✅  All ${passed} categories passed.\n`);
} else {
  console.log(`❌  ${failed} categor${failed === 1 ? 'y' : 'ies'} failed, ${passed} passed.\n`);
  process.exit(1);
}
