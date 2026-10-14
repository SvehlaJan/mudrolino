#!/usr/bin/env npx tsx
/**
 * Check bundled audio against every shipped locale's keys and the pending-recording policy.
 * Run with --strict in shipping checks; development accepts listed pending clips.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getLocaleContent } from '../../src/shared/contentRegistry.ts';
import { SUPPORTED_LOCALES } from '../../src/shared/i18n.ts';
import { evaluateAudioInventory } from './audioInventory.ts';

interface PendingRecording {
  path: string;
  reason: string;
}

interface PendingManifest {
  policy: string;
  pending: PendingRecording[];
}

// Bundled clips live in public/audio; this tooling stays outside public so it never ships.
const audioDirectory = fileURLToPath(new URL('../../public/audio/', import.meta.url));
const toolDirectory = fileURLToPath(new URL('.', import.meta.url));
const strict = process.argv.slice(2).includes('--strict');
const unexpectedArguments = process.argv.slice(2).filter(argument => argument !== '--strict');

if (unexpectedArguments.length > 0) {
  console.error(`Unknown argument(s): ${unexpectedArguments.join(', ')}`);
  process.exit(2);
}

const expected = SUPPORTED_LOCALES.flatMap(locale => {
  const content = getLocaleContent(locale);
  return [
    ...content.letterItems.map(item => `${locale}/letters/${item.audioKey}.mp3`),
    ...content.syllableItems.map(item => `${locale}/syllables/${item.audioKey}.mp3`),
    ...content.wordItems.map(item => `${locale}/words/${item.audioKey}.mp3`),
    ...content.numberItems.map(item => `${locale}/numbers/${item.audioKey}.mp3`),
    ...content.praiseEntries.map(item => `${locale}/praise/${item.audioKey}.mp3`),
    ...Object.values(content.audioPhrases).map(item => `${locale}/phrases/${item.audioKey}.mp3`),
  ];
});

function findRecordings(directory: string): string[] {
  const recordings: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      recordings.push(...findRecordings(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.mp3')) {
      recordings.push(relative(audioDirectory, fullPath).split(sep).join('/'));
    }
  }
  return recordings;
}

const manifest = JSON.parse(
  readFileSync(join(toolDirectory, 'pending-recordings.json'), 'utf8')
) as PendingManifest;
const pending = manifest.pending.map(recording => recording.path);
const result = evaluateAudioInventory({
  expected,
  existing: findRecordings(audioDirectory),
  pending,
  strict,
});

if (result.issues.length > 0) {
  if (strict) {
    const missingCount = result.issues.filter(issue => issue.startsWith('Strict mode requires recording:')).length;
    console.error(
      `Audio inventory failed: ${missingCount} recording(s) missing, ${result.pendingCount} pending. ` +
      'Shipping requires all recordings and an empty pending list.'
    );
  }
  console.error(`Issues (${result.issues.length}):`);
  for (const issue of result.issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log(
  `Audio inventory passed: ${expected.length} expected recording(s), ` +
  `${result.pendingCount} known pending recording(s)${strict ? ' in strict mode' : ' accepted for development'}.`
);
