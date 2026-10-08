# Avatar models versus the palette-A references

Historical review. The [2026-10-06 complete model audit](2026-10-06-avatar-model-audit.md)
supersedes the unfinished-work priorities below: painted H01/H02 faces are now
preferred, head proportions will be proposed for review before changes, and the
authoritative hoodie prompts exclude drawstrings. Preserve this dated evidence;
use the newer per-design matrix and source/proof qualifications for planning.

Reviewed 2026-10-05. Scope: every current (non-history) model in the live gallery,
both bases. Male: canonical body, H01 and its reference-A style revision, T01–T06,
B01–B04, F01–F04, A01 and the H01 study outfit. Female: foundation, H02 head and
hair, and the T02/B01/F01 outfit study. A02–A06 and H02–H06 (male) do not exist yet.

## Method

`node tools/avatar/capture_reference_audit.mjs` renders each model in the live
gallery (`/avatar-preview`) from front, three-quarter, side and back, crops the
head/torso/legs/feet, and pairs each crop with the matching 2D reference crop.
It also measures heads tall from the front silhouette, counting hair as head as
the references do. Review images are 320px wide. Curated pairs (reference left,
render right) and the manifest with model hashes are in
`assets/avatar/catalog-a/style-review/2026-10-05-reference-audit/`.

Generated references are not orthographic blueprints. These findings are visual
targets; every geometry change still needs its own fit, export and runtime proof.

## Cross-cutting findings

| Priority | Finding | Evidence | Change |
| --- | --- | --- | --- |
| Done | The viewer washed out the whole palette. Materials match the references, but ACES tone mapping plus bright ambient light rendered the T01 tee 137,177,218 (material 97,145,212; reference 85,136,223), the hoodie a pale 238,170,88 and the ivory trousers grey 210,207,199. | `lighting-before-after-*.png` | `AvatarScene` now uses `NoToneMapping` with a hemisphere light, a lower key and a low front fill. Tee 109,159,227, hoodie 255,145,68, navy 44,59,83 (reference 45,58,90), ivory 212,206,193. Renderer only; no model bytes changed. |
| 1 | Heads are too small. The reference male is 4.50 heads tall; the base body measures 5.25 and the reference-A H01 revision 5.77. Female reference 3.79; foundation 4.60, outfit study 4.84. Head width over height: male 0.195 reference versus 0.172–0.177; female 0.279 versus 0.219–0.221. | `body-front-full.png`, `study-h01-reference-a-front-full.png`, `female-foundation-h02-study-front-full.png` | Enlarge head and hair about the neck (roughly 1.2× male, 1.15× female), then refit everything that meets the head: hoods, collars, A01 and hair clearance. Needs a decision: the user kept the reviewed female proportions on 2026-10-04. |
| 1 | Faces do not read as the Genmoji style. H01: wide, squat head; large white sclera discs with small irises give a startled stare; spherical nose; thin raised mouth line; flat helmet-like hair. H02: a faint diagnostic face (tiny eyes, hairline smile) on a tall egg; hair is a smooth cowl over the forehead with no parting or waves. References: large dark irises with highlights and lids, defined brows, small nose, full smile, blush, voluminous swept/wavy hair. | `head-style-reference-a-front-full.png`, `female-h02-head-study-*.png` | H02: replace the diagnostic texture with a painted reference-style face in the same canonical layout. H01: enlarge irises, reduce visible sclera, add lids, soften nose, give the mouth volume; the texture-ready head contract suggests moving H01 to a UV face as well. Hair for both: taller swept volume (H01), side part and face-framing waves (H02). |
| 2 | Hoods are missing. T02, T04 and the female T02 have only a raised collar; the references show a large lowered hood lying on the upper back, drawcords in front and, for T04, the orange lining. | `T02-back-torso.png`, `T04-back-torso.png`, `female-outfit-T02-B01-F01-study-back-torso.png` | Model the lowered hood bowl as a controlled surface (as the female study's helper does), then rerun hair/head/layer fit. Settle head size first, because the hood's clearance depends on it. |
| 2 | Footwear is too flat and small. All four pairs have thin soles and low toes; the references are chunky with thick rounded ivory soles, raised toe caps and broad straps. | `F01`–`F04-three-quarter-feet.png` | Raise sole thickness and toe volume using the shared low-top/ankle helpers; F01 gets the broad strap and ivory toe cap, F03 the padded navy collar and wider straps, F04 rounded side panels (already noted 2026-10-04). |
| 3 | Bottoms lack construction detail and ease. B01 legs are narrower than the relaxed straight reference; waistbands, fly/button, belt loops and pocket openings are missing or faint on B01/B03/B04; B02 lacks the gathered balloon leg into its cuffs; B03 lacks the orange waistband lining and rolled hems; B04 lacks rolled ankle cuffs. | `B01`–`B04-*-legs.png` | Add waistband, button and pocket details as stitched detail materials; widen B01 legs; gather B02 above the cuff; add cuffs to B03/B04. Each needs fresh fit proof. |
| 3 | Rib bands are thin or absent. T02/T04/T05/T06 references have thick ribbed hems and cuffs; T06 also has an orange inner collar and three large navy buttons. | `T02`–`T06-front-torso.png` | Thicken hem/cuff bands with their own material; add the T06 collar lining and larger buttons. |
| 3 | A01 crown is shallow and the brim short. | `A01-three-quarter-head.png` | Raise the crown and lengthen the brim; refit after any head scaling. |
| 4 | Hands are small and thin compared with the reference's soft, rounded hands; skin renders slightly darker and more orange than the reference peach. | full-figure pairs | Defer; body changes invalidate every garment's fitting source. |

Closest matches: T03 (raglan), T05 (sweatshirt) and F02 (slip-on) read as their
references once colors are correct; remaining differences are rib thickness and
sole height.

## Head-size preview

`head-scale-preview.png` renders both clothed studies front-on with head and hair
scaled 1.0×, 1.1× and 1.2× about the neck, beside the reference (preview only; no
fit proof, and the scaled head intersects the hood). Measured heads tall:

| Base | Reference | 1.0× | 1.1× | 1.2× |
| --- | --- | --- | --- | --- |
| Male (painted-face study) | 4.50 | 5.80 | 5.31 | 4.22 |
| Female (T02/B01/F01 study) | 3.79 | 4.97 | 4.60 | 4.31 |

The male reference sits near 1.15–1.2×; matching the female reference fully would
need about 1.3×. The neck-row measurement is approximate.

## Order of work

1. Done: painted H02 face texture; H02 foundation proof and the female outfit
   runner (15/15) refreshed on the new bytes.
2. Done: texture-ready H01 study with a painted face and beard
   (`assets/avatar/catalog-a/H01/style-revisions/painted-face/`). The modeled nose
   stays; eye scale follows the reference ratio.
3. Head size and hair volume for both bases, if approved.
4. Hoods (T02/T04 male, T02 female), then A01.
5. Footwear volume, then bottoms and rib bands.

Each step keeps the current per-piece loop: isolated revision, full fit sweeps,
export/runtime proof and a retrospective. Accepted IDs remain empty until visual
acceptance.
