# Feedback Form Design

**Date:** 2026-04-23  
**Status:** Approved

## Overview

Add a parent-facing feedback form to the Rodičovská zóna (settings). Parents can report bugs, suggest improvements, send praise, or send general messages. Feedback is delivered to the developer via email using the Web3Forms free API. No backend required.

Expected volume: < 100 submissions/month. Web3Forms free tier covers 250/month.

---

## Entry Point

A new card is added at the **bottom of `SettingsContent`**, shown only when `target === 'home'` (the main Rodičovská zóna screen, not game-specific settings overlays). The card contains a brief description and a primary action button: **"Odoslať spätnú väzbu"**.

Tapping the button opens `FeedbackModal` as a full-screen overlay, consistent with the existing overlay pattern in the app.

---

## Feedback Modal

### Category selector

Four mutually exclusive tile buttons. One must be selected before the form can be submitted.

| Value | Slovak label | Emoji |
|-------|-------------|-------|
| `bug` | Chyba v hre | 🐛 |
| `suggestion` | Nápad / návrh | 💡 |
| `praise` | Pochvala | ⭐ |
| `other` | Iné | 💬 |

### Message field

Optional free-text textarea. Max 1 000 characters; show a character counter when the remaining count drops below 100.

### Screenshot hint

Below the textarea: a short line noting that screenshots can be sent to `jan.svehla@pm.me`.

### Submit button

Disabled until a category is selected. Transitions through `submitting` state (spinner, inputs locked) to prevent double-submission.

### Form states

| State | Behaviour |
|-------|-----------|
| `idle` | Form shown, submit enabled once category selected |
| `submitting` | Button shows spinner, all inputs disabled |
| `success` | Form replaced with a thank-you screen ("Ďakujeme!"); auto-closes after 3 s or on explicit button tap |
| `error` | Inline error message below button: "Odosielanie zlyhalo. Skúste znova." Form stays filled so the parent can retry |

---

## Payload

Submitted via `POST https://api.web3forms.com/submit` as JSON.

```json
{
  "access_key": "<VITE_WEB3FORMS_KEY>",
  "subject": "Spätná väzba: <category label>",
  "from_name": "Hravé Učenie",

  "category": "bug | suggestion | praise | other",
  "message": "<optional text, max 1000 chars>",

  "screen": "<route string passed as prop, e.g. /settings>",
  "browser": "<parsed from navigator.userAgent, e.g. Chrome 124 / Android>",
  "language": "<navigator.language, e.g. sk-SK>",
  "screen_size": "<window.innerWidth>×<window.innerHeight>",
  "timestamp": "<ISO 8601 UTC>"
}
```

`access_key` is read from `import.meta.env.VITE_WEB3FORMS_KEY`. If the key is missing, the submit button is hidden and a dev-only warning is logged to the console.

---

## Component Structure

### New files

**`src/shared/components/FeedbackModal.tsx`**  
Self-contained modal. Manages its own form state (`idle | submitting | success | error`). Calls `feedbackService.submitFeedback()`.

Props:
```ts
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: string; // current route or screen identifier, e.g. "/settings"
}
```

**`src/shared/services/feedbackService.ts`**  
Two exports:
- `collectMetadata(screen: string): FeedbackMetadata` — gathers browser, language, screen size, timestamp
- `submitFeedback(payload: FeedbackPayload): Promise<void>` — POSTs to Web3Forms, throws on non-ok response

### Edited files

**`src/shared/components/SettingsContent.tsx`**  
- Add feedback card at the bottom of the scrollable content
- Add `isFeedbackOpen` state + `<FeedbackModal isOpen={isFeedbackOpen} onClose={…} screen="/settings" />`

**`.env.example`**  
- Add `VITE_WEB3FORMS_KEY=your_key_here`

---

## Setup Steps (one-time)

1. Create a free account at [web3forms.com](https://web3forms.com)
2. Generate an access key for the project email address
3. Add the key to `.env` as `VITE_WEB3FORMS_KEY`

---

## Out of Scope (v1)

- Image / screenshot upload (mention email address in the form instead)
- Feedback visible inside the app (responses go to developer email only)
- Rate-limiting or spam protection beyond Web3Forms' built-in honeypot
- Feedback from individual game screens (entry point is settings only for now; `screen` prop makes it easy to add later)
