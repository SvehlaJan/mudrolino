#!/usr/bin/env npx tsx
/**
 * Removes pending entries whose recording now exists in public/audio, so the
 * audio check accepts newly recorded clips. Run after adding recordings:
 *
 *   npm run audio:sync-pending
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PendingEntry { path: string; reason: string }
interface PendingManifest { policy: string; pending: PendingEntry[] }

const toolDirectory = fileURLToPath(new URL('.', import.meta.url));
const audioDirectory = fileURLToPath(new URL('../../public/audio/', import.meta.url));
const manifestPath = join(toolDirectory, 'pending-recordings.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PendingManifest;
const recorded = manifest.pending.filter(entry => existsSync(join(audioDirectory, entry.path)));
const pending = manifest.pending.filter(entry => !recorded.includes(entry));

// One entry per line keeps diffs readable when a take lands.
const lines = pending.map(entry => `    ${JSON.stringify(entry)}`).join(',\n');
writeFileSync(manifestPath, `{\n  "policy": ${JSON.stringify(manifest.policy)},\n  "pending": [\n${lines}${lines ? '\n' : ''}  ]\n}\n`);

console.log(`Removed ${recorded.length} recorded clip(s) from the pending list; ${pending.length} still pending.`);
for (const entry of recorded) console.log(`  ✓ ${entry.path}`);
