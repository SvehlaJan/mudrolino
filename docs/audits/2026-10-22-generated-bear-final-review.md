# Generated bear v4: independent final visual review

Reviewed 2026-10-22. No blocking visual issue found for keeping this version locally. This is an independent review of the saved evidence, not a new browser run or a record of the user's approval. Approval and final integration results are recorded separately.

## Exact candidate and evidence

- Runtime: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v4/web-v1/model.glb`, SHA-256 `598ac628256d676867067268e96075bce7d47a5d81d2a613d5a7f9b104e56fc3`.
- Native source: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v4/celebration.blend`, SHA-256 `9376c704dfd46a590153dc9ae406e98e8dbee95993c2ca1eb4f26e50382e144f`.
- Both hashes were independently recomputed from local bytes. The product and gallery receipts bind this runtime; all recorded application-source hashes still match the reviewed files.
- Reference: `assets/avatar/concepts/2026-10-21/bear-rebuild/reference-b-fullbody-review.png`.
- Native views: v4 `neutral`, `front`, `side`, `back`, and three dance review PNGs. Fallback: `still-v2/bear-still-review.png` and its source-bound render receipt.
- Strict gallery receipt: `artifacts/verification/bear-companion/generated-v4/browser-strict-v1/browser-report.json`, profile `actual-renderer-fixed-candidate`, Chromium `148.0.7778.96`, started `2026-10-22T04:10:28.999Z`. It records 30 framed views, motion, and no console/request failures.
- Product receipt: `artifacts/verification/bear-companion/generated-v4/product-framed-v2/product-clock-report.json`, created `2026-10-22T04:09:53.703Z`, profile `actual-product-clock-controlled-media`. Reviewed the five viewport UI copies, pose montage, selected gallery angles, and five frames extracted from `desktop-actual-clock-figure.gif`. All inspected images were at most 320px wide.

## Visual findings

The candidate preserves B's defining identity: a broad rounded head, large circular ears, short cream muzzle, small dark nose and eyes, friendly curved mouth, warm honey fur, blue T-shirt, dark trousers, and blue shoes with cream soles. Head-to-body proportions remain recognizably close to the accepted Meshy base. The neutral arms sit farther from the torso than the 2D reference; that is a visible retained construction compromise. Runtime fur and facial highlights are simpler than the softly lit illustration, while the character remains warm and readable.

The sampled native and actual-runtime poses show a distinct broad arm cheer, head/body tilt, bounce, and return. The face remains a fixed smile; expression comes from the pose rather than facial animation. No gross shoulder collapse, detached extremity, or visible arm-through-torso defect was found in the inspected samples. Fine irregular texture flecks on the shirt/trousers are visible in the enlarged phone gallery; they are subdued at the smaller product size and are nonblocking here.

The product screenshots retain the full figure, praise, and Continue button without overlap or horizontal overflow. Portrait layouts stack the figure above the text; short layouts put it beside the text. Receipt measurements are:

| Viewport | Reserved slot | Actual sampled figure height |
| --- | --- | --- |
| 1280×900 | 176×200 | 159–164px |
| 390×844 | 144×164 | 131–134px |
| 320×568 | 144×164 | 131–135px |
| 667×375 | 144×164 | 131–134px |
| 568×320 | 112×128 | 102–105px |

The product receipt reports full framing across 158–161 motion samples per viewport and successful Continue clicks returning to the question. The smallest top margin is only 1px on constrained viewports: the current version fits, but further camera tightening or larger motion needs new proof. Some native dance review crops touch the extended hands at their edges; the actual product and strict gallery framing receipts are the relevant runtime evidence.

## Technical scope and limits

Native/runtime parity passes 169 sampled poses with maximum vertex error approximately 3.48µm. The clearance audit records **48 intrinsic bind-pose contacts, at most 62 total contacts, and zero new arm-versus-torso/leg contact pairs**. This does not establish zero contacts, separate garments, or wardrobe compatibility.

The fallback was freshly rendered from the same native source at 352×400, frame 0, camera distance 5.6, for a maximum 176×200 CSS slot at 2× resolution. Its reviewed silhouette and identity agree with the animated candidate.

The product probe uses the actual Alphabet answer and animation clock, with audio/speech completion stubbed and praise held. The GIF review sampled motion rather than establishing every temporal detail. This audit does not independently rerun all eleven games, real audio, WebKit, or the release matrix. Source inspection confirms the added 568×320 tests cover feedback and completion controls in both Slovak and Czech; their final integration outcome remains the root runner's responsibility. No model, Blender source, frontend implementation, or publication state was changed by this review.
