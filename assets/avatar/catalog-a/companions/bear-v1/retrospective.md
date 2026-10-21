# Bear B companion — implementation record

2026-10-19. Root agent owns the entire coupled Blender lane. Code implementation
uses separate policy, renderer and game-integration agents, each followed by
specification and quality review. All paths below are repository-relative.

## Sources and construction

- Frozen input: `catalog-a/outfits/O01-head130-T01-B01-F01/outfit.blend`, SHA
  `cb55aa76cddf3db3070465903595fefda1a37a02bfb3b08f053efec4d9d5d8be`.
  Full original inventory is `source-inventory.json`; no canonical source changed.
- Selected reference: middle B in
  `assets/avatar/concepts/2026-10-19/bear-mascot/comparison-v1.png`.
  Parameters live in `bear-design.json`. Rounded honey head, cream muzzle,
  geometric eyes/glints/brows/smile, rounded ears, paw surfaces, covered neck.
- Original head envelope was approximately 0.84m of 2.276m total height (37%).
  The user requested whole-head reductions, including all ears/muzzle/features.
  Current head35 has a 0.29435m head envelope over 1.72935m total height (17.0%),
  anchored at the same neck junction. Size/style acceptance remains pending;
  technical proof is not art approval. No facial texture or facial animation.
- Original 24-bone rest rig, canonical walk/run action signatures and original
  body vertex/polygon indices are preserved. The copied scene runs at 30fps;
  retained walk/run keys are historical authoring references, not new real-time
  gait proof for this bear. Canonical source FPS/files remain untouched. Bear-specific arm contour, T01
  coverage values, paw mask and shirt surface intentionally change in the copy.
  T01 is adapted in its isolated copy; B01/F01 geometry and garment color roles stay unchanged.
- Original human-shirt coverage is not accepted for this new motion. Upper-arm
  anatomy is restored, the upper-arm radius is reduced with blended influence,
  shirt armpit lowered/back expanded, and paws deepened to cover wrist cuts.
  These are source geometry changes, not hidden contact exceptions.
- Clip `celebrate`: 43 quaternion key samples, frames 0–42 at 30fps, 1.4s;
  slightly open relaxed arms at both endpoints, gentle outward arm lift, torso
  sway, knee movement and <=6mm pelvis bob. No horizontal root travel.
- Phone candidate uses a 48×32 main head surface. No garment/body decimation
  is needed: after baking coverage on a disposable export copy, 93,127 rendered
  triangles and 1,674,562 bytes gzip fit the 95k/2.1MB limits. `budget-report.json` records
  41,452 bytes of clip buffer data, 57,596 additional GLB bytes and 18,488
  additional gzip bytes versus the matching static construction. Keyed pelvis
  bob is 5.97mm; horizontal drift is below 0.02µm and endpoints match exactly.
- Native objects remain separate. Runtime uses full `outfit-lod.glb`;
  `body.glb`/`garments.glb` are separate authoring/reuse exports with the same clip.
  Product never downloads these separate exports.
- Still is 320×368 transparent PNG. Its perspective camera mirrors the closer
  companion-only camera (distance5.2, target1.25, height1.35, FOV34) and 2.7m
  normalization. The enlarged160×184desktop slot requires at least2×pixels;
  `render_bear_still.py` re-renders from the unchanged proven native source at
  320×368. Original helper bytes are preserved beside historical head45 construction; the
  new still-report binds its source/camera/renderer without rebuilding geometry.
  Gallery camera remains7.2; large review renders use
  closer orthographic framing. Every review image is <=320px wide.

## Measured revisions and rejected shortcuts

| Revision/check | Result and next decision |
| --- | --- |
| blockout-v1 (~2.4s build) | Small head/original tee resembled C; neck junction exposed. Rejected before long sweeps. |
| blockout-v2 | Larger head/longer tee/paws match B better;45 back-waist intersections and0→390 upper-arm contacts over0→8° inward arm bracket. |
| blockout-v3 | World-X underarm ease increased worst contacts to 971. Rejected; moving cloth into an arm is not radial ease. |
| blockout-v4 | Back ease and outward motion bracket passed four cheap poses. |
| transport-v1 | Validator clean, but full hidden body exported and clip called Animation;3.117MB gzip. Native counts alone were misleading. |
| transport-v2 | Disposable MASK bake + explicit merged clip name cut gzip to 1.248MB. |
| first actual sampler | Clip existed but maximum movement was 0.3µm: active-action evaluation had overwritten newly authored keys. Fixed by evaluating each new pose with no active action, assigning action/slot immediately before insertion. |
| first32-camera opening screen | No cloth contacts/export mismatch, but up to 852 visible removed body faces at upper arms/wrists. Historical tee exceptions were not carried over. |
| coverage-v1 | Restored continuous arms/deeper paws removed almost all holes;550 cloth contacts remained. |
| coverage-v2 | Narrower upper arm/deeper paws: zero opening faces,341 localized axilla contacts. |
| coverage-v3 + open rest | Targeted armpit drop/back ease; slightly more open rest. Seven dance extrema: zero contacts and zero opening faces. Promoted to final-construction-v2. |

## Whole-head revision after user review

The user clarified that the entire head was too large. `headScale` uniformly
scales every attached head feature around `headScaleAnchor`, preserving the
shared Head bone and neck attachment. Head75 was also rejected; another
reduction was shown as head45 and was still too large. Head35 is the current
local candidate; its size/style confirmation remains pending.

Independent asset review identified strongly pinched upper arms, elongated paws
and excessive tee flare. `head45-soft-final-v2` reduces upper-arm inset .4→.22,
forearm expansion1.35→1.2, shortens/widens paws while preserving proximal overlap,
and shortens tee extension .17→.12 with width/depth1.14→1.1. A cheap four-angle
probe and seven dance poses passed before the full final sweep. Broader gestures
(arm26°, forearm14°, torso4°) double maximum evaluated surface displacement to
0.245m while retaining the original6mm pelvis bob and fixed1.4s window.
The separate reviewer judged both silhouette findings materially improved;
mild wrist constriction and slender catalog trousers remain style differences.
Read `docs/audits/2026-10-20-bear-companion-visual-review.md` for exact scope.

Success presentation now reserves160×184px on desktop,128×148px on narrow phones
and standard short landscape,96×112px only on narrower short screens. Short
screens place the bear beside the copy. Camera distance5.2 fills the slot;
geometry tests measure colored body pixels, not merely the canvas. Current
focused browser checks passed body-height minimums and still/3D height parity.
Full integrated proof is recorded in the handoff when complete.

Prior head100 and head55 sources/exports/images/reports are preserved under
`revisions/proven-head100-v1/` and `revisions/proven-head55-v1/`. Historical report
paths retain their provenance; each `historical-path-map.json` maps original
names to archived bytes/hashes. Head55's full169-pose gate passed before the
refinement. These archived results do not establish current candidate proof.
Every construction revision preserves its input parameters beside its source.
Do not change shared parameters without retaining the prior input.

## Proof and remaining acceptance

Actual-runtime sampler uses installed Three.js GLTFLoader, AnimationMixer and
SkinnedMesh.getVertexPosition at 169 quarter-frame samples. It checks real skinning,
nonconstant motion, four normalized influences,24 bones, exact clip/duration,
rendered triangles, gzip and floor. It writes temporary binary geometry under
`artifacts/verification/bear-companion/runtime-geometry/`, not into git.

`verify_bear_companion.py` compares every rendered native/exported vertex in both
directions (30µm threshold), intersects actual native and runtime triangles, and
checks removed body faces from 32 standard cameras. Intentional attached
anatomical/face joins are excluded only from anatomical self-contact; head/shirt,
paw/sleeve and every garment pair remain checked. No inherited contact exceptions.

Current head35's full169-sample native/runtime/opening gate passed: zero contacts,
zero visible removed faces and maximum1.086µm source/export error. All15 materials
and rigid attachment checks pass; Khronos validation reports zero errors/warnings.
Actual browser captures and final game/profile checks are separate,
hash-bound evidence in `verification-summary.json` and the handoff; do not
inherit historical head45 browser results for this revision. Geometric
clearance checks compare different meshes; whole-garment self intersections are
not claimed absent. Existing catalog trim/layer joins intentionally overlap;
review the actual visible silhouette, following the catalog README diagnostic
policy. Art acceptance, private storage and public publication remain open.
The production manifest stays disabled until accepted publication.

R2 and Blob credentials are absent from this environment. Private push dry-run
stopped before network access. Candidate3D bytes are currently **local-only**;
the committed manifest alone cannot make them restorable on another machine.
Preserve this limitation in any handoff. Existing unrelated B04/F02/female files
were neither staged nor uploaded. Full manifest scan was checked against the
prior manifest (zero missing prior assets), then only owned bear entries merged.

## Repeatable commands

Run the shared queue from the repository root. macOS sandbox Metal initialization
failed before Python; the same queued Blender jobs worked with escalation.

```bash
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_bear_companion.py --source=assets/avatar/catalog-a/outfits/O01-head130-T01-B01-F01/outfit.blend --design=assets/avatar/catalog-a/companions/bear-v1/bear-design.json --output-dir=assets/avatar/catalog-a/companions/bear-v1/revisions/head45-soft-final-v2 --quality=final
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_bear_celebration.py --blend=assets/avatar/catalog-a/companions/bear-v1/revisions/head45-soft-final-v2/outfit.blend --output-dir=assets/avatar/catalog-a/companions/bear-v1 --duration=1.4 --fps=30 --render
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/blender/catalog/build_bear_companion.py --source=assets/avatar/catalog-a/companions/bear-v1/outfit.blend --design=assets/avatar/catalog-a/companions/bear-v1/bear-design.json --output-dir=assets/avatar/catalog-a/companions/bear-v1 --lod
node tools/avatar/sample_bear_runtime.mjs
python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py tools/avatar/verify_bear_companion.py --blend=assets/avatar/catalog-a/companions/bear-v1/outfit-lod.blend --glb=assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb --runtime-samples=artifacts/verification/bear-companion/runtime-geometry/samples.json --coverage --substeps=4 --output-dir=assets/avatar/catalog-a/companions/bear-v1
```

Start a guarded local viewer, then run `verify_bear_runtime.mjs`; see the asset
work package for the two-terminal commands. The browser verifier pins manifest
SHA/size, captures five poses in four desktop views plus phone/short front views,
and requires changing pixels, ready clip, completed GETs and full framing.

## Further whole-head feedback

The user still found the revised head too large. A separate head35 construction
and motion study reduces headScale .45→.35 (22.2% in every linear dimension),
keeping the body/outfit/neck/rig and all other parameters fixed. Saved inputs,
native sources, GLBs and <=320px views live in `revisions/head35-construction-v1/`
and `revisions/head35-motion-v1/`. This began as a size-review study and does not inherit the head45 dense proof.
After its own full169-sample sweep passed, identical verified copies became the
root local runtime candidate; production remains disabled pending acceptance.
Review silhouette before spending another full dense sweep.

The head35 seven-pose native screen passed zero intermesh contacts and zero
visible removed faces. A43-key actual Three.js screen passed clip/motion/weights/
phone-budget checks; maximum motion remains0.245m. Independent read-only visual
review found consistent whole-head scaling, connected neck and no new obvious
clipping/gaps in front/three-quarter/side/dance views. These cheap gates do not
replace a full169-sample native/runtime sweep or game-size readability review.
The subsequent full169-pose sweep passed zero native/runtime contacts and
visible opening faces, with maximum1.086µm export error; all15 materials passed.


## Exact-copy proof aliases and export ordering

The full head35 gate measured `revisions/head35-motion-v1/outfit-lod.blend`
and its GLB before promotion. Root runtime/native files are verified identical
copies. Root native/structure reports explicitly derive from the unchanged
original revision reports, retain their SHA-256 and declare the canonical path
aliases; no new measurement is claimed for a copy operation. The compact runtime
report retains the original full sampler payload hash.

A supplemental comparison proves all12 non-head runtime mesh attributes, world
transforms, oriented triangle multisets and all72 animation tracks are identical
to head45. A raw ordered-index attempt initially differed for three rigid sphere
meshes; investigation found only triangle ordering changed. The original failed
strict comparison is retained beside the semantic proof in the revision. For
unchanged-surface comparisons, preserve winding/duplicate face counts and exact
attributes; do not equate an exporter triangle-order difference with a shape edit.


## Artifact scripts and broad TypeScript discovery

Archiving the browser review runner as a deeper `.ts` copy caused the final
aggregate lint gate to resolve its relative imports from the wrong directory.
This was an artifact-runner failure, not a product source defect. Preserve such
script snapshots with a non-compiling suffix such as `.ts.txt`, or archive the
self-contained `.mjs` bundle; do not let history copies enter broad tsconfig
discovery. Keep the interrupted/failed verification result and run fresh afterward.
