# Design: WORD_ITEMS CSV Codegen

**Date:** 2026-04-08
**Status:** Approved

## Goal

Replace the hardcoded `WORD_ITEMS` array in `src/shared/contentRegistry.ts` with a build-time codegen pipeline. A CSV file (`data/words.csv`) becomes the editorial source of truth; a script generates a TypeScript file from it.

## Files Touched

| File | Change |
|---|---|
| `data/words.csv` | New — source of truth for `WORD_ITEMS` (header row + 44 entries) |
| `scripts/generate-word-items.ts` | New — codegen script, run via `npm run codegen` |
| `src/shared/wordItems.generated.ts` | New — generated output, committed to git |
| `src/shared/contentRegistry.ts` | Updated — inline `WORD_ITEMS` array replaced with import from generated file |
| `package.json` | Updated — add `"codegen": "tsx scripts/generate-word-items.ts"` npm script |

## CSV Format

`data/words.csv` — comma-separated, header row, 4 columns:

```csv
word,syllables,emoji,audioKey
Jahoda,ja-ho-da,🍓,jahoda
Mama,ma-ma,👩,mama
```

Fields map directly to the `Word` interface in `src/shared/types.ts`. No quoting is required — none of the fields contain commas.

## Script Behaviour (`scripts/generate-word-items.ts`)

- Reads `data/words.csv` relative to the repo root using Node.js built-in `fs` — no CSV parsing library needed.
- Skips the header row and blank lines.
- Splits each line on `,` (expects exactly 4 fields); trims whitespace.
- **Validation:** throws with a clear error message (row number + raw content) if any row has fewer or more than 4 non-empty fields.
- Writes `src/shared/wordItems.generated.ts`, overwriting any previous version.
- Prints a summary on success: `Generated N word items → src/shared/wordItems.generated.ts`

## Generated Output

```ts
// AUTO-GENERATED — do not edit by hand. Run `npm run codegen` to regenerate.
import type { Word } from './types';

export const WORD_ITEMS: Word[] = [
  { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' },
  // ...
];
```

## contentRegistry.ts Change

The inline `WORD_ITEMS` array is removed. The `Word` type import is removed if it becomes unused. A single import line is added:

```ts
import { WORD_ITEMS } from './wordItems.generated';
```

The rest of `contentRegistry.ts` is unchanged — `SYLLABLE_ITEMS` is still derived from `WORD_ITEMS` at the bottom of the file, which continues to work as before.

## Compatibility: check_audio.ts

`public/audio/_review/check_audio.ts` imports `WORD_ITEMS` from `contentRegistry.ts` (not from the generated file directly). Since `contentRegistry.ts` re-exports `WORD_ITEMS` via the new import, `check_audio.ts` requires no changes.

`wordItems.generated.ts` is committed to git, so the generated file is always present — `check_audio.ts` works without running codegen first.

## Workflow

1. Edit `data/words.csv` to add, remove, or modify words.
2. Run `npm run codegen` to regenerate `src/shared/wordItems.generated.ts`.
3. Commit both `data/words.csv` and `src/shared/wordItems.generated.ts`.
