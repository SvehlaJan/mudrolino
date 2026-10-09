# Avatar construction targets

Execution companion to the [model improvement plan](superpowers/plans/2026-10-06-avatar-model-improvements.md). The catalog's focused images retain original sheets, exact prompts and crop hashes. This document resolves which design each ID means; it does not establish visual acceptance or fitting proof.

Approved palette A and existing references remain the design baseline. Both bases need independent fitted wardrobe variants. A reference-only entry never borrows a model from the other base. Body topology, indices, shared bind and gait bytes stay fixed. Proportion and disputed construction decisions below remain pending user review.

## Wardrobe

| ID | Shared construction target | Next work / dependency |
| --- | --- | --- |
| T01 | Cornflower blue crew-neck short-sleeve tee; relaxed straight body, rounded collar and hems. | Refine both fits; author female variant. |
| T02 | Tangerine pullover hoodie; lowered rounded hood, one joined kangaroo pocket, rib cuffs/hem; no zipper or drawstrings. | Fuller hood after approved head/hair envelope. |
| T03 | Ivory body, navy short raglan sleeves and neck ribbing; broad readable diagonal shoulder seams. | Retain relatively good male silhouette; female fit needed. |
| T04 | Navy zip hoodie, orange inner hood, ivory full-height zipper, divided front pocket, navy rib cuffs/hem; lowered hood and no dangling strings. | `zip-lining-v1` (2026-10-09): 14 mm ivory zip and orange neckline lining on the fuller hood; both O04s pass. Lining reveal and art review pending. Earlier: dedicated construction guide under review; hood after head/hair freeze. |
| T05 | Cornflower long-sleeve crew sweatshirt with navy ribbed collar/cuffs/hem; comfortable ease. | Modest male trim refinement; female fit needed. |
| T06 | Ivory long-sleeve henley, broad placket, exactly four navy rounded buttons and subtle orange collar facing. | User chose four on 2026-10-06. Male placket-v2 revision (2026-10-08): 38 mm placket, 21 mm buttons, orange back-collar facing; art review pending. Female fit still to author; retain superseded three-button source. |
| B01 | Navy straight trousers; relaxed leg, broad waistband/pocket detail, clear ankle opening. | Final cuff clearance after F01 dimensions settle; each base separately. |
| B02 | Cornflower joggers, gathered elastic boundaries and navy ankle cuffs; relaxed leg. | Repair-compatible F02 envelope before final cuffs; female fit needed. |
| B03 | Navy comfortable shorts ending above knee; simple rounded pocket and hem details. | Isolated bilateral keys now pass; fresh body sweep exposes increased contacts. Rear-hem/body/shoe deformation remains failed. |
| B04 | Ivory casual trousers, comfortable straight legs, readable broad pocket/waist details and rolled cuff target. | Isolated bilateral repair clears body/detail and diagnostic outfit/export/runtime gates. Art/cuffs/budgets and final recipes remain open; canonical unchanged. |
| F01 | Cornflower/ivory rounded low sneakers, exactly one broad ivory strap per shoe; rounded ivory sole. | Set dimensions before B01 cuffs; retain two independent fitted variants. |
| F02 | Navy slip-ons, ivory sole, orange rear heel tab; no straps. | Seventeen offset/attachment-weight screens failed. Ankle measurement and bounded witness support a separately calibrated correction experiment; preserve knee semantics, tab shape and 12 mm attachment/zero-contact limits. No candidate saved. |
| F03 | Cornflower high-tops, exactly three broad ivory straps per shoe, navy panels and ivory sole. | Collar/toe/sole refinement; retain 185 mm opening/face-safe coverage contract. |
| F04 | Tangerine ankle boots, navy elastic side panels, rounded ivory soles and simple rear heel loop. | Refine independent master and B01 compatibility; O05 requires A02. |
| A01 | Tangerine baseball cap with broad rounded crown and brim. | Rebuilt from head envelopes on both +30% bases with an `under_hat` hair key (2026-10-07); art review and strap colour (blue sheet vs navy female sheet) pending. |
| A02 | Navy/cornflower knitted beanie; broad folded rim and economical rounded crown. | Fitted on both bases and on H03, H04 and H05 (2026-10-09). |
| A03 | Navy rounded spectacle frames, restrained bridge/temples. | New attachment convention checked against face/ears/hair on both bases. |
| A04 | Cornflower soft-square spectacle frames. | Reuse proven glasses attachment; separate shape and clearance proof. |
| A05 | Tangerine rounded backpack, navy shoulder straps and readable simple closure/pocket detail. | New master; top/shoulder/arm/strap checks; completes O06. |
| A06 | Ivory loop scarf with navy panel; broad soft folds. | Built on O05 on both bases (2026-10-08/09); the bob, H03 and H05 drape over it through `over_A06` keys. Art review pending. |

## Heads, hair and expressions

Head proportions are chosen independently for the two bases. The review fixtures uniformly scale existing head/hair meshes by 1.0/1.1/1.2/1.3 about the unchanged Head bind anchor. They compare size only: the final cheek/jaw/hair silhouette still needs authoring and approval. Existing painted facial UV identity stays intact.

| ID | Identity / expression target | Next work / dependency |
| --- | --- | --- |
| H01 | Short swept brown waves, rounded friendly face and beard treatment. | Chosen male proportions, then cheek/jaw/nose and broad hair masses. |
| H02 | Brown shoulder-length smooth hair, readable parting and face-framing locks. | Chosen female proportions, then continuous rear mass and hood separation. Current UV/export/hair proof is refreshed separately. |
| H03 | Rounded dark curls. | Built and verified on the female +30% head (`H03/fitting-revisions/selfie-head-v1/female`, 26k-triangle ball-curl shell); cap/beanie refit and art review pending. |
| H04 | Short dark crop. | Built and verified on the male +30% head (`H04/.../male`, crop above the ears); cap/beanie refit and art review pending. |
| H05 | Silver waves and round glasses. | Built and verified on the female +30% head (`H05/.../female`, swept wave lumps); A03/A04 stay clear of the skin, temples enter the hair. Cap/beanie refit and art review pending. |
| H06 | Bald head, goatee and glasses. | The male +30% head without hair (`H06/.../male`); the goatee belongs to the selfie face texture. Art review pending. |
| E01 | Friendly neutral baseline. | Register approved neutral faces; no expression acceptance from transport proof alone. |
| E02 | Delighted. | Preserve identity; review readable transition from neutral on both faces. |
| E03 | Attentive. | Gentle focused brows/eyes; same identity and transition checks. |
| E04 | Encouraging. | Friendly supportive facial response, not a new identity. |
| E05 | Gentle surprise. | Readable but restrained eyes/brows/mouth response. |
| E06 | Blink. | Prove lid closure/opening and transitions first; choose texture/morph method after neutral target. |

## Assemblies and motion

| ID | Exact meaning | Review requirement |
| --- | --- | --- |
| O01 | T01 / B01 / F01 | Both complete bases; no extra cap. Female T01 currently missing. |
| O02 | T02 / B02 / F02 | Both bases after jogger/slip-on repair. |
| O03 | T03 / B03 / F01 / A01 | Raglan tee and repaired shorts; diagnostic T01 assembly is different. |
| O04 | T04 / B04 / F03 | Zip hoodie, repaired ivory trousers, three-strap high-tops; no extra cap. |
| O05 | T05 / B01 / F04 / A02 | Beanie required; T05/B01/F04 alone is a study. |
| O06 | T06 / B02 / F02 / A05 | Agreed button count, repaired slip-ons and backpack required. |
| capsule-T02-B01-F01 | Current female technical capsule, T02 / B01 / F01 | Retain this distinct name; it is not O02. |
| character-male | Male full-figure overview | Reference proportions and identity; current clothed preview recipe is T05/B01/F04. |
| character-female | Female full-figure overview | Reference proportions and identity; current clothed preview recipe is T02/B01/F01. |
| walk | Existing relaxed looping walk | Heel plants, arm balance, torso/head rhythm, sole grounding, loop seam and all garment openings. |
| run | Existing stronger looping run | Deep hip/ankle flexion, arm swing, brief flight, hood/hair/pocket/cuff/shoe clearance and loop seam. |

Each assembled recipe needs current body/layer/coverage/export/runtime evidence. A technical pass is separate from art approval and actual device budgets. New expressions and hair identities do not authorize changing gait bytes or a real-selfie service.

## Review decisions and evidence

- **2026-10-06:** User chose reference-matching proportion proposals for review first. All 16 fixtures were captured in four views with shared camera bounds per base and no runtime errors/failed requests. Review page: `artifacts/verification/avatar-catalog/proportion-options/2026-10-06-v3/review/review.html`. Recommended starting scale is +30% independently for each base; final user choices remain pending. Original source models are preserved.
- **2026-10-08:** User accepted the remaining T01 armpit crease edge (inner arm beside the torso, visible mainly from low front angles) as a known minor defect for now. In the A-pose and gait the inner arm presses against the torso, so no zero-contact construction can show that skin. The sleeve-opening cut is fixed by releasing only camera-visible sleeve-interior skin. A bounded armpit contact exemption or a wider base pose remain possible later.
- **2026-10-08:** User accepted two more contact classes for now. They are reported apart by `review_catalog_motion.py --accept CLASS:GARMENT` and everything else must stay at zero. **leg-fold** (B03 shorts): in the run back-kick the heel, calf and shoe pass into the rear of the shorts, where the bare body's own lower leg passes through its thigh (562 pairs) and trousers fold through themselves. **arm-brush** (A05 backpack): the swinging elbow and forearm sleeve brush the strap where it wraps round the waist in the walk.
- **2026-10-09:** User accepted, for now, see-through upper arm inside tee sleeves (T01/T03) during motion: up to 830 faces in male O01, mostly in the run at the sleeve opening. Coverage and skin-weight fixes failed; a sleeve and armhole rebuild remains possible later. User also chose to build H03–H06 as hair variants on the reusable selfie head, and a body LOD for O03.
- **2026-10-07:** User chose **+30% heads on both bases** (recommended option). Head-dependent pieces fit to measured head envelopes and landmarks rather than fixed coordinates; see `docs/audits/2026-10-07-avatar-fit-and-tooling-audit.md`.
- **2026-10-06:** User selected four large navy buttons for T06 on both bases, matching corrected outfit sheets. The original three-button category sheet and prompt remain historical.
- **2026-10-06:** H02 comprehensive verification reran in Blender 5.2.2 LTS and passed. Focused reports are explicitly derived from that current comprehensive result. Old reports and the missing historical comprehensive dependency are retained/documented in `assets/avatar/catalog-a/female/foundation/studies/h02-envelope/history/2026-10-06-proof-refresh/`.
- **2026-10-06:** B04's isolated side-key candidate passes canonical-reject/repaired-accept regression, invariant preservation and independent body sweep. Detail own-shell contacts remain a failed gate; no model promotion or new visual acceptance.
- **2026-10-07:** B04's later bilateral attachment candidate clears all 164 detail poses and 29 native/export/runtime gates. Original construction has a retained tool-provenance qualification; fresh derived preservation binds 17 complete current tools. Art/cuffs/recipes/budgets remain open and canonical sources are unchanged.


### 2026-10-07 complete B04 shell qualification

Whole garment self-clearance was missing from the earlier body/layer/detail
scope. B04 has 55 rest and up to 549 run self-pairs; complete signed-X inventory
finds 41 inherited Right coordinates. A guarded non-saving key reset preserves
body/shoe/detail clearance but cannot clear the shell. B04/O04 current technical
review is repair-needed; earlier reports remain scoped and unchanged. Other
garments require an explicit whole-shell audit before complete acceptance.
Evidence: `assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/centre-key-repair-v1/retrospective-centre-and-shell.md`.
