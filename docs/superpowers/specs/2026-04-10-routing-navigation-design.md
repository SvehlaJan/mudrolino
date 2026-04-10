# Routing & Navigation Design

**Date:** 2026-04-10

## Goal

Add proper browser-native navigation to Hravé Učenie so that:
- The system/browser back button on mobile returns to the home screen when playing a game
- Each game has a clean, bookmarkable URL

## URL Structure

| Screen | URL |
|--------|-----|
| Home | `/` |
| Alphabet game | `/alphabet` |
| Syllables game | `/syllables` |
| Numbers game | `/numbers` |
| Counting game | `/counting` |
| Words game | `/words` |

Settings and ParentsGate remain as overlays with no URL — they are transient and parent-gated. Navigating directly to `/alphabet` opens the game lobby immediately.

## Architecture

**Router**: React Router v6 (`react-router-dom`). `<BrowserRouter>` wraps the app in `main.tsx`.

**`App.tsx`**: The `screen`/`activeGame` state machine is replaced by `<Routes>`. Each game gets a `<Route path="/alphabet" element={...} />` etc. The `Screen` type is deleted from `types.ts`. Settings overlay state (`settingsSource`, open/closed) remains as local state in `App.tsx` — no URL change.

**Back button**: Works natively. Browser back from `/alphabet` navigates to `/`. Each game component's `onExit` prop is wired to `navigate('/')`.

**AnimatePresence**: Kept for page transitions, keyed by `location.pathname`.

**Scroll restoration**: `ScrollRestorer` component and `homeScroll` state are replaced. A `useLayoutEffect` hook on location change restores the saved scroll position when returning to `/`. The saved position is stored in a `useRef` inside `App`.

**Settings flow**: Unchanged. `PARENTS_GATE` and `SETTINGS` remain internal overlay state, not routes.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `react-router-dom` dependency |
| `main.tsx` | Wrap `<App>` in `<BrowserRouter>` |
| `App.tsx` | Replace state machine with `<Routes>`, wire `onExit` to `navigate('/')`, update scroll restoration |
| `src/shared/types.ts` | Delete `Screen` type |

No changes to individual game components — only the `onExit` prop wiring changes (at the call site in `App.tsx`).

## Production Note

Any static host serving this SPA needs a catch-all rewrite to `index.html`. For Caddy: `rewrite * /index.html` inside the site block. Vite's `vite preview` handles this automatically.
