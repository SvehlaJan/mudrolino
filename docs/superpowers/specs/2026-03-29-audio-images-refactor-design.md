# Design: Audio Files, Emoji Images & Content Architecture Refactor

**Date:** 2026-03-29
**Status:** Approved

## Overview

Replace Web Speech API (TTS) with real audio files, introduce a typed content model that makes all games data-driven, extract a shared `SuccessOverlay` component with emoji mascot feedback, and define the architecture that future games will build on.

---

## 1. Content Model

### `ContentItem` type (`src/shared/types.ts`)

```ts
interface ContentItem {
  symbol: string       // Display character: "A", "Š", "MA", "3", "jablko"
  label?: string       // Human-readable word associated with symbol, e.g. "Ananás" for A
  emoji?: string       // Optional emoji: "🍎" — used in picture-based games and echo lines
  audioKey: string     // ASCII slug for audio file path: "a", "s-caron", "ma", "3"
  category: 'letter' | 'syllable' | 'number' | 'word'
}

interface PraiseEntry {
  emoji: string        // "🌟"
  text: string         // "Výborne!"
  audioKey: string     // "vyborne" → praise/vyborne.mp3
}

type PhraseTemplate =
  | 'find-letter'
  | 'wrong-letter'
  | 'find-number'
  | 'wrong-number'
  | 'find-syllable'
  | 'wrong-syllable'
  | 'count-items'
  | 'correct-count'
  | 'wrong-count'
```

### `contentRegistry.ts` (`src/shared/contentRegistry.ts`)

Replaces `constants.ts`. Exports:

- `LETTER_ITEMS: ContentItem[]` — full Slovak alphabet (46 letters; letters marked TBD below are excluded from games until their mapping is defined)
- `SYLLABLE_ITEMS: ContentItem[]` — 60 syllables from current code (simple consonant + vowel pairs only; diacritical syllables like ŠA/ČE are out of scope for this feature)
- `NUMBER_ITEMS: ContentItem[]` — numbers 1–20
- `WORD_ITEMS: ContentItem[]` — empty scaffold for future word games
- `PRAISE_ENTRIES: PraiseEntry[]` — 6 praise variants

`constants.ts` re-exports from `contentRegistry.ts` for backward compatibility during migration, then is deleted.

### Slovak alphabet letter set (46 letters)

```
A Á Ä B C Č D Ď DZ DŽ E É F G H CH I Í J K L Ľ Ĺ M N Ň O Ó Ô P Q R Ŕ S Š T Ť U Ú V W X Y Ý Z Ž
```

DZ and DŽ are digraphs treated as single letters in Slovak. Q, W, X, Y appear only in loanwords.

### Complete `audioKey` mapping for diacritical and special letters

| Symbol | audioKey     |
|--------|--------------|
| Á      | a-acute      |
| Ä      | a-umlaut     |
| Č      | c-caron      |
| Ď      | d-caron      |
| É      | e-acute      |
| Í      | i-acute      |
| Ĺ      | l-acute      |
| Ľ      | l-caron      |
| Ň      | n-caron      |
| Ó      | o-acute      |
| Ô      | o-circumflex |
| Ŕ      | r-acute      |
| Š      | s-caron      |
| Ť      | t-caron      |
| Ú      | u-acute      |
| Ý      | y-acute      |
| Ž      | z-caron      |
| DZ     | dz           |
| DŽ     | dzh          |
| CH     | ch           |

Base Latin letters use lowercase: `a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `p`, `q`, `r`, `s`, `t`, `u`, `v`, `w`, `x`, `y`, `z`.

### Letter emoji and label associations

Letters marked **TBD** are excluded from games until a Slovak-appropriate label and emoji are confirmed. All emoji are unique across the table.

| Symbol | emoji | label      | Notes |
|--------|-------|------------|-------|
| A      | 🍎    | Ananás     | pineapple |
| Á      | 🚗    | Áuto       | car |
| Ä      | TBD   | TBD        | rare in child vocabulary |
| B      | 🐏    | Baran      | ram |
| C      | 🍋    | Citrón     | lemon |
| Č      | 🍒    | Čerešňa    | cherry |
| D      | 🌈    | Dúha       | rainbow |
| Ď      | 🫶    | Ďakujem    | thank you |
| DZ     | TBD   | TBD        | rare start for child vocab |
| DŽ     | 🌴    | Džungľa    | jungle |
| E      | 🦔    | Ežko       | hedgehog |
| É      | TBD   | TBD        | rare in child vocabulary |
| F      | 🎨    | Farba      | paint/colour |
| G      | 🎸    | Gitara     | guitar |
| H      | 🏰    | Hrad       | castle |
| CH     | 🍞    | Chlieb     | bread |
| I      | ⚡    | Iskra      | spark |
| Í      | 🦢    | Íbis       | ibis |
| J      | 🍓    | Jahoda     | strawberry |
| K      | 🗝️    | Kľúč       | key |
| L      | 🦊    | Líška      | fox |
| Ľ      | 🧊    | Ľad        | ice |
| Ĺ      | TBD   | TBD        | rare in child vocabulary |
| M      | 🌙    | Mesiac     | moon |
| N      | ☁️    | Nebe       | sky |
| Ň      | TBD   | TBD        | rare in child vocabulary |
| O      | 🐑    | Ovca       | sheep |
| Ó      | TBD   | TBD        | rare in child vocabulary |
| Ô      | TBD   | TBD        | rare in child vocabulary |
| P      | 🐕    | Pes        | dog |
| Q      | TBD   | TBD        | loanword letter |
| R      | 🐟    | Ryba       | fish |
| Ŕ      | TBD   | TBD        | rare in child vocabulary |
| S      | ☀️    | Slnko      | sun |
| Š      | 🐌    | Šnek       | snail |
| T      | 🐯    | Tiger      | tiger |
| Ť      | 🐪    | Ťava       | camel |
| U      | 👂    | Ucho       | ear |
| Ú      | 🌅    | Úsvit      | sunrise |
| V      | 🐺    | Vlk        | wolf |
| W      | TBD   | TBD        | loanword letter |
| X      | 🎹    | Xylofón    | xylophone |
| Y      | TBD   | TBD        | loanword letter |
| Ý      | TBD   | TBD        | rare in child vocabulary |
| Z      | 🦓    | Zebra      | zebra |
| Ž      | 🐸    | Žaba       | frog |

All emoji in this table are unique. TBD letters are scaffolded in `contentRegistry.ts` with `emoji: undefined` and `label: undefined`, and are filtered out of game grids at runtime.

---

## 2. Audio System

### File layout

All audio lives under `public/audio/`. Filenames reflect the spoken content.

```
public/audio/
  letters/      a.mp3  b.mp3  c-caron.mp3  d-caron.mp3  dz.mp3  dzh.mp3  ...
  syllables/    ma.mp3  me.mp3  mi.mp3  mo.mp3  mu.mp3  ta.mp3  ...
  numbers/      1.mp3  2.mp3  3.mp3  ...  20.mp3
  phrases/      najdi-pismeno.mp3       (says: "Nájdi písmenko")
                toto-je-pismeno.mp3     (says: "Toto je písmenko")
                skus-to-znova.mp3       (says: "Skús to znova")
                spocitaj-predmety.mp3   (says: "Spočítaj predmety")
                ano-je-ich.mp3          (says: "Áno, je ich")
                nie-je-ich.mp3          (says: "Nie, je ich")
                cislo.mp3               (says: "Číslo")
                slabika.mp3             (says: "Slabika")
  praise/       vyborne.mp3             (says: "Výborne!")
                skvela-praca.mp3        (says: "Skvelá práca!")
                si-sikovny.mp3          (says: "Si šikovný!")
                to-je-ono.mp3           (says: "To je ono!")
                uzasne.mp3              (says: "Úžasné!")
                parada.mp3              (says: "Paráda!")
```

### `AudioManager` refactor (`src/shared/services/audioManager.ts`)

**Phrase template map (internal).**
`{target}` = the correct answer `ContentItem`; `{selected}` = what the player tapped (only used in `wrong-letter`).

```ts
const PHRASE_TEMPLATES: Record<PhraseTemplate, Array<string | '{target}' | '{selected}'>> = {
  // Prompt: "Nájdi písmenko [target letter]"
  'find-letter':   ['phrases/najdi-pismeno', '{target}'],

  // Wrong answer: "Toto je písmenko [letter they tapped]. Skús to znova."
  'wrong-letter':  ['phrases/toto-je-pismeno', '{selected}', 'phrases/skus-to-znova'],

  // Prompt: "Číslo [target number]"
  'find-number':   ['phrases/cislo', '{target}'],

  // Wrong answer: "Skús to znova." (no item echo — avoids unnatural sentence construction)
  'wrong-number':  ['phrases/skus-to-znova'],

  // Prompt: "Slabika [target syllable]"
  'find-syllable': ['phrases/slabika', '{target}'],

  // Wrong answer: re-states correct target — "Slabika [target]. Skús to znova."
  'wrong-syllable':['phrases/slabika', '{target}', 'phrases/skus-to-znova'],

  // Prompt: "Spočítaj predmety"
  'count-items':   ['phrases/spocitaj-predmety'],

  // Correct count: "Áno, je ich [count]"
  'correct-count': ['phrases/ano-je-ich', '{target}'],

  // Wrong count: "Nie, je ich [correct count]. Skús to znova."
  'wrong-count':   ['phrases/nie-je-ich', '{target}', 'phrases/skus-to-znova'],
}
```

**Public API:**

```ts
// Parameterized announcement
// target: the correct ContentItem; selected: what the player tapped (only for wrong-letter)
playAnnouncement(template: PhraseTemplate, target: ContentItem, selected?: ContentItem): void

// Convenience wrappers (kept for readability; all accept ContentItem, not primitives)
playLetter(target: ContentItem): void     // → playAnnouncement('find-letter', target)
playNumber(target: ContentItem): void     // → playAnnouncement('find-number', target)
playSyllable(target: ContentItem): void   // → playAnnouncement('find-syllable', target)

// Praise — picks randomly if no entry given
playPraise(entry?: PraiseEntry): void
```

The old `playWord(text: string)` method is removed. All 4 game components are updated to pass `ContentItem` objects instead of raw `string`/`number` primitives.

**Playback logic:**

```ts
// Plays a sequence of audio clips in order.
// On any failure (404, decode error), falls back to TTS for the full phrase.
private async playSequence(
  parts: Array<string | ContentItem>,
  fallbackText: string
): Promise<void>
```

**TTS fallback:** if any clip in the sequence fails, the entire phrase falls back to `speechSynthesis` using the existing text strings. The app works during development before all files are provided.

**Audio unlock:** the existing `click`/`touchstart` unlock listener in `App.tsx` is kept — still needed for the TTS fallback path on mobile browsers.

---

## 3. `SuccessOverlay` Shared Component

**Location:** `src/shared/components/SuccessOverlay.tsx`

**Props:**

```ts
interface SuccessOverlayProps {
  show: boolean
  item: ContentItem             // what the child just found
  onComplete: () => void        // fired after 3000ms; parent calls startNewRound()
}
```

**Echo line** is derived from `item.category`:

| category   | echo line format                          | example              |
|------------|-------------------------------------------|----------------------|
| `'letter'` | `"{symbol} ako {label} {emoji}"`          | "A ako Ananás 🍎"    |
| `'number'` | `"Správne, je ich {symbol} {emoji ?? '⭐'}"` | "Správne, je ich 3 ⭐" |
| `'syllable'`| `"{symbol} {emoji ?? '🗣️'}"`            | "MA 🗣️"             |
| `'word'`   | `"{symbol} {emoji}"`                      | fallback             |

If `item.label` is undefined (TBD letter), the echo line is just `"{symbol} {emoji ?? ''}"`.

**Behaviour:**

- On `show → true`: picks a random `PraiseEntry` from `PRAISE_ENTRIES`, plays `audioManager.playPraise(entry)`
- Displays: large mascot emoji + praise text + echo line
- After 3000ms, calls `onComplete()`
- Contains the confetti animation (extracted from all 4 games)

---

## 4. Game Refactoring

All 4 existing games are refactored to be data-driven against `ContentItem[]`.

**Per-game correct-answer audio:**

| Game           | on correct answer calls                          |
|----------------|--------------------------------------------------|
| AlphabetGame   | `playPraise()` (no `correct-count` — not counting) |
| SyllablesGame  | `playPraise()`                                   |
| NumbersGame    | `playPraise()`                                   |
| CountingItemsGame | `playAnnouncement('correct-count', targetItem)` then `playPraise()` |

**Per-game wrong-answer audio:**

| Game              | on wrong answer calls                                          |
|-------------------|----------------------------------------------------------------|
| AlphabetGame      | `playAnnouncement('wrong-letter', target, selectedItem)`       |
| SyllablesGame     | `playAnnouncement('wrong-syllable', target)`                   |
| NumbersGame       | `playAnnouncement('wrong-number', target)`                     |
| CountingItemsGame | `playAnnouncement('wrong-count', target)`                      |

**Each game's general responsibilities:**

1. Derive a `ContentItem[]` slice from `contentRegistry` (filtered/ranged as needed; TBD letters excluded)
2. Pick a random `ContentItem` as the target
3. Build a distractor grid from the same array (compare by `item.symbol`)
4. On correct: call per-game audio (table above), set `showSuccess = true`
5. On wrong: call per-game audio (table above)
6. Pass `item={target}`, `show={showSuccess}`, `onComplete={startNewRound}` to `<SuccessOverlay>`

**AlphabetGame** uses `LETTER_ITEMS` (full Slovak alphabet, replacing current 26-letter English set).

---

## 5. Future Game Architecture (scaffold only — not implemented)

| Game | Show | Player picks | ContentItem fields used |
|------|------|--------------|------------------------|
| Uppercase/lowercase matching | uppercase `symbol` | matching lowercase card | `symbol` |
| First letter from picture | `emoji` | `symbol` (letter) | `emoji`, `symbol` |
| Word card from picture | `emoji` | `symbol` (word) | `emoji`, `symbol`, `label` |

`WORD_ITEMS` in `contentRegistry.ts` is the empty scaffold for game 3. No game components are created in this feature.

---

## 6. File Changes Summary

| Action | File |
|--------|------|
| New | `src/shared/contentRegistry.ts` |
| New | `src/shared/components/SuccessOverlay.tsx` |
| New | `public/audio/` directory structure (empty; no placeholder files required) |
| Modified | `src/shared/types.ts` |
| Modified | `src/shared/services/audioManager.ts` |
| Modified | `src/games/alphabet/AlphabetGame.tsx` |
| Modified | `src/games/syllables/SyllablesGame.tsx` |
| Modified | `src/games/numbers/NumbersGame.tsx` |
| Modified | `src/games/counting/CountingItemsGame.tsx` |
| Modified | `docs/ALPHABET_PRD.md` + other PRDs |
| Transitional → deleted | `src/shared/constants.ts` |
