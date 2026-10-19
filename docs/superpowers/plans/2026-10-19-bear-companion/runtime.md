# Bear companion — runtime work package

Entry point: [implementation plan](../2026-10-19-bear-companion.md).
Complete Tasks 4–6 after reading its runtime/browser reference list.
Tasks 4–5 can proceed while the model's art review is pending.

## Task 4: Define success identity, expiry and optional asset preparation

**Create:** `src/avatar/companionCelebration.ts`, `.test.ts`,
`useCompanionCelebration.ts`, `companionConfig.ts`, `.test.ts`,
`companionResources.ts`, `.test.ts`, `useCompanionResources.ts`,
`avatarSceneLoader.ts`, `companions/bear-v1.json` and `companions/bear-still.png`.
**Modify:** `src/shared/services/e2eState.ts` only for the guarded fixture flag.

- [ ] **4.1 Write the event-policy tests first.** The complete seed implementation
  and tests are in [celebration-seed.md](celebration-seed.md). Create the test file
  first and run it to see missing-module failures. Then create the implementation
  and verify the tests pass:

  ```bash
  npm run test:unit -- src/avatar/companionCelebration.test.ts
  ```

  The input is a small observation of `GameState`; no game-specific callbacks,
  audio promises or Three.js imports belong here. Use a 1600ms maximum visibility
  window for the 1400ms clip. Closing/changing the game may truncate it.
- [ ] **4.2 Add the React adapter.** `useCompanionCelebration(state)` owns one
  reducer instance for the lifetime of `GameShell`. In a layout effect dispatch
  an `observe` action with the relevant state fields and `performance.now()`.
  Depend on the primitive fields, not the changing whole state object. When an
  active event exists, schedule one timeout for its absolute `expiresAtMs`; the
  timeout dispatches `expire` with that event's ID and a fresh monotonic time.
  Cancel the timeout on ID/expiry change or unmount. Effect cleanup/reconnection
  must preserve the original start/deadline rather than start another event.
  Return the active record only when `isCelebrationVisible` also matches the
  **current** state, so pause/next-round hides immediately before effects run.
  The reducer consumes a success observed while paused; resume does not replay it.
- [ ] **4.3 Define the disabled publication state and validated config.** Create
  the initial manifest as a real disabled state, not an invented CDN address:

  ```json
  {
    "schemaVersion": 1,
    "id": "bear-v1",
    "accepted": false,
    "modelUrl": null,
    "sha256": null,
    "bytes": null,
    "animationName": "celebrate",
    "durationMs": 1400
  }
  ```

  In `companionConfig.ts` define a `CompanionManifest` matching this schema and
  `resolveCompanionConfig(manifest, fixtureEnabled = false)`. Its result is null
  unless the public candidate is accepted with a valid HTTPS URL, 64 lowercase
  hex SHA, positive byte count, `celebrate` name and declared duration. The result
  contains `{ id, modelUrl, animationName, durationMs }`. Fixture mode returns that
  same shape with the fixed local path `/__avatar_fixture/bear-v1.glb`; it accepts
  no caller-supplied URL. In a test-mode build, the browser wrapper returns null
  unless the optional boolean `window.__E2E__?.companionFixture` is true; then it
  returns only the fixed fixture config. This keeps existing integration/media
  tests independent of the public CDN. Normal development/production resolves
  the accepted manifest, and calls no fixture branch. Guard the test read with
  `import.meta.env.MODE === 'test'`. Use the existing additive E2E-state helper;
  define this optional field on its interface. A production global with that
  name must have no effect. Add tests for disabled config, incomplete accepted
  config, malformed URLs/hashes, valid publication and the fixed fixture.
- [ ] **4.4 Bundle the actual still.** Copy the transparent still from Task 3
  into `src/avatar/companions/bear-still.png`, import it as a normal Vite asset,
  and retain its model/source hash in the retrospective. It may be bundled and
  precached like other small images. This does not change GLB/scene precache
  exclusions. Before Task 3 supplies it, run pure tests without fabricating a
  substitute character; record the component's asset dependency as pending.
- [ ] **4.5 Extract a shared lazy-scene loader.** In `avatarSceneLoader.ts`,
  export `loadAvatarSceneModule()` with one memoized dynamic import of
  `./AvatarScene`. Update `AvatarPresenter` to use this same function in its
  existing `lazy(...then(default))` declaration. The helper must not import a
  Three.js/R3F/Drei symbol statically. A rejected import stays failed for this
  page visit; `prepareCompanionResources` catches it. A later full page load can
  retry. Keep the actual lazy chunk named `AvatarScene` for the bundle verifier.
- [ ] **4.6 Implement preparation with an injectable, testable boundary.** Export:

  ```ts
  export interface CompanionPreparationDependencies {
    fetchModel(url: string): Promise<Response>;
    loadScene(): Promise<unknown>;
  }
  export type CompanionResourceStatus = 'disabled' | 'loading' | 'ready' | 'failed';
  export interface CompanionResource {
    status: CompanionResourceStatus;
    modelUrl: string | null;
  }
  export interface CompanionResourceStore {
    prepare(url: string | null): Promise<CompanionResource>;
    getSnapshot(url: string | null): CompanionResource;
    subscribe(listener: () => void): () => void;
    fail(url: string): void;
  }
  ```

  Implement `createCompanionResources(dependencies): CompanionResourceStore`,
  returning `prepare(url)`,
  `getSnapshot(url)`, `subscribe(listener)` and `fail(url)`. The last method marks
  a prepared URL failed after an actual renderer/model/context failure, without
  starting a request. Memoize both pending and settled
  preparation by immutable URL. `prepare(null)` is disabled with no requests.
  For a URL, begin scene-module preload and a model GET in parallel. Consume the
  body so HTTP caching can finish; validate successful HTTP status and GLB magic
  bytes `glTF` before ready. Both operations catch rejection and set failed.
  Status ready means preparation completed, **not** that a WebGL canvas or model
  has rendered; the latter is signaled by `onModelReady`. Browser HTTP cache and
  Drei's scene cache are separate; do not claim this GET parsed the model.
  A model/scene failure makes this URL failed for the page visit. There is no
  per-round retry, backoff timer or request that the game waits on.

  Use an application singleton with `fetch(url, { cache: 'force-cache' })` and
  `loadAvatarSceneModule` dependencies. The React adapter subscribes through
  `useSyncExternalStore`, returns stable snapshots, and initiates preparation
  from an effect. Unmount unsubscribes, but does not cancel a shared preparation
  another mounted consumer may use. Dispose/cancel only work owned exclusively
  by the store. This API keeps the browser-specific code out of Vitest tests.
- [ ] **4.7 Test resource behavior before enabling it.** With deferred promise
  fakes, assert: null URL does nothing; concurrent prepares for one URL share
  requests; scene and model preparation can complete in either order; HTTP 404,
  rejected import and invalid GLB all settle failed without unhandled rejection;
  a failed URL is not requested again on the next correct answer; subscriptions
  receive actual status changes; renderer readiness is never implied by fetching.
  If resource readiness occurs after a celebration expires, the policy remains
  expired—it must not manufacture an event.

  ```bash
  npm run test:unit -- src/avatar/companionCelebration.test.ts src/avatar/companionResources.test.ts src/avatar/companionConfig.test.ts
  npm run lint
  ```

  Expected: all new behavioral cases pass and the main bundle still has no
  static Three.js import chain. Commit the policy/resource files and update the
  handoff/roadmap with their exact proof scope.

## Task 5: Add opt-in one-shot playback and safe decorative rendering

**Create:** `src/avatar/avatarPlayback.ts`, `.test.ts`, `LearningCompanion.tsx`.
**Modify:** `avatarTypes.ts`, `AvatarModel.tsx`, `AvatarScene.tsx`,
`AvatarPresenter.tsx`, `AvatarRuntimeBoundary.tsx`.

- [ ] **5.1 Write a real Three.js action test first.** Keep it in `src/avatar/`
  so no other area imports the renderer. Use `AnimationMixer`, an `Object3D` and
  a 1.4s `AnimationClip` with a simple quaternion track. Test the new helper
  `applyAvatarPlayback(action, options, elapsedSeconds)` with `mixer.update()`:
  loop playback still advances after two durations; once playback reaches/clamps
  the last pose and stops advancing; still playback remains at time zero; starting
  a once event 0.7s late seeks to 0.7s rather than replaying the opening; starting
  after its duration cannot wrap back to the beginning. These tests need no DOM
  or WebGL. Run red before adding the helper.
- [ ] **5.2 Define and thread the opt-in type.** Add:

  ```ts
  export interface AvatarPlaybackOptions {
    mode: 'loop' | 'once' | 'still';
    eventKey?: string;
    startedAtMs?: number;
  }
  ```

  Add optional `playback?: AvatarPlaybackOptions` and `interactive?: boolean`
  props through presenter, scene and model. Gallery callers without them retain
  the current looping/inspection behavior; `interactive` defaults to true in the
  scene. The companion passes false and OrbitControls are then absent/disabled.
  A decorative canvas has no keyboard stop and cannot capture pointer gestures.
- [ ] **5.3 Implement the action helper with installed Three.js APIs.**
  `reset()`, `setEffectiveWeight(1)`, `setLoop(LoopOnce, 1)` and
  `clampWhenFinished = true` establish once playback. Set the action time to
  bounded elapsed seconds and evaluate the mixer at zero delta before displaying
  a late mount. Still uses the first, relaxed clip pose and a paused action. Loop
  uses `LoopRepeat` and retains the gallery's current fade behavior. Inspect the
  installed typings under `node_modules/@types/three/src/animation/` when writing
  the helper rather than inferring an API from this plan.
- [ ] **5.4 Integrate the helper in `AvatarModel`'s action effect.** Depend on
  primitive playback mode/eventKey/startedAtMs, not a fresh options object or
  callback. A new correct event resets once; a rerender or phase change within
  the same event does not reset it. On remount into a new feedback slot, compute
  `max(0, (performance.now() - startedAtMs) / 1000)` so the event continues its
  original timeline. On cleanup stop the companion action immediately and
  release listeners; retain existing fade-out behavior for gallery loop playback.
  Keep inspection scrubbing separate and preserve intentional hips translation.
- [ ] **5.5 Make failures local to the companion.** Extend
  `AvatarRuntimeBoundary` with optional `fallback` and `onError` props. A failed
  lazy module, suspended model load or render produces the supplied still and
  reports failure once to the resource store. Preserve current null fallback and
  warning behavior for gallery callers. Listen for `webglcontextlost` inside the
  scene through `onCreated`; prevent default, signal failure and unmount this
  companion canvas. Remove the listener on cleanup. A no-WebGL fallback must be
  nonthrowing too. R3F errors can cross its internal renderer boundary differently
  from ordinary React descendants: test real browser failure paths, not just an
  assumed outer ErrorBoundary catch.
- [ ] **5.6 Implement the view.** `LearningCompanion` accepts an active event,
  prepared resource/config and reduced-motion state; it does not create events
  or alter game state. Render a fixed-size wrapper with `aria-hidden="true"`,
  `pointer-events-none` and a stable `data-testid="learning-companion"` plus
  `data-celebration-key` for browser observations. Use the bundled still with
  `alt=""` while preparing/failed and for all reduced-motion events. Render a
  transparent `AvatarPresenter` only for active, prepared, normal-motion events,
  passing the one embedded GLB/`celebrate`, `preserveHipsPosition`,
  `playback={{ mode: 'once', eventKey, startedAtMs }}` and `interactive={false}`.
  Keep the still behind the canvas until `onModelReady` confirms content; a ready
  resource alone is insufficient. Pass `assetStatusOverride="available"` only
  after the resource's successful validation, avoiding new HEAD probes per mount.
  No active event or no enabled config means no wrapper/canvas. Pause, dismissal
  and expiry unmount the canvas, so no render loop survives active learning.
- [ ] **5.7 Check playback and old behavior before commit.**

  ```bash
  npm run test:unit -- src/avatar/avatarPlayback.test.ts src/avatar/companionResources.test.ts
  npm run lint
  npm run build
  npm run verify:bundle
  ```

  Re-run the Task 3 browser fixture after changing shared renderer code. Confirm
  existing walk/run and inspection controls still function. No default playback
  changes to other assets and no new static renderer import are acceptable.

**Done:** one-shot/still/loop behavior is proven with real mixer tests; normal
gallery playback remains intact; the view cannot gate learning on rendering.

## Task 6: Wire the shared shell and prove cross-game behavior

**Modify:** `src/shared/game/GameShell.tsx`, `src/shared/ui/UiKitScreen.tsx`.
**Create:** `e2e/support/companionFixture.ts`, `e2e/avatar-companion.spec.ts`.
**Extend for final acceptance:** `e2e/release-responsive.spec.ts`,
`e2e/release-webkit-smoke.spec.ts`, `e2e/production-guards.spec.ts` and
`e2e/offline.spec.ts` as described below and in main-plan Task 8.

- [ ] **6.1 Write the fixture helper and a failing alphabet wiring test.** Read
  `assets/avatar/asset-manifest.json` and compare the local
  `companions/bear-v1/outfit-lod.glb` SHA before fulfilling it. A missing or
  mismatched file is a setup failure with the exact `assets:pull --prefix=...`
  recovery command. Register HEAD/GET routes for the single fixed fixture URL
  before navigation. Then add an init script setting only
  `window.__E2E__.companionFixture = true`, preserving existing fields. The app's
  test-mode resolver from Task 4 turns that boolean into the known fixture config.
  This works in the standard test build without environment-specific extra builds
  or mutating production config. Test-build cases which do not opt into the
  fixture see the optional companion disabled, even after publication. Actual
  production-config/CORS/offline behavior is checked in the production tests;
  no existing test should unexpectedly request an external model.
- [ ] **6.2 Create the common event/resources once per shell.** In `GameShell`,
  call `useCompanionCelebration(state)` and
  `useCompanionResources(modelUrl: string | null)` above conditional render
  branches. Read reduced motion through the existing `motion/react` convention.
  Pass null as the preparation URL under reduced motion while keeping the enabled
  config for the bundled still; skip both the model GET and scene-module import
  in that case. No per-game answer handlers or session-controller
  timing changes are needed. Prepare once during the mounted game, not at the
  moment an answer is tapped. No game awaits resource readiness.
- [ ] **6.3 Place one companion view for the current event.** In nonfinal success
  feedback, replace the decorative emoji's space with the companion; retain the
  emoji when the config is disabled. In final `answered-correctly` before results,
  use a small pointer-transparent feedback layer, with no modal/text/button.
  In `session-complete` use the completion panel's visual slot only while the
  same final-correct event is still active. These three hosts are mutually
  exclusive and share the policy's original key/start/deadline, so moving between
  them cannot restart the dance. A final failure/completion without an active
  success uses existing visuals. On expiry leave the reserved slot until its
  feedback panel closes, preventing text/control movement; do not keep an empty
  slot in the active question.

  Start at a 96px-wide/112px-high visual area, reduced to 48px/56px on screens
  <=480px tall. Match the still/canvas aspect and framing. If measurement shows
  overflow, apply compact padding/spacing to these feedback panels through their
  existing shared primitive rather than hiding controls or shrinking tap targets.
  Keep the region decorative: no new announcement, label, focus target or added
  Continue action. Verify backdrop/panel click behavior is unchanged.
- [ ] **6.4 Document it in the hidden UI kit.** Add deterministic companion
  examples beside the current game-shell states: ordinary success, final correct,
  final failure, expired event and reduced-motion still. Controls drive the real
  policy/renderer rather than a disconnected animation. Keep fixture-only controls
  under the route's existing dev/test guard and localize any new visible text with
  `t()`/`msg()` plus Czech entries. If text/controls are unnecessary, reuse the
  existing states and add focused links/examples without new product strings.
- [ ] **6.5 Expand cross-game browser proof.** Import `RELEASE_GAME_CASES` from
  `e2e/support/releaseMatrix.ts`, `completeCurrentRound` and the deterministic media
  helpers; interact with actual controls and use the E2E oracle only to identify
  answers. Parameterize one ordinary correct-answer/one-event check across all
  11 games. Use assembly/multiple-letter controls to assert intermediate progress
  does not show the bear. For representative grid and assembly sessions, finish
  all rounds and check the final success has one event through results. Include
  final exhausted failure after earlier correct rounds: no bear on failure.
  In the new Chromium describe blocks use the repository browser resolver and
  the browser skill's software-GL launch flags, preserving `--mute-audio`.
  Assert an actual animated model is rendered in these normal-motion cases;
  a fallback-only pass is insufficient for the 3D path.
- [ ] **6.6 Verify lifecycle and pacing.** Add explicit cases for repeated taps,
  React rerenders, early Continue, backdrop dismissal, next round, Play again,
  leaving the route and pausing/resuming during feedback. Preserve original event
  start time across final-panel changes; a second run can celebrate round one
  again. Reuse the existing held-praise contract from `find-it-games.spec.ts` to
  prove item then praise, no bear-driven audio, and unchanged 1000ms post-audio
  advancement. Finishing/interrupting the dance does not advance the round itself.
- [ ] **6.7 Test reduced motion and failures using the real browser.** With
  reduced motion the still appears and no WebGL/3D chunk is needed for that event.
  With a delayed model/scene, early success shows the still, then navigating to
  the next question prevents a late appearance. Inject model 404, invalid GLB,
  lazy-chunk rejection, no WebGL and context loss: existing feedback and results
  controls still work and no repeat load happens each round. Capture/assert
  intentional failure details separately, leaving normal console/request checks
  strict. No production fixture global may enable a candidate avatar.
- [ ] **6.8 Run the new tests and review geometry.**

  ```bash
  npm run build:e2e
  npx playwright test --config=e2e/playwright.config.ts e2e/avatar-companion.spec.ts --project=desktop
  npm run lint
  npm run test:unit
  ```

  Tag new viewport-matrix layout checks `@geometry` and let the standard integration
  config own its three sizes. Test both locales and 200% zoom without duplicate
  viewport loops. Assert control bounds/overlap and accessibility, not only canvas
  existence. Complete the entry plan's Task 8 for fresh full integration proof.
  Add a focused test titled `bear companion success and completion fit` to the
  existing release-responsive spec; it opts into the same real-byte fixture and
  checks one success plus final completion, still/canvas parity and control bounds.
  Add `bear companion succeeds with WebKit` to the existing WebKit smoke spec;
  exercise correct feedback and completion using the same fixture. Their existing
  release projects own all viewports; no additional viewport loops/config copies
  are needed. Keep the Chromium software-GL override scoped to its companion
  describe block; do not pass Chromium flags to WebKit. Record whether WebKit
  produced 3D or its supported fallback rather than claiming a fallback is 3D proof.
- [ ] **6.9 Save exact proof and commit.** Re-run the Task 3 browser verifier if
  model/renderer bytes changed and consolidate fresh matching hashes. Update the
  handoff, retrospective and roadmap; commit only owned sources/tests/docs. Keep
  the manifest disabled until Task 7's exact publication/acceptance conditions hold.

**Done:** all games use the same success event and optional renderer; final-round,
pause/restart, timing, failure and accessibility behavior are proven. The main
plan's publication and aggregate acceptance tasks still determine product readiness.
