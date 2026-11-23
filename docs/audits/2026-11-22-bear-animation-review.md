# Bear Companion Audit & `celebration-v8` Overhaul Review (2026-11-22)

**Branch:** `feat/bear-v8-living-companion`  
**Candidate Model (`celebration-v8`):** `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v8/web-v1/model.glb` (`1,328,332` raw / `894,752` gzip bytes, `14,363` triangles, SHA-256 `b4147acf0fbf89c96cb1999fd15be49d9b1d0f413b8c9dc46862151076cfe249`)  
**Published Baseline (`celebration-v7`):** `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb` (`1,190,036` raw / `833,923` gzip bytes in current GLB analysis; `826,942` recorded at publish, `18` clips, `15` quality warnings)  
**Production Publication Status:** **Local preview ready (`artReview.status: "pending"`).** Production `src/avatar/companions/bear-v1.json` and `src/avatar/companions/bear-still.png` remain intentionally untouched on `celebration-v7` pending explicit visual approval from Mr. Tinkleberry. **0 Meshy credits spent.**

---

## 1. Executive Summary (`v7 -> v8`)

1. **Root-caused and eliminated the Double Eyebrows defect (0 Meshy credits):**
   - `meshy-rig-v1/rigged.glb` is a single welded continuous surface with **+2.2 to +2.6 cm protruding 3D sculpted brow ridges** (`|x| ∈ [11..27], y ∈ [45.4..56.5], z > 28`) plus dark baked diffuse color, embossed normal bump, and low roughness on UV islands around `u ~ 0.92..0.97, v ~ 0.71..0.76`.
   - When procedural `leftBrow` / `rightBrow` torus arches rendered at runtime, both sets of eyebrows appeared simultaneously.
   - `clean_sculpted_eyebrows()` in `tools/blender/catalog/build_generated_bear_celebration.py` performs bilateral per-side degree-2 quadric surface fitting (`z(x,y)`) with cosine feathering (`left` moved `494` vertices, `max_delta_cm = 2.712`; `right` moved `389` vertices, `max_delta_cm = 2.353`) and blends surrounding forehead texels across `43,130` texels on BaseColor, Normal, and MetallicRoughness maps (repacking fresh `bpy.data.images` before Cycles/glTF export). `BROW_RIGHT_OFFSET` (`[-17.3, 40.4, 37.65]`) was calibrated and verified via Head-local Three.js raycast (`0` surface penetrations, `<= 2.5 cm` max float).

2. **Quality warnings reduced from `15` (`v7`) -> `0` (`v8`) across `24` clips:**
   - **Replaced stiff T/A-pose rest returns** (`frame 0`) with a warm relaxed standing stance (`apply_natural_stance()` + quintic C² envelopes) and **grounded lower-body weight shifts, knee cushions, and ankle compensates across all 24 clips** (0 `frozen-lower-body` warnings vs 11 in `v7`).
   - **Fixed `high-jerk` spikes** (`jump`: `10,038 -> 4,148 °/s²`, `finale`: `7,447 -> 4,622 °/s²`, `march`: `6,967 -> 4,942 °/s²`) and smoothed spine-to-limb overlapping follow-through (`phase_lag()`).
   - **Replaced unpersuasive/awkward `v7` poses:** fixed `listen` high-elbow arm twist to a lower attentive ear-cup lean; fixed `encourage` "surrender hands-up" to forward fist pumps + supportive nod; refined `shrug`, `wave`, `clap`, and `flex` (with calibrated `flexMask` `cy = 36.2`).
   - **Added 6 new clips (18 -> 24):** `walk` (`1.6s` seamless `2π`-periodic waddle cycle for cross-screen transitions), `point_down`, `gentle_try_again`, `talk_explain`, `count_one_two_three`, and `sleepy_yawn` (with `0.78`-peak drowsy eyelid curve).
   - **Livelier living idle:** boosted `idle` (`3.2s`, `21.1 °/s`) and `idle_breathe` (`3.6s`, `9.9 -> 17.3 °/s`) with soft buoyancy and curiosity head sweeps.

3. **Full 30 Hz `FLOAT32` keyframe fidelity under the 900 KB gzip ceiling:**
   - Removed lossy `resample()` from `tools/avatar/optimize_generated_bear.mjs` (which caused `77.26 µm` parity drift on `sleepy_yawn` and `33.60 µm` on `stretch`) and packed `256×256` normal/metallicRoughness maps alongside `1024×1024` WebP (`q=68`) baseColor (`894,752` gzip bytes, `0` glTF-Validator errors/warnings).
   - Passed **all 24 clips** at 120 Hz sampling (`21.79 µm` worst-case vertex parity across `6,528` subframes vs `30 µm` ceiling) and BVH self-collision clearance (`0` new `arm-torso-leg` and `0` new `arm-head` contact pairs).

4. **Hardening, Living Stage Behavior & Cross-Screen Walking:**
   - **Hardening Pass:** fixed WebGL error blank-slot fallbacks (`companionStage.ts` / `CompanionStageContext.tsx`), stale `modelReady` reset across >500ms route detaches (`AvatarModel.tsx`), extracted renderer/observer helpers (`AvatarScene.tsx`), and added 3-way Parent `Medvedík sprievodca` (`Živý 3D` / `Obrázok` / `Vypnutý`) in `AppSettingsScreen.tsx` (SK + `cs.ui.ts`).
   - **Living Stage & Walk Glides:** continuous living idle (`idleAfterOnce: 'idle_breathe'`), `0.22s` clip cross-fades (`transitionAvatarAction`), `±2°` procedural `Head` curiosity drift during live idles, automatic `0 fps` pause on `document.hidden` / `paused` / `CompanionMode !== 'animated'`, `24s` 2nd-stage `'sleepy_yawn'` nudge, `gameId`-aware prompt clips (`count_one_two_three` / `talk_explain`) + retry cycle (`gentle_try_again -> encourage -> shrug`), and cross-screen `'walk'` viewport glides across Home ↔ GamePrompt ↔ Overlays (`companionWalkTransition.ts` + `PersistentRendererHost`).

---

## 2. Quantitative Per-Clip Comparison (`celebration-v7` vs `celebration-v8`)

Baseline source: [`v7-quality-baseline.json`](file:///home/skclaw/PROJECTS/mudrolino/artifacts/verification/bear-companion/v7-quality-baseline.json).  
Candidate sources: [`v8-quality.json`](file:///home/skclaw/PROJECTS/mudrolino/artifacts/verification/bear-companion/v8-quality.json), [`native-runtime-parity.json`](file:///home/skclaw/PROJECTS/mudrolino/assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v8/native-runtime-parity.json), [`arm-clearance-audit.json`](file:///home/skclaw/PROJECTS/mudrolino/assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v8/arm-clearance-audit.json).

| Clip | Dur (`v7` -> `v8`) | Moving Bones | Legs Active | Max Vel (°/s) | Max Accel (°/s²) | Loop Mismatch (°/s) | 120 Hz Parity (`v8`) | Warnings (`v7` -> `v8`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bow` | `2.0s` -> `2.2s` | `17 -> 19` | `yes -> yes` | `248.1 -> 228.5` | `2579 -> 2062` | `96.2 -> 4.3` | `6.85 µm` | `none -> none` |
| `celebrate` | `1.4s` -> `1.4s` | `12 -> 19` | `NO -> yes` | `198.0 -> 200.8` | `2361 -> 2132` | `183.3 -> 10.8` | `5.39 µm` | `frozen-lower-body -> none` |
| `clap` | `2.2s` -> `2.2s` | `10 -> 18` | `NO -> yes` | `234.6 -> 262.8` | `5070 -> 2999` | `174.9 -> 10.1` | `13.59 µm` | `frozen-lower-body -> none` |
| `count_one_two_three` | `NEW -> 2.4s` | `17` | `yes` | `294.8` | `3337` | `2.2` | `19.67 µm` | `NEW -> none` |
| `encourage` | `1.8s` -> `2.0s` | `11 -> 18` | `NO -> yes` | `234.6 -> 354.2` | `3621 -> 3371` | `177.0 -> 17.0` | `17.95 µm` | `frozen-lower-body -> none` |
| `finale` | `2.8s` -> `2.8s` | `20 -> 20` | `yes -> yes` | `422.8 -> 314.6` | `7447 -> 4622` | `85.0 -> 4.7` | `14.07 µm` | `high-jerk -> none` |
| `flex` | `2.0s` -> `2.2s` | `11 -> 18` | `NO -> yes` | `292.2 -> 353.8` | `2485 -> 2869` | `163.6 -> 10.1` | `20.75 µm` | `frozen-lower-body -> none` |
| `gentle_try_again` | `NEW -> 2.2s` | `17` | `yes` | `278.2` | `1728` | `6.1` | `6.43 µm` | `NEW -> none` |
| `idle` | `2.8s` -> `3.2s` | `19 -> 19` | `yes -> yes` | `21.9 -> 21.1` | `61 -> 198` | `1.7 -> 6.6` | `1.44 µm` | `none -> none` |
| `idle_breathe` | `3.6s` -> `3.6s` | `19 -> 19` | `yes -> yes` | `9.9 -> 17.3` | `42 -> 143` | `0.8 -> 4.8` | `1.47 µm` | `imperceptible-idle -> none` |
| `jump` | `1.4s` -> `1.6s` | `19 -> 19` | `yes -> yes` | `417.4 -> 358.4` | `10038 -> 4148` | `226.8 -> 45.4` | `13.98 µm` | `high-jerk -> none` |
| `listen` | `2.0s` -> `2.2s` | `10 -> 17` | `NO -> yes` | `318.9 -> 282.4` | `3046 -> 2372` | `206.0 -> 8.6` | `13.38 µm` | `frozen-lower-body -> none` |
| `march` | `2.4s` -> `2.4s` | `19 -> 19` | `yes -> yes` | `337.7 -> 300.6` | `6967 -> 4942` | `150.2 -> 9.2` | `16.50 µm` | `high-jerk -> none` |
| `peekaboo` | `2.2s` -> `2.2s` | `11 -> 18` | `NO -> yes` | `295.3 -> 300.1` | `1920 -> 1954` | `49.5 -> 9.9` | `18.32 µm` | `frozen-lower-body -> none` |
| `point_down` | `NEW -> 2.0s` | `17` | `yes` | `253.5` | `2265` | `11.2` | `9.19 µm` | `NEW -> none` |
| `search` | `2.2s` -> `2.2s` | `10 -> 17` | `NO -> yes` | `215.8 -> 244.4` | `2651 -> 5158` | `121.4 -> 7.8` | `13.82 µm` | `frozen-lower-body -> none` |
| `shrug` | `1.8s` -> `2.0s` | `10 -> 17` | `NO -> yes` | `357.1 -> 387.8` | `3524 -> 2872` | `227.2 -> 12.2` | `17.36 µm` | `frozen-lower-body -> none` |
| `sleepy_yawn` | `NEW -> 2.6s` | `17` | `yes` | `219.5` | `1445` | `3.9` | `8.86 µm` | `NEW -> none` |
| `stretch` | `2.2s` -> `2.2s` | `12 -> 19` | `NO -> yes` | `264.2 -> 255.9` | `1861 -> 2267` | `42.3 -> 7.8` | `11.16 µm` | `frozen-lower-body -> none` |
| `talk_explain` | `NEW -> 2.2s` | `17` | `yes` | `325.3` | `2985` | `3.2` | `12.32 µm` | `NEW -> none` |
| `think` | `2.2s` -> `2.4s` | `10 -> 17` | `NO -> yes` | `275.7 -> 279.4` | `4814 -> 4893` | `149.9 -> 11.2` | `16.94 µm` | `frozen-lower-body -> none` |
| `walk` | `NEW -> 1.6s` | `17` | `yes` | `90.3` | `358` | `5.8` | `1.28 µm` | `NEW -> none` |
| `wave` | `2.2s` -> `2.2s` | `10 -> 17` | `NO -> yes` | `293.0 -> 333.3` | `5339 -> 3008` | `195.8 -> 12.0` | `21.79 µm` | `frozen-lower-body -> none` |
| `wiggle` | `2.0s` -> `2.2s` | `20 -> 20` | `yes -> yes` | `278.7 -> 296.9` | `4274 -> 2939` | `168.3 -> 10.4` | `17.54 µm` | `none -> none` |

---

## 3. Animation Feedback Tooling Added / Upgraded

1. **GLB Kinematics, Jerk, Seam & Lower-Body Auditor** — [`tools/avatar/audit_bear_animation_quality.mjs`](file:///home/skclaw/PROJECTS/mudrolino/tools/avatar/audit_bear_animation_quality.mjs) (tested in [`tools/avatar/bearAnimationQuality.test.ts`](file:///home/skclaw/PROJECTS/mudrolino/tools/avatar/bearAnimationQuality.test.ts)):
   ```bash
   node tools/avatar/audit_bear_animation_quality.mjs \
     --glb assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v8/web-v1/model.glb \
     --output artifacts/verification/bear-companion/v8-quality.json
   ```
2. **Multi-Frame Contact Sheets (`<= 320px` Review Strips + HTML Board)** — [`tools/avatar/render_bear_contact_sheets.mjs`](file:///home/skclaw/PROJECTS/mudrolino/tools/avatar/render_bear_contact_sheets.mjs):
   ```bash
   npx tsx tools/avatar/render_bear_contact_sheets.mjs \
     --base=http://127.0.0.1:3003 \
     --model=assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v8/web-v1/model.glb \
     --output-dir=artifacts/verification/bear-companion/contact-sheets-v8 \
     --clips=all --views=three-quarter
   ```
   Review board generated at [`artifacts/verification/bear-companion/contact-sheets-v8/index.html`](file:///home/skclaw/PROJECTS/mudrolino/artifacts/verification/bear-companion/contact-sheets-v8/index.html).
3. **Interactive Runtime Inspection & Walk Demo** — [`src/avatar/AvatarRuntimeFixture.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/AvatarRuntimeFixture.tsx):
   Visit `/avatar-preview?agent=1&companion=bear` with interactive **Play/Pause**, **`0.25× / 0.5× / 1×`** speed selector, **Loop / Once** mode, **`0..1` timeline scrubber**, camera presets, and live **Walk Demo** button (preserving headless `?pose=` determinism).

---

## 4. Follow-up: `celebration-v9` Natural Arms & UI Anti-Flicker (2026-11-23)

User review of `celebration-v8` identified two remaining issues: (1) unnaturally wide outward-held arms in `idle` and related clips, and (2) frequent visual flicker during UI transitions. Both are resolved in `celebration-v9` (`0` Meshy credits spent):

1. **Natural side-resting arm posture across all 24 clips (`celebration-v9`):**
   - Added `apply_relaxed_arm()` (`relaxedArmDegrees: 17`, `relaxedForearmDropDegrees: 16`, `relaxedForearmDegrees: 12` with positive downward `ForeArm (0, 1, 0)` rotation) in [`build_generated_bear_celebration.py`](file:///home/skclaw/PROJECTS/mudrolino/tools/blender/catalog/build_generated_bear_celebration.py).
   - Updated `idle`, `idle_breathe`, `walk`, `stretch`, `peekaboo`, `sleepy_yawn`, `gentle_try_again`, `shrug`, `encourage`, and all rest/entry/exit arms across all 24 clips, keeping BVH arm-torso/leg/head clearance at `0/0` across 6,528 120 Hz subframes and smoothing `wave`/`flex`/`march`/`stretch` ramp timing so peak 120 Hz vertex parity holds at `26.50 µm` (`<= 30 µm`), `893,228` gzip bytes, and `0` quality warnings ([`v9-quality.json`](file:///home/skclaw/PROJECTS/mudrolino/artifacts/verification/bear-companion/v9-quality.json)).
   - Candidate GLB SHA-256: `c242d6c98fc537291287df0b1199eb6764b6ad6b0f0949ff3eadc5234b2cc1b7` (`1,328,332` raw / `893,228` gzip bytes).

2. **UI-change canvas & overlay anti-flicker fixes:**
   - Enabled `preserveDrawingBuffer: true` on `WebGLRenderer` (`AvatarScene.tsx`) and added synchronous `paintCompanionAfterConfigure()` immediately after `gl.setSize()` in `PersistentRendererHost` so resize/reattach changes never expose a cleared buffer.
   - Added `DETACH_GRACE_MS = 80` fixed-pin grace across transient `activeSlot === null` lazy-route `Suspense` gaps (`GameRoute.tsx`), prevented mid-walk slot updates from interrupting or restarting an active `'walk'` transition (`walkTargetRef`), skipped redundant dock style resets on same-container clip changes, and eliminated transient `bear-still.png` cutout flashes over live WebGL slots in `HomeCompanion.tsx`, `PromptCompanion.tsx`, and `LearningCompanion.tsx`.

3. **Parabolic `'hop'` UI locomotion, overlay auto-timeout fix, idle-only round starts, and cold-route transition stability:**
   - Updated [`promptCompanionState.ts`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/promptCompanionState.ts) so automatic round-open prompts stay calmly on `idle_breathe` (`reason: 'idle'`) both on initial round entry and when returning from success/failure overlays, reserving `listen`/`count_one_two_three`/`talk_explain` for explicit taps or replays alongside `retry` and `nudge`.
   - Upgraded [`companionWalkTransition.ts`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/companionWalkTransition.ts), [`AvatarModel.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/AvatarModel.tsx), and [`AvatarScene.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/AvatarScene.tsx) to use a parabolic `'hop'` (`jump` clip with takeoff/landing bottom-anchored squash-and-stretch and headroom-clamped arc) across all cross-UI transitions (`Home ↔ Game` and `Slot ↔ Overlay`), and refreshed the leaving timestamp when a prior container unmounts without pointer input so auto-timeout overlay dismissals always hop cleanly back.
   - Added `useDeferredValue(location)` + outer `<React.Suspense>` in [`App.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/App.tsx) (removing the inner Suspense in [`GameRoute.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/shared/components/GameRoute.tsx)), hover/focus warming in [`GameCard.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/home/GameCard.tsx), and synchronous viewport layout init in [`AppScreen.tsx`](file:///home/skclaw/PROJECTS/mudrolino/src/shared/ui/AppScreen.tsx) so first cold game opens commit without a blank screen flash.

---

## 5. Publishing Gate & Status

All technical gates on `celebration-v9` (`optimization`, `quality audit`, `sample_generated_bear_runtime.mjs`, `verify_generated_bear_motion.py`, `audit_generated_bear_clearance.py`, `render_bear_still.py`, `verify_bear_runtime.mjs` with `30/30` captures, and `render_bear_contact_sheets.mjs` across all 24 clips) passed.  
On `2026-11-23`, Mr. Tinkleberry approved `celebration-v9` after live interactive verification and authorized publication to Vercel Blob and `release`:
- **Published manifest:** [`src/avatar/companions/bear-v1.json`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/companions/bear-v1.json)
- **Public Blob URL:** `https://en1sa7u9gqowved5.public.blob.vercel-storage.com/avatars/bear-v1/c242d6c98fc537291287df0b1199eb6764b6ad6b0f0949ff3eadc5234b2cc1b7.glb` (`1,328,332` raw / `893,228` gzip bytes, SHA-256 `c242d6c98fc537291287df0b1199eb6764b6ad6b0f0949ff3eadc5234b2cc1b7`)
- **Bundled fallback still:** [`src/avatar/companions/bear-still.png`](file:///home/skclaw/PROJECTS/mudrolino/src/avatar/companions/bear-still.png) (SHA-256 `89d0dceefd051ce4f8d0ef27e65769153d0bb72776ee116d5e4239717c05226a`)
- **Tooling update:** [`tools/avatar/publish_bear_companion.mjs`](file:///home/skclaw/PROJECTS/mudrolino/tools/avatar/publish_bear_companion.mjs) resolves `assets/avatar/catalog-a` via `resolveAuthoringRoot` (`localArchive.mjs`) and allows stricter generated contract ceilings within the production bounds (`<= 95,000` tris, `<= 2,100,000` gzip bytes, `>= 0.02 m` min motion, `<= 0.007 m` floor penetration).
