#!/usr/bin/env npx tsx
/**
 * Plans recording takes from the pending list: one short take per category.
 *
 *   npm run audio:sessions                 # every locale with pending clips
 *   npm run audio:sessions -- --locale cs  # one locale
 *
 * Writes tools/audio/sessions/<take>.tsv (read by process_recording.py) and
 * <locale>-script.md, a numbered script to read from while recording.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLocaleContent } from '../../src/shared/contentRegistry.ts';
import { SUPPORTED_LOCALES } from '../../src/shared/i18n.ts';
import { describePending, planTakes, toSessionFile } from './recordingPlan.ts';

const toolDirectory = fileURLToPath(new URL('.', import.meta.url));
const sessionDirectory = join(toolDirectory, 'sessions');

const args = process.argv.slice(2);
const localeIndex = args.indexOf('--locale');
const requested = localeIndex >= 0 ? args[localeIndex + 1] : null;
if (requested && !(SUPPORTED_LOCALES as readonly string[]).includes(requested)) {
  console.error(`Unknown locale "${requested}". Use one of: ${SUPPORTED_LOCALES.join(', ')}`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(join(toolDirectory, 'pending-recordings.json'), 'utf8')) as { pending: { path: string }[] };
const { clips, unknown } = describePending(manifest.pending.map(entry => entry.path), getLocaleContent);
if (unknown.length > 0) {
  console.warn(`Skipping ${unknown.length} pending path(s) the content no longer plays:\n  ${unknown.join('\n  ')}`);
}

mkdirSync(sessionDirectory, { recursive: true });
for (const locale of requested ? [requested] : SUPPORTED_LOCALES) {
  const takes = planTakes(locale, clips);
  if (takes.length === 0) {
    console.log(`${locale}: nothing pending.`);
    continue;
  }
  const script = [
    `# Nahrávanie — ${locale.toUpperCase()}`,
    '',
    'Každý blok je jedna nahrávka. Medzi položkami spravte pauzu asi 1 sekundu.',
    'Pri chybe nahrajte celý blok znova: opakovaná položka by posunula všetky ďalšie súbory.',
    'Písmená vyslovujte rovnako ako v existujúcich slovenských nahrávkach.',
    '',
  ];
  for (const take of takes) {
    writeFileSync(join(sessionDirectory, `${take.name}.tsv`), toSessionFile(take));
    script.push(`## ${take.name} — ${take.title} (${take.clips.length})`, '');
    take.clips.forEach((clip, index) => script.push(`${index + 1}. ${clip.label}`));
    script.push('');
  }
  writeFileSync(join(sessionDirectory, `${locale}-script.md`), script.join('\n'));
  const total = takes.reduce((sum, take) => sum + take.clips.length, 0);
  console.log(`${locale}: ${total} clip(s) in ${takes.length} take(s); script: tools/audio/sessions/${locale}-script.md`);
  for (const take of takes) console.log(`  ${take.name}.tsv  ${take.title} (${take.clips.length})`);
}
console.log('\nAfter recording a take:\n  python3 tools/audio/process_recording.py <take.m4a> --session tools/audio/sessions/<take>.tsv');
