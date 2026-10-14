---
paths:
  - "public/audio/**"
  - "src/shared/locales/*.ts"
  - "src/shared/services/{audioManager,audioOverrideStore}.ts"
  - "src/content/**/*.tsx"
---

# Audio and content

## File naming

Recorded `.mp3` files go in locale-prefixed directories under `public/audio/`,
named after the `audioKey` from locale content:

```
public/audio/sk/letters/a.mp3      # bare letter sound; diacritics spelled out: s-caron.mp3
public/audio/sk/syllables/ma.mp3   # bare syllable, derived from words
public/audio/sk/words/jahoda.mp3   # full spoken word
public/audio/sk/numbers/1.mp3      # number word
public/audio/sk/phrases/*.mp3      # shared prompts and verdicts
public/audio/sk/praise/*.mp3       # praise clips
public/audio/music/background.mp3  # optional, not locale-prefixed
```

Run `npm run test:audio` after touching any of these — it catches both missing
files and orphaned ones. The tooling lives in `tools/audio/` (never under
`public/`, which ships and is precached): `pending-recordings.json`, the check,
`npm run audio:sessions` to plan short recording takes from the pending list,
`process_recording.py --session` to split a take into those clips, and
`npm run audio:sync-pending` to drop recorded clips from the pending list.

## Resolution order

`audioManager.ts` plays clip sequences and resolves each clip independently:
a parent's IndexedDB override first, then the bundled MP3, then `sk-SK` Web
Speech TTS. A missing file is therefore never an error, which is why development
works with no audio at all — and why a typo in an `audioKey` is silent. Trust
`npm run test:audio` over listening.

## Custom content

Default words live in `src/shared/locales/sk.ts` and `cs.ts`; `npm run test:audio`
checks both locales, and every Czech clip is listed as pending until recorded. Parent-added words and praise live per locale in local
storage via `localContentRepository.ts`, and recorded overrides in IndexedDB via
`audioOverrideStore.ts`. `/content` is the parent-facing surface for both;
validation rules there have their own verifier.

## Family data, backups and future sync

Every change to words, praise, settings and recordings carries a change stamp,
and deletions leave markers (`src/shared/services/userData/syncMetadata.ts`, in
local storage so the recordings database keeps its version-1 schema that e2e
helpers open). Backups serialize the snapshot from `userData/snapshot.ts` and
restore by merging with `userData/merge.ts`: the newer copy of each item wins,
ties go to the incoming copy, and a deletion removes anything not newer than it.
A cross-device sync should exchange the same snapshot and reuse that merge.
Saving defaults for the first time is not a change and must not be stamped.
