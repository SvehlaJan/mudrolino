# Avatar Companion — Design Spec

**Date:** 2026-04-19
**Status:** Approved
**Must land before:** any avatar implementation or avatar-related redesign work

## Overview

Add a simple animated 3D companion character to the app. The avatar is meant to feel like a friendly parent/caregiver presence accompanying the child through the experience, but the POC deliberately avoids parent likeness, photo processing, cloud services, and personal data storage.

The POC uses a single stylized full-body character with one outfit and a small animation set. The implementation must be structured so later work can add outfit slots, unlockable clothing, and optional face customization or selfie-assisted face mapping without rewriting the renderer.

**POC goals**

- Put a front-facing full-body avatar on selected non-gameplay screens
- Make the character feel alive with idle and simple celebratory/gesture animation
- Keep the asset and runtime local-first, cacheable, and PWA-friendly
- Avoid collecting or storing personal photos or biometric data

**Later goals**

- Parent-resembling faces
- Outfit slots and unlock economy
- More screen integrations and interactive reactions
- Cloud sync through future user profiles

---

## 1. Scope

### POC

- One unisex stylized 3D character
- One default casual outfit
- One front-facing presentation style
- Avatar shown only on:
  - home screen
  - results / success-related screens
  - reward / completion screens
- Initial animation set:
  - `idle` required
  - `wave` optional if retarget quality is acceptable
  - `dance` optional if retarget quality is acceptable
- Browser-only persistence for avatar config and future unlock state placeholder
- No photo input
- No parent likeness
- No lip sync
- No in-game companion during the core play loop

### Planned later

- Parent-resembling face customization
- MediaPipe-based face landmark exploration for face texture/decal mapping
- Outfit slots: hair, top, bottom, shoes, accessories, face extras
- Unlockable clothing and cosmetics
- Richer animation/reaction system
- User-account-backed sync
- Optional premium/custom asset pipelines

### Explicitly out of scope for POC

- Full 3D face reconstruction from a selfie
- Hosted avatar providers as a product dependency
- Voice-driven mouth animation
- Multiple body types
- Multiple avatars per device/user
- Editing tools for parents

---

## 2. Asset Strategy

### Selected POC asset

Use [Stylized Low poly Characters](https://damindudesilva1gmailcom.itch.io/stylized-low-poly-characters) as the starting point.

Why this asset:

- Cute and simple enough for ages 2–6
- Much closer to early Meta/Facebook avatar simplicity than realistic game characters
- Local files, no service dependency
- Includes a lightweight base and optional extras
- The asset page states:
  - base model is CC0
  - base includes Mixamo animations (`Run`, `jump`, `Idle`)
  - extras include toggleable parts like hair, shirt, jacket, tank top, shorts, pants, boots, shoes

### Asset constraints

- Front-facing full-body silhouette must read clearly on mobile screens
- Mesh/material complexity must stay low enough for smooth web use
- The chosen runtime asset must be converted into a web-friendly format (`.glb` preferred)
- The final POC model should ship from local app assets so it can be cached by the PWA later

### Asset preparation

Prepare an internal avatar asset package before runtime integration:

- one exported `glb` for the base character
- one exported `glb` or embedded clips for the approved animation set
- normalized scale and orientation for front-facing camera framing
- stable mesh/material naming for later slot-based visibility toggles

Inference from current decisions: even if the source asset starts as FBX, the app should standardize on `glb` for runtime loading.

---

## 3. Rendering Stack

### Chosen stack

- `three.js`
- `@react-three/fiber`
- `@react-three/drei`
- `GLTFLoader` through Drei/Three integration

Why:

- Fits the existing React 19 + Vite app
- Keeps the avatar in the same UI architecture as the rest of the app
- Supports local assets cleanly
- Gives direct control over camera, animation, lighting, and later mesh-slot customization

### Rejected alternatives

- Hosted avatar platforms as the POC foundation
  - too much product coupling for a simple local-first prototype
- `model-viewer`
  - good for simple presentation but too constrained for future customization and animation control
- Apple Memoji / Meta Avatars
  - not a practical cross-platform web/PWA foundation for this app

---

## 4. Avatar Architecture

### New modules

#### `src/avatar/AvatarScene.tsx`

Owns:

- `<Canvas>` integration or scene wrapper
- camera framing
- lights / environment
- background transparency or compositing behaviour
- animation tick coordination

#### `src/avatar/AvatarModel.tsx`

Owns:

- loading the base model
- binding animation clips
- exposing stable named parts for future slot toggles

#### `src/avatar/avatarTypes.ts`

Defines:

```ts
type AvatarAnimationName = 'idle' | 'wave' | 'dance';

interface AvatarConfig {
  modelId: string;
  outfitId: string;
  animation: AvatarAnimationName;
}

interface AvatarProgressState {
  unlockedItemIds: string[];
}
```

The POC only uses one `modelId` and one `outfitId`, but the structure must already support multiple unlockable items later.

#### `src/avatar/avatarStore.ts`

Local persistence wrapper for:

- `AvatarConfig`
- `AvatarProgressState`

Storage remains browser-only for the POC. The storage contract should be simple and migration-friendly so it can later be copied into a user profile document.

#### `src/avatar/AvatarPresenter.tsx`

UI-facing wrapper used by screens. Accepts a small set of props such as:

- `animation`
- `size`
- `priority` or `quality`
- optional `className`

This keeps screen-level code unaware of Three.js details.

### Future-ready extension points

Reserve optional fields, but do not implement their behaviour in the POC:

```ts
interface AvatarConfig {
  modelId: string;
  outfitId: string;
  animation: AvatarAnimationName;
  slotOverrides?: Partial<Record<string, string>>;
  faceTextureUrl?: string | null;
  headDecalId?: string | null;
}
```

These are placeholders for later face and slot systems. They should exist only if they do not complicate the initial implementation.

---

## 5. Screen Integration

### POC placements

#### Home screen

- Avatar is visible and front-facing
- Default animation is `idle`
- The avatar acts as the primary “alive” element on the page

#### Success / result contexts

- Avatar may switch from `idle` to `wave` when a positive result screen appears
- If `wave` is unavailable or poor quality, stay on `idle`

#### Reward / session completion contexts

- Avatar may switch to `dance` if the animation looks acceptable
- If `dance` is unavailable or poor quality, stay on `idle`

### POC non-placements

- Grid gameplay screens
- Settings screens
- ParentsGate
- Recording screens

### Layout guidance

- Full body should be visible most of the time
- Camera should stay largely stable between screens
- The avatar should not compete with core touch targets
- Use the avatar as a visual companion, not as interactive game input

---

## 6. Animation Strategy

### POC

- Require `idle`
- Evaluate `wave`
- Evaluate `dance`

Animation quality gate:

- No obvious mesh explosions
- No severe clipping that makes the character look broken
- No distracting foot sliding or orientation issues that dominate the screen

If `wave` or `dance` fail the quality gate, the POC ships with `idle` only.

### Runtime behaviour

- Only one active animation at a time
- Prefer simple transitions or direct switches over a more complex state machine
- No procedural animation in the POC

### Later

- richer reaction mapping
- context-driven gestures
- emotion states
- voice-linked motion or lip sync if ever needed

---

## 7. Data and Persistence

### POC persisted state

- current avatar config
- placeholder unlock state

No personal data:

- no selfies
- no facial landmarks
- no biometric descriptors
- no cloud avatar IDs

### Storage keys

Keep avatar state in its own local storage namespace so it can evolve independently from game settings.

Suggested shape:

```ts
interface StoredAvatarState {
  version: 1;
  config: AvatarConfig;
  progress: AvatarProgressState;
}
```

Versioning is required from the start because the avatar system is expected to expand later.

---

## 8. Unlock System Readiness

The POC does not need working unlock mechanics, but the architecture must not block them.

### POC requirement

- support storing `unlockedItemIds`
- support a single active outfit id

### Later model

- cosmetic items grouped by slots
- unlocks granted by play progress
- selected cosmetics rendered by mesh visibility toggles or mesh swapping

The POC should assume slot-based cosmetics later, but avoid premature complexity in the first implementation.

---

## 9. Face Customization Path

### POC

- none

### Planned exploration

Later work may explore MediaPipe-based face landmark extraction for:

- aligning a face texture to the head mesh
- driving a simplified stylized face from photo-derived parameters
- placing decals or texture transforms on a predefined stylized face mesh

Important constraint:

- future face customization should avoid long-term storage of raw personal photos where possible

### Non-goal for now

- true 3D face reconstruction

The likely later path is fake 3D:

- stylized head mesh stays fixed
- face likeness comes from texture/decal/parameter mapping

---

## 10. Risks

### Asset fit risk

The chosen asset may look good in previews but fail at:

- front-facing full-body framing on small screens
- preschool-friendly emotional read
- wave/dance retarget quality

### Animation risk

Retargeted non-idle animations may clip badly with extra clothing pieces.

Mitigation:

- treat `wave` and `dance` as quality-gated, not mandatory

### Performance risk

3D on top-level UI screens can become expensive if scene setup is too heavy.

Mitigation:

- one character
- simple lights
- no heavy post-processing
- cache model load

### UX risk

The avatar could become decorative noise instead of a meaningful companion.

Mitigation:

- keep placement limited in the POC
- use a stable front-facing presentation

---

## 11. Validation Criteria

The POC is successful when:

- a single full-body avatar renders reliably in the app on target screens
- it looks coherent and appealing enough for ages 2–6
- `idle` animation works cleanly
- the implementation keeps avatar state separate and migration-friendly
- the code structure is ready for later outfit slots and fake-3D face work

The POC is still acceptable if:

- only `idle` ships
- unlocks are not yet active
- face customization is entirely deferred

---

## 12. Unknowns and Follow-up Research

The following items are still unresolved and must either be researched or specified before or during implementation.

### POC-critical unknowns

- **Asset runtime quality:** whether the selected character still looks good enough once converted, lit, and framed as a front-facing full-body companion on real mobile screens
- **Animation viability:** whether `wave` and `dance` can be retargeted or imported cleanly enough to ship, or whether the POC should stay `idle`-only
- **Final runtime format:** whether the source asset can be converted into a stable `.glb` package without losing the parts needed for later slot toggles
- **Camera framing:** the exact home/results/reward composition that keeps the avatar readable without crowding main UI actions

### Needs specification later

- **Face customization method:** decal, texture projection, parameter-driven stylization, or another fake-3D approach
- **Cosmetic slot schema:** exact slots to support later, such as hair, top, bottom, shoes, glasses, or accessories
- **Unlock rules:** what actions unlock cosmetics, and whether unlocks are global or profile-specific once accounts exist
- **Cloud migration model:** how avatar config and progress should merge from local browser state into future user profiles

### Needs technical research later

- **MediaPipe feasibility:** whether in-browser face landmark extraction is good enough for stylized face mapping on this character style
- **Head mesh compatibility:** whether the chosen avatar head topology is suitable for later face texture/decal placement
- **PWA caching strategy:** exact caching behaviour for model, textures, and animation assets once offline support is introduced
- **Performance envelope:** whether the avatar scene should stay on the main thread or later move toward more isolated loading/render patterns if the app grows

### Product decisions deferred on purpose

- **How recognizable “parent-like” should eventually mean:** broad resemblance versus near-portrait likeness
- **Whether face customization is optional or central to onboarding later**
- **Whether the avatar remains one shared companion or becomes tied to child profiles in the account system**

---

## Out of Scope

- Parent likeness in the POC
- MediaPipe integration in the POC
- Photo upload UI
- Cloud-synced avatars
- Clothing unlock mechanics
- Interactive in-game companion behaviour
- Lip sync or speech-driven animation
