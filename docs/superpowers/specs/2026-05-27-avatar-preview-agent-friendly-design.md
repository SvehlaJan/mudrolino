# Avatar Preview — Agent-Friendly Design

**Date:** 2026-05-27
**Status:** Approved

## Problem

`/avatar-preview` is the developer workbench for testing avatar garment fit. When Claude uses it
to verify garment position, several friction points appear:

1. **No machine-readable 3D data** — verifying hat/shoe world position requires executing complex
   JS in the browser and cross-referencing with Blender renders.
2. **No URL-driven state** — loading a specific garment configuration requires clicking through
   the sidebar UI (no stable selectors, no URL shortcut).
3. **Unpredictable camera** — OrbitControls let the user freely rotate the avatar; there is no
   reset button, so screenshots may capture any angle.
4. **Cluttered sidebar** — sections for features that don't exist yet (Face, Base selector, Future
   slots) and redundant diagnostics make the page harder to scan.

## Goals

- Claude can load a specific avatar config by navigating to a URL with query params.
- Claude can read bone world positions and garment fit data from the DOM without running JS.
- The camera can be reset to a known front/full-body position in one click.
- The human workbench is cleaner — only live, functional sections remain.

## Non-goals

- A separate `/avatar-debug` route (avoided to prevent duplication).
- Real-time continuous data polling (one-shot on model ready is sufficient).
- URL keeping in sync as the user adjusts the sidebar (URL is initial state only).

---

## Design

### 1. Sidebar cleanup

Remove sections that have no functional controls today:

| Removed | Reason |
|---|---|
| **Base** (Male / Female toggle) | Female always disabled; Male is the only option |
| **Face** (Placeholder / Generated decal) | Purely informational; both options non-functional |
| **Future slots** (bottom, hair) | Always-disabled placeholders add noise |
| Diagnostic: animation source, animation warning, model ready, animation clips | Internal debugging fields not needed for garment verification |
| Diagnostic: visible meshes | Redundant — already derivable from the active slot buttons |
| Diagnostic: **persisted storage JSON** | Duplicates preview config after Save; one JSON panel is enough |
| Slot button **detail text** ("embedded mesh", "plain base", "runtime GLB, debug animation") | Clutters the button list; source kind is a dev implementation detail |

What remains: Animation State, Clothing Slots (top / shoes / accessory), Body Shape, State
(persist / reset), and a simplified diagnostic panel (model URL, external assets, status,
preview config JSON).

---

### 2. URL-driven avatar state

On mount, `AvatarPreviewScreen` reads `useSearchParams()` and merges valid URL params into the
initial state. URL wins over `localStorage`; unknown or out-of-range values are silently ignored
(fall back to defaults).

| Param | Values | Example |
|---|---|---|
| `top` | Any `AvatarTopItemId` catalog ID | `top=top_shirt_blue_v1` |
| `shoes` | Any `AvatarShoesItemId` catalog ID | `shoes=shoes_blue_sneakers_v1` |
| `accessory` | Any `AvatarAccessoryItemId` catalog ID | `accessory=hat_red_cap_v1` |
| `animation` | `idle \| walk \| run \| success \| failure` | `animation=walk` |
| `scale` | Float `0.80`–`1.20` (clamped) | `scale=1.05` |
| `agent` | `1` | Enables agent clean mode (see §4) |

Example URL:
```
/avatar-preview?accessory=hat_red_cap_v1&shoes=shoes_blue_sneakers_v1&animation=idle&agent=1
```

Implementation: `AvatarPreviewScreen` calls `useSearchParams` on mount, validates each param
against the catalog, and passes valid values into `useState` initial-state factory — no extra
effect needed.

---

### 3. 3D fit data panel

After the model is ready, `AvatarModel` computes scene data and calls an `onSceneData` callback.
`AvatarPreviewScreen` stores this and renders it in two places:

**a) Visible diagnostic strip** (human-readable, readable via `preview_snapshot`):

```
Bones   Head(0.00, 0.06, 1.62)  Hips(0.00, 0.00, 0.98)  foot_L(−0.09, 0.01, 0.07)  foot_R(0.09, 0.01, 0.07)
Fit     accessory → Head  bone z=1.62  mesh-center z=1.65  Δz=+0.03  range 1.56–1.72
        shoes_L → foot_L  bone z=0.07  mesh-center z=0.05  Δz=−0.02  range 0.00–0.10
```

**b) Hidden machine-readable JSON blob**:

```html
<pre data-testid="avatar-debug-json" hidden>
{
  "bones": {
    "Head":   { "x": 0.00,  "y": 0.062, "z": 1.621 },
    "Hips":   { "x": 0.00,  "y": 0.000, "z": 0.980 },
    "foot_L": { "x": -0.09, "y": 0.007, "z": 0.070 },
    "foot_R": { "x":  0.09, "y": 0.007, "z": 0.070 }
  },
  "garments": {
    "accessory": {
      "targetBone": "Head",
      "boneWorld":  { "x": 0.00, "y": 0.062, "z": 1.621 },
      "meshCenter": { "x": 0.00, "y": 0.052, "z": 1.645 },
      "meshBounds": { "zMin": 1.560, "zMax": 1.722 }
    },
    "shoes_L": {
      "targetBone": "foot_L",
      "boneWorld":  { "x": -0.09, "y": 0.007, "z": 0.070 },
      "meshCenter": { "x": -0.09, "y": 0.000, "z": 0.048 },
      "meshBounds": { "zMin": 0.000, "zMax": 0.098 }
    },
    "shoes_R": {
      "targetBone": "foot_R",
      "boneWorld":  { "x":  0.09, "y": 0.007, "z": 0.070 },
      "meshCenter": { "x":  0.09, "y": 0.000, "z": 0.048 },
      "meshBounds": { "zMin": 0.000, "zMax": 0.098 }
    }
  }
}
</pre>
```

Claude reads the JSON with:
```js
preview_eval(`document.querySelector('[data-testid="avatar-debug-json"]').textContent`)
```
or without JS by scanning `preview_snapshot` for the human-readable strip.

**New type** in `avatarTypes.ts`:

```ts
export interface AvatarGarmentFit {
  targetBone: string;
  boneWorld: { x: number; y: number; z: number };
  meshCenter: { x: number; y: number; z: number };
  meshBounds: { zMin: number; zMax: number };
}

export interface AvatarSceneData {
  bones: Record<string, { x: number; y: number; z: number }>;
  garments: Record<string, AvatarGarmentFit>;
}
```

**How `AvatarModel` computes it**: after `onModelReady` fires, walk the bone list (Head, Hips,
foot_L, foot_R) using `getObjectByName`, call `getWorldPosition`, round to 3 decimal places.
For each active external garment, compute a bounding box across all `Mesh` descendants using
`Box3.expandByObject`, then derive `meshCenter` and Z-range. Fire `onSceneData` once.

---

### 4. Camera reset button

A small circular button in the top-right corner of the canvas (same position as the existing
skeleton toggle, now top-left). Clicking it resets OrbitControls to the default camera pose:

- Position: `(0, 1.35, 7.2)`, fov 34 — matches the current `AvatarScene` default
- Target: `(0, 1.25, 0)`

Implementation: `AvatarPresenter` accepts an `onResetCamera` ref (or a `resetCamera` trigger
prop). Inside the R3F canvas, a component listens to the trigger and calls
`controls.current.reset()` after restoring the camera to the default pose. The button itself
lives in `AvatarPreviewScreen` (outside the canvas) and calls the ref.

---

### 5. Agent clean mode (`?agent=1`)

When `agent=1` is present in the URL:

- The sidebar (`<aside>`) is hidden (`display: none` or conditional render).
- The canvas fills the full page width.
- The compact 3D debug strip is shown below the canvas (same data, denser layout).
- The hidden `data-testid="avatar-debug-json"` blob is always rendered regardless of mode.

The page title changes to "Avatar debug" in agent mode for clarity in `preview_snapshot` output.

---

### 6. `data-testid` attributes on interactive controls

All slot buttons and animation buttons get stable testid attributes so Claude can target them
reliably with `preview_click`:

| Element | `data-testid` |
|---|---|
| Top slot button for `{id}` | `slot-top-{id}` |
| Shoes slot button for `{id}` | `slot-shoes-{id}` |
| Accessory slot button for `{id}` | `slot-accessory-{id}` |
| Animation button for `{name}` | `animation-{name}` |
| Camera reset button | `camera-reset` |
| Skeleton toggle button | `skeleton-toggle` |
| Persist button | `avatar-persist` |

---

## Files changed

| File | Change |
|---|---|
| `src/avatar/avatarTypes.ts` | Add `AvatarGarmentFit`, `AvatarSceneData` |
| `src/avatar/AvatarModel.tsx` | Compute bone positions + garment bounding boxes; fire `onSceneData` |
| `src/avatar/AvatarScene.tsx` | Add `onSceneData` prop (thread to `AvatarModel`); capture OrbitControls ref; expose camera reset callback |
| `src/avatar/AvatarPresenter.tsx` | Thread `onSceneData` and camera reset callback down to `AvatarScene` |
| `src/avatar/AvatarPreviewScreen.tsx` | URL params, sidebar cleanup, 3D data display, agent mode, `data-testid` attrs, camera reset button |

No changes to catalog, store, or asset resolver.

---

## Error handling

- If a named bone is not found in the scene, its entry is omitted from `bones` (not an error).
- If a garment has no `Mesh` descendants (e.g., loading failed), its entry is omitted from
  `garments`.
- Invalid URL param values (wrong ID, out-of-range float) are silently ignored; the default from
  localStorage or the catalog default is used instead.
- `onSceneData` is called exactly once per model-ready event; stale data from a previous config
  is replaced when the model reloads.
