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
files and orphaned ones.

## Resolution order

`audioManager.ts` plays clip sequences and resolves each clip independently:
a parent's IndexedDB override first, then the bundled MP3, then `sk-SK` Web
Speech TTS. A missing file is therefore never an error, which is why development
works with no audio at all — and why a typo in an `audioKey` is silent. Trust
`npm run test:audio` over listening.

## Custom content

Default Slovak words live in `src/shared/locales/sk.ts`; `cs.ts` is a stub that
falls back to Slovak. Parent-added words and praise live per locale in local
storage via `localContentRepository.ts`, and recorded overrides in IndexedDB via
`audioOverrideStore.ts`. `/content` is the parent-facing surface for both;
validation rules there have their own verifier.
