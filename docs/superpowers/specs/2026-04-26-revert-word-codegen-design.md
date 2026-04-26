# Revert Word Items Codegen

**Date:** 2026-04-26  
**Status:** Design approved

## Goal

Remove the word-items code generation pipeline and inline word content directly into locale files, consistent with how letters, numbers, and phrases are structured.

## Current State

- `data/words.csv` (20 Slovak words) → source of truth
- `scripts/generate-word-items.ts` → generates `src/shared/wordItems.generated.ts`
- `src/shared/locales/sk.ts` → imports & re-exports generated `WORD_ITEMS`
- `src/shared/locales/cs.ts` → empty `WORD_ITEMS` stub (Czech locale)
- Other content (letters, numbers, phrases) already inline in locale files

## Design

### Structure

**Remove:**
- `data/words.csv`
- `scripts/generate-word-items.ts`
- `src/shared/wordItems.generated.ts`

**Modify:**
- `src/shared/locales/sk.ts` — add `WORD_ITEMS` array inline
- `src/shared/locales/cs.ts` — populate `WORD_ITEMS` array when Czech translation is ready (currently empty)

### Word Item Format

Keep existing `Word` type from `src/shared/types.ts`:
```typescript
{ word: string; syllables: string; emoji: string; audioKey: string }
```

Move all 20 items from CSV into `sk.ts` WORD_ITEMS array.

### Build & Scripts

- Remove `npm run codegen` reference or repurpose if other generators exist
- No build step required — words are static TypeScript

### Locale Independence

Each locale file owns its own `WORD_ITEMS` array. Slovak and Czech can have different word lists (supports localization flexibility). No cross-locale dependencies.

## Testing

Verify:
- `src/shared/locales/sk.ts` exports 20 word items
- `src/shared/locales/cs.ts` exports empty array (or populated Czech items if available)
- `contentRegistry.ts` can import from the correct locale
- No broken imports in codebase (should be none, since only `sk.ts` was exporting before)
- App builds and runs without errors

## Files Changed

| File | Change |
|------|--------|
| `src/shared/locales/sk.ts` | Add `WORD_ITEMS` array (inline) |
| `src/shared/locales/cs.ts` | Keep empty `WORD_ITEMS` (placeholder for future Czech content) |
| `data/words.csv` | **Delete** |
| `scripts/generate-word-items.ts` | **Delete** |
| `src/shared/wordItems.generated.ts` | **Delete** |
| `package.json` | Remove `codegen` script if it only generates words |
