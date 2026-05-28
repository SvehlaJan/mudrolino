# GLB Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce avatar GLB assets from ~188 MB total to ~3 MB by deleting dead files, compressing geometry with meshopt, and aggressively simplifying and re-encoding textures on the Meshy-exported shoe asset.

**Architecture:** All operations are pure CLI transformations on binary files. `@gltf-transform/cli` 4.3.0 is already in `devDependencies`. `useGLTF` from `@react-three/drei` already enables `MeshoptDecoder` by default — no app code changes needed. Each task commits independently so bisection is easy.

**Tech Stack:** `@gltf-transform/cli` 4.3.0, `gltf-validator`, bash. No JS/TS changes.

**Safety:** All files are git-tracked. Any optimization can be undone with `git checkout -- <file>`.

---

## Key flags used throughout

| Flag | Reason |
|---|---|
| `--compress meshopt` | Entropy-encodes geometry and animation; decoded transparently by drei's `useGLTF` |
| `--simplify false` | Disabled on rigged meshes — simplification can corrupt bone-weight mapping |
| `--flatten false` | Disabled on all — flattening reassigns node indices and corrupts skin references |
| `--join false` | Disabled on all — joining L/R shoe objects would break world-position foot attachment |
| `--texture-compress false` | Suppresses texture encoding on files that have no textures |
| `--texture-compress webp` | Smaller than JPEG for the shoe textures; no browser decoder needed |
| `--texture-size 512` | 512×512 is more than sufficient for a garment occupying ~5% of screen |
| `--simplify true --simplify-ratio 0.02` | Shoes only: reduce 335K Meshy vertices to ~6,700 (2% target) |

---

## File Map

| File | Task | Action |
|---|---|---|
| `public/avatar/modular/male-base-plain-blue-sneakers.glb` | 1 | **Delete** |
| `public/avatar/modular/male-base-plain-blue-sneakers-rigged.glb` | 1 | **Delete** |
| `public/avatar/modular/male-base-plain-blue-sneakers-rigged-walking.glb` | 1 | **Delete** |
| `public/avatar/modular/male-base-plain-blue-sneakers-rigged-running.glb` | 1 | **Delete** |
| `public/avatar/modular/male-base-plain-blue-sneakers-walking.glb` | 1 | **Delete** |
| `public/avatar/modular/male-base-plain.glb` | 2 | `optimize --compress meshopt` |
| `public/avatar/modular/male-base-plain-walking.glb` | 2 | `optimize --compress meshopt` |
| `public/avatar/modular/male-base-plain-running.glb` | 2 | `optimize --compress meshopt` |
| `public/avatar/garments/shoes_blue_sneakers_v1.glb` | 3 | `optimize --simplify 0.02 --texture webp 512 --compress meshopt` |
| `public/avatar/garments/hat_red_cap_v1.glb` | 4 | `optimize --compress meshopt` |
| `package.json` | 5 | Add optimization npm scripts |

---

## Task 1: Delete unreferenced GLB files

Five `male-base-plain-blue-sneakers-*` variants live in `public/avatar/modular/` but are not referenced anywhere in `src/`. They were intermediate Blender exports from the embedded-clothing era. Total: ~158 MB.

**Files:**
- Delete: `public/avatar/modular/male-base-plain-blue-sneakers.glb`
- Delete: `public/avatar/modular/male-base-plain-blue-sneakers-rigged.glb`
- Delete: `public/avatar/modular/male-base-plain-blue-sneakers-rigged-walking.glb`
- Delete: `public/avatar/modular/male-base-plain-blue-sneakers-rigged-running.glb`
- Delete: `public/avatar/modular/male-base-plain-blue-sneakers-walking.glb`

- [ ] **Step 1: Confirm none are referenced in source**

  ```bash
  grep -r "blue-sneakers" /Users/svehla/playground/teo-learn/src/
  ```

  Expected: no output. If any results appear, stop and investigate before deleting.

- [ ] **Step 2: Delete the files**

  ```bash
  cd /Users/svehla/playground/teo-learn
  rm public/avatar/modular/male-base-plain-blue-sneakers.glb
  rm public/avatar/modular/male-base-plain-blue-sneakers-rigged.glb
  rm public/avatar/modular/male-base-plain-blue-sneakers-rigged-walking.glb
  rm public/avatar/modular/male-base-plain-blue-sneakers-rigged-running.glb
  rm public/avatar/modular/male-base-plain-blue-sneakers-walking.glb
  ```

- [ ] **Step 3: Verify only expected files remain**

  ```bash
  ls -lh public/avatar/modular/
  ```

  Expected — exactly these 3 files remain:
  ```
  male-base-plain.glb         ~3.2 MB
  male-base-plain-walking.glb ~3.3 MB
  male-base-plain-running.glb ~3.2 MB
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add -u public/avatar/modular/
  git commit -m "chore(assets): delete unreferenced blue-sneakers GLB variants (~158 MB)"
  ```

---

## Task 2: Optimize body models

Three files: `male-base-plain.glb` (static T-pose base), `male-base-plain-walking.glb` (walking animation), `male-base-plain-running.glb` (running animation). All have ~52,700 vertices, no textures, and one shared armature. Current size: ~3.2–3.3 MB each.

Flags used:
- `--compress meshopt` — compresses float32 geometry and animation keyframes
- `--simplify false` — disabled; rigged mesh vertex count is reasonable and simplification risks corruption
- `--flatten false` — disabled; skin nodes must stay at fixed indices
- `--join false` — disabled; keep mesh objects separate
- `--texture-compress false` — no textures in these files, suppresses irrelevant pass

**Files:**
- Modify: `public/avatar/modular/male-base-plain.glb`
- Modify: `public/avatar/modular/male-base-plain-walking.glb`
- Modify: `public/avatar/modular/male-base-plain-running.glb`

- [ ] **Step 1: Record baseline sizes**

  ```bash
  ls -lh /Users/svehla/playground/teo-learn/public/avatar/modular/male-base-plain*.glb
  ```

  Note the current sizes for comparison after optimization.

- [ ] **Step 2: Optimize `male-base-plain.glb`**

  ```bash
  cd /Users/svehla/playground/teo-learn
  npx @gltf-transform/cli optimize \
    public/avatar/modular/male-base-plain.glb \
    public/avatar/modular/male-base-plain.glb \
    --compress meshopt \
    --simplify false \
    --flatten false \
    --join false \
    --texture-compress false
  ```

- [ ] **Step 3: Optimize `male-base-plain-walking.glb`**

  ```bash
  npx @gltf-transform/cli optimize \
    public/avatar/modular/male-base-plain-walking.glb \
    public/avatar/modular/male-base-plain-walking.glb \
    --compress meshopt \
    --simplify false \
    --flatten false \
    --join false \
    --texture-compress false
  ```

- [ ] **Step 4: Optimize `male-base-plain-running.glb`**

  ```bash
  npx @gltf-transform/cli optimize \
    public/avatar/modular/male-base-plain-running.glb \
    public/avatar/modular/male-base-plain-running.glb \
    --compress meshopt \
    --simplify false \
    --flatten false \
    --join false \
    --texture-compress false
  ```

- [ ] **Step 5: Check sizes**

  ```bash
  ls -lh public/avatar/modular/male-base-plain*.glb
  ```

  Expected: each file should be noticeably smaller than before (target ~600–900 KB each). If any file grew in size, that indicates the source was already compressed — proceed anyway.

- [ ] **Step 6: Validate all three files**

  ```bash
  node tools/avatar/validate_gltf.js public/avatar/modular/male-base-plain.glb
  node tools/avatar/validate_gltf.js public/avatar/modular/male-base-plain-walking.glb
  node tools/avatar/validate_gltf.js public/avatar/modular/male-base-plain-running.glb
  ```

  Expected for each: `"errors": 0`. Warnings are acceptable. If any file has errors, run `git checkout -- <file>` to restore it and report BLOCKED.

- [ ] **Step 7: Commit**

  ```bash
  git add public/avatar/modular/male-base-plain.glb \
          public/avatar/modular/male-base-plain-walking.glb \
          public/avatar/modular/male-base-plain-running.glb
  git commit -m "chore(assets): compress body model GLBs with meshopt"
  ```

---

## Task 3: Optimize shoes GLB

`shoes_blue_sneakers_v1.glb` is a Meshy export: 335,410 vertices across 2 meshes (left and right shoe), plus 4 JPEG textures totalling ~6.7 MB. Current size: ~20.6 MB. This needs aggressive treatment.

Flags used:
- `--simplify true --simplify-ratio 0.02` — reduce to 2% of vertices (~6,700). A shoe visible at avatar scale never needs more.
- `--texture-compress webp --texture-size 512` — resize to 512×512 and encode as WebP. No browser decoder needed; all modern browsers support WebP natively.
- `--compress meshopt` — final entropy pass on remaining geometry.
- `--flatten false --join false` — preserve the L/R shoe node separation; `AvatarModel.tsx` uses world-position X-sign to attach each shoe to the correct foot bone (`LeftToeBase` / `RightToeBase`).

**Files:**
- Modify: `public/avatar/garments/shoes_blue_sneakers_v1.glb`

- [ ] **Step 1: Record baseline size**

  ```bash
  ls -lh /Users/svehla/playground/teo-learn/public/avatar/garments/shoes_blue_sneakers_v1.glb
  ```

- [ ] **Step 2: Run optimization**

  ```bash
  cd /Users/svehla/playground/teo-learn
  npx @gltf-transform/cli optimize \
    public/avatar/garments/shoes_blue_sneakers_v1.glb \
    public/avatar/garments/shoes_blue_sneakers_v1.glb \
    --simplify true \
    --simplify-ratio 0.02 \
    --texture-compress webp \
    --texture-size 512 \
    --compress meshopt \
    --flatten false \
    --join false
  ```

- [ ] **Step 3: Check size**

  ```bash
  ls -lh public/avatar/garments/shoes_blue_sneakers_v1.glb
  ```

  Expected: well under 1 MB (target ~200–400 KB). If the result is still larger than 1 MB, try lowering `--simplify-ratio` to `0.01` and re-running.

- [ ] **Step 4: Validate**

  ```bash
  node tools/avatar/validate_gltf.js public/avatar/garments/shoes_blue_sneakers_v1.glb
  ```

  Expected: `"errors": 0`. If errors, restore with `git checkout -- public/avatar/garments/shoes_blue_sneakers_v1.glb` and report BLOCKED.

- [ ] **Step 5: Confirm L/R node structure is intact**

  Parse the GLB and check that both shoe root nodes still exist as separate objects (not merged):

  ```bash
  python3 -c "
  import struct, json
  with open('public/avatar/garments/shoes_blue_sneakers_v1.glb', 'rb') as f:
      struct.unpack('<III', f.read(12))
      chunk_len, _ = struct.unpack('<II', f.read(8))
      data = json.loads(f.read(chunk_len))
  nodes = [n.get('name', '?') for n in data.get('nodes', [])]
  meshes = [m.get('name', '?') for m in data.get('meshes', [])]
  print('nodes:', nodes)
  print('meshes:', meshes)
  "
  ```

  Expected: 2 separate mesh nodes (left and right shoe). If they have been merged into one, restore the file and re-run with `--join false` confirmed.

- [ ] **Step 6: Commit**

  ```bash
  git add public/avatar/garments/shoes_blue_sneakers_v1.glb
  git commit -m "chore(assets): optimize shoes GLB (simplify 2%, WebP 512px, meshopt)"
  ```

---

## Task 4: Optimize hat GLB

`hat_red_cap_v1.glb`: 14,711 vertices, no textures, ~545 KB. Simple cap mesh with no rig or animation.

**Files:**
- Modify: `public/avatar/garments/hat_red_cap_v1.glb`

- [ ] **Step 1: Run optimization**

  ```bash
  cd /Users/svehla/playground/teo-learn
  npx @gltf-transform/cli optimize \
    public/avatar/garments/hat_red_cap_v1.glb \
    public/avatar/garments/hat_red_cap_v1.glb \
    --compress meshopt \
    --simplify false \
    --flatten false \
    --join false \
    --texture-compress false
  ```

- [ ] **Step 2: Check size**

  ```bash
  ls -lh public/avatar/garments/hat_red_cap_v1.glb
  ```

  Expected: ~60–120 KB. If the file is larger than the original (~545 KB), meshopt had nothing to do — proceed anyway.

- [ ] **Step 3: Validate**

  ```bash
  node tools/avatar/validate_gltf.js public/avatar/garments/hat_red_cap_v1.glb
  ```

  Expected: `"errors": 0`. If errors, restore with `git checkout -- public/avatar/garments/hat_red_cap_v1.glb` and report BLOCKED.

- [ ] **Step 4: Commit**

  ```bash
  git add public/avatar/garments/hat_red_cap_v1.glb
  git commit -m "chore(assets): compress hat GLB with meshopt"
  ```

---

## Task 5: Add optimization npm scripts

Document the optimization commands in `package.json` so future garments can be run through the same pipeline.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scripts to `package.json`**

  In the `"scripts"` object, add these three entries alongside the existing `avatar:gltf:*` scripts:

  ```json
  "avatar:gltf:optimize:body": "gltf-transform optimize public/avatar/modular/male-base-plain.glb public/avatar/modular/male-base-plain.glb --compress meshopt --simplify false --flatten false --join false --texture-compress false && gltf-transform optimize public/avatar/modular/male-base-plain-walking.glb public/avatar/modular/male-base-plain-walking.glb --compress meshopt --simplify false --flatten false --join false --texture-compress false && gltf-transform optimize public/avatar/modular/male-base-plain-running.glb public/avatar/modular/male-base-plain-running.glb --compress meshopt --simplify false --flatten false --join false --texture-compress false",
  "avatar:gltf:optimize:shoes": "gltf-transform optimize public/avatar/garments/shoes_blue_sneakers_v1.glb public/avatar/garments/shoes_blue_sneakers_v1.glb --simplify true --simplify-ratio 0.02 --texture-compress webp --texture-size 512 --compress meshopt --flatten false --join false",
  "avatar:gltf:optimize:hat": "gltf-transform optimize public/avatar/garments/hat_red_cap_v1.glb public/avatar/garments/hat_red_cap_v1.glb --compress meshopt --simplify false --flatten false --join false --texture-compress false"
  ```

- [ ] **Step 2: Verify JSON is valid**

  ```bash
  node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"
  ```

  Expected: `valid`

- [ ] **Step 3: Run lint**

  ```bash
  cd /Users/svehla/playground/teo-learn && npm run lint
  ```

  Expected: 0 errors.

- [ ] **Step 4: Commit**

  ```bash
  git add package.json
  git commit -m "chore: add avatar GLB optimization npm scripts"
  ```
