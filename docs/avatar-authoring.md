# Reference-driven 3D authoring

Shared execution guidance for any coding agent. Use repository files, Python/Node
CLIs and the Blender queue; no chat history, MCP or particular agent tool is
required. Read `docs/avatar-workflow.md` for active candidates and acceptance state.
Catalog fitting also follows `tools/blender/catalog/README.md`.

## Establish likeness before production work

Preserve the approved reference, crop and provenance. Compare head/body ratio,
torso width, muzzle, eyes, ears, limb thickness and outfit silhouette in a matching
camera and pose. Side/back reconstruction from one image is a proposal, not
reference evidence. Review copies are at most 320px wide.

For a new character, fit the rig to its accepted anatomy. Human topology and
vertex-index contracts apply to edits of those canonical assets, not independent
replacement characters. Record the replacement's own rig contract. A fused outfit
can serve a fixed-outfit MVP; removable clothes need separate construction and fit
proof.

Use a cheap silhouette/export comparison before detailed sculpting, rigging or
dense sweeps. When revisions keep the same visible mismatch, reconsider the mesh,
reference or method before repeating the expensive pipeline. Record a concrete
shape decision before refining a construction base. Base approval, final animated
revision approval and technical acceptance are distinct.

## Preserve a reproducible revision

One owner/context controls coupled geometry, materials, rig and motion changes.
Independent code/read-only reviews can be delegated; serialize Blender jobs
through `tools/avatar/blender_queue.py`. MCP is optional scene access, not a
substitute for editable construction code or better geometry.

Save exact builder, parameters, helper dependencies, native source, export, tool
versions and hashes before changing shared inputs. A design JSON alone cannot
reproduce hardcoded construction. Use new output directories and retain rejected
studies with their demonstrated defects. The blockout replay runner and generated
bear builder illustrate both patterns.

Bind reports to inspected bytes. A changed GLB needs replacement-bound proof;
unchanged native geometry can retain its evidence while a new camera/still gets
separate evidence. Keep current status separate from historical passing reports.

## Bound paid generation

Read the shared Meshy skill, `tools/meshy/README.md`, command `--help` and current
provider documentation before choosing a paid operation. Pin model/options and
choose reference preprocessing deliberately. Aliases, topology targets and a
successful task do not guarantee appearance, size or usable deformation.
Inspect the actual output before paying for its next derivative.

An explicit preapproved budget covers matching operations within its scope/cap;
announce each cost and reconcile actual charges. It does not cover an unrelated
purchase or spending beyond that scope. Preserve submitted task ID/project before
waiting. On interruption, recover and poll that task before resubmitting. Balance
alone does not show which task ran. Distinguish entitlement from credit errors.
Keep secrets out of logs and downloads under `meshy_output/`.

## Prove a cheap animated export

Inspect actual object transforms, bone rest bases and units. Convert intended
world movement through both armature and bone transforms, preserving the bind
contract. The bear's imported 0.01 armature scale is a case study, not a universal
conversion. Keep the action inactive while deriving poses; bind action/slot when
keying, then reopen the saved export.

Inspect raw exported weights before a loader can normalize them. Check finite,
nonnegative, normalized deformation-bone influences under the runtime's limit.
Use actual GLTFLoader/AnimationMixer skinning for distinct evaluated poses,
motion, root travel, endpoints and floor contact. A clip entry or changing bones
does not establish moving geometry; CPU texture placeholders do not prove real
materials.

Measure actual triangles/compressed bytes. Optimize supported textures/attributes
before dense proof. Check required extensions, tangents and decoder compatibility
against the installed runtime and validator. The partial-quantization marker
repair in the bear retrospective is version-specific, not an unconditional patch.

## Keep proof scopes explicit

| Evidence | Establishes |
| --- | --- |
| Validator/inventory | Format, structure and measured budget; not likeness or deformation |
| Actual runtime skin samples | Exported motion, weights, root/floor/endpoint metrics |
| Native/runtime parity | Equivalent surfaces throughout sampled poses; establish one fixed bidirectional correspondence rather than a new nearest match per pose |
| Contact audit | Only declared mesh pairs, poses and tolerances; record intrinsic bind contacts separately from new contacts |
| Opening/silhouette review | Visible holes and shape defects that contact counts can miss |
| Actual renderer | Real textures/materials and framing in that renderer |
| Product-clock capture | Observed timing, readability and controls in the game slot |

Cover the full clip and inter-key poses; record cadence, count and tolerances.
The bear's 169 samples at 120Hz cover its 1.4-second clip, not arbitrary animations.
Zero new arm/body contacts on a fused mesh is neither zero self-contact nor
independent garment/wardrobe proof.

## Judge action at product size

Gallery/paused poses supplement actual game playback. Record event start, model
readiness and removal. Observe visible rendered frames and prove the full pose
envelope, including bounce and extended paws/ears. A preparatory GPU draw is not
a visible model frame. Check loading/still presentation too; preserve the actual
event lifetime and progression.

Measure the figure as well as its canvas. Check desktop, phone, short landscape,
combined narrow/short breakpoints, live resize, completion controls and reduced
motion. Adjust gesture, camera or reserved area from evidence. When presentation
changes, render a fresh source-bound fallback at least twice the largest CSS
dimensions; resizing old pixels is not a new render. The browser-verification
skill covers screenshot/media races.

## Close the requested stage

Track likeness, technical proof, source backup and public activation separately.
A manifest records identity; upload plus restore/hash retrieval proves remote
recovery. Local renders/intercepted fixtures do not establish a public model URL.
Respect explicitly deferred remote work while finishing authorized local work.

Leave exact sources, revision decisions, failed/passing checks and a portable next
action in the handoff. Detailed case evidence and tool entry points live in
`assets/avatar/catalog-a/companions/bear-v2/retrospective.md` and
`docs/superpowers/plans/2026-10-21-bear-reference-rebuild.md`; model-specific
dimensions, budgets and workarounds remain examples.
