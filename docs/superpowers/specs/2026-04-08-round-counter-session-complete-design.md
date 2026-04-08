# Design: F1 — Round Counter + Session Complete Screen

**Date:** 2026-04-08  
**Status:** Approved

---

## Context

Games currently loop infinitely with no sense of progress or completion. This adds:
- A per-round counter visible to the child during play
- A configurable max rounds value per game (not exposed in Settings UI yet)
- A session complete screen with star rating and celebration for the parent and child

---

## Scope

Affects two game paths:
- **FindItGame** (used by Alphabet, Syllables, Numbers, Words)
- **CountingItemsGame** (standalone, separate implementation)

---

## State Tracking

### New state in FindItGame and CountingItemsGame

| Field | Type | Description |
|-------|------|-------------|
| `roundsCompleted` | `number` | Increments on each correct answer. Reset on mount. |
| `totalTaps` | `number` | Increments on every card/option tap (correct or wrong). Reset on mount. |

### Accuracy formula

```
accuracy = roundsCompleted / totalTaps
```

Where `totalTaps` is always ≥ `roundsCompleted`. If `totalTaps === 0`, accuracy is 1 (edge case, shouldn't reach session complete).

### Star rating thresholds

| Accuracy | Stars |
|----------|-------|
| > 80%    | ⭐⭐⭐ |
| 50–80%   | ⭐⭐☆ |
| < 50%    | ⭐☆☆ |

---

## Max Rounds

Added to `GameDescriptor` as an optional field:

```typescript
maxRounds?: number; // default: 10
```

Applied inside `FindItGame` with fallback:
```typescript
const maxRounds = descriptor.maxRounds ?? 10;
```

Per-game values set in descriptor factories (not yet exposed in Settings UI). Default for all games: **10**.

---

## In-Game Counter (Child-Facing)

A small pill at the top of the game screen showing current progress:

```
✓ 3 / 10
```

- Displayed above the audio button in `FindItGame`
- Same position in `CountingItemsGame` (above the emoji grid)
- Style: white rounded pill, `shadow-block`, bold text in `text-text-main`
- Updates immediately after each correct answer

---

## SessionCompleteOverlay Component

**File:** `src/shared/components/SessionCompleteOverlay.tsx`

### Props

```typescript
interface SessionCompleteOverlayProps {
  roundsCompleted: number;
  totalTaps: number;
  maxRounds: number;
  onComplete: () => void; // routes back to game HOME screen
}
```

### Visual Design

Matches `SuccessOverlay` style:
- Fixed full-screen overlay, `z-50`, `bg-bg-light/80 backdrop-blur-sm`
- Center card: `rounded-[48px]`, `border-[6px] border-white`, cream-peach gradient background, `shadow-block`
- Confetti background (same 30-particle pattern as SuccessOverlay)
- Scale-in animation

### Card Contents (top to bottom)

1. **Large emoji:** `🎉` (120px mobile, 160px desktop)
2. **Heading:** `"Hotovo!"` — `text-primary`, `font-black`, `text-5xl sm:text-7xl`
3. **Star rating:** 3 stars displayed as large emoji — `⭐` (filled) / `☆` (empty), `text-5xl`, horizontally centered
4. **Score line:** `"X z Y správne"` — `text-2xl sm:text-3xl`, `font-extrabold`, `#c06a00` (burnt orange, matching SuccessOverlay echo line)

### Behaviour

- Auto-closes after **5 seconds** (longer than round success overlay to give parent time to see it)
- Clicking anywhere on the overlay closes it early
- On close: calls `onComplete()` → game sets internal state back to `'HOME'`
- No pause button (session is over, no reason to pause)

---

## Integration Points

### FindItGame

- Add `roundsCompleted` and `totalTaps` state
- Increment `totalTaps` in `handleCardClick` on every tap
- Increment `roundsCompleted` and check against `maxRounds` on correct tap
- When `roundsCompleted >= maxRounds`: show `SessionCompleteOverlay` instead of `SuccessOverlay`
- Show round counter pill above audio button

### CountingItemsGame

- Same counters added to existing state
- Increment `totalTaps` in `handleOptionClick` on every tap
- Increment `roundsCompleted` on correct tap, check against `maxRounds` (hardcoded `10` for now, no descriptor)
- Show `SessionCompleteOverlay` when complete
- Show round counter pill above the emoji grid

### GameDescriptor (types.ts)

Add optional field:
```typescript
maxRounds?: number;
```

No change required to existing descriptors — they'll get the default of 10.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/shared/types.ts` | Add `maxRounds?: number` to `GameDescriptor` |
| `src/shared/components/SessionCompleteOverlay.tsx` | **New** — celebration + star rating screen |
| `src/shared/components/FindItGame.tsx` | Add counters, counter pill, session complete trigger |
| `src/games/counting/CountingItemsGame.tsx` | Add counters, counter pill, session complete trigger |

---

## Verification

```bash
node_modules/.bin/tsc --noEmit  # must pass

# Manual checks:
# 1. Play Alphabet game — counter shows "✓ 0 / 10" on start
# 2. Answer correctly — counter updates to "✓ 1 / 10"
# 3. Answer wrong — counter stays, totalTaps increments internally
# 4. Complete 10 rounds — SessionCompleteOverlay appears
# 5. With all correct: 3 stars. With ~50% accuracy: 2 stars. With <50%: 1 star
# 6. Overlay auto-closes after 5s → game HOME screen
# 7. Same flow in Syllables, Numbers, Words, CountingItems games
```
