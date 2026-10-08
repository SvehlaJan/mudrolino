# H01 +30% head retrospective

Status: technical checks pass; art review pending. Decision: the user chose +30%
heads on both bases on 2026-10-07. Among the reviewed options, +30% is closest to
the reference sheets: the models were about 5.6 heads tall versus about 4–4.5 in
the references.

Builder: `tools/blender/catalog/build_catalog_head_scale_study.py --base male --scale 1.3`.
Verifier: `tools/blender/catalog/verify_catalog_head_scale_study.py`. The painted
H01 head scales uniformly about the Head bind anchor (0, −0.0071, 1.4688 m). UVs,
face image, weights, rig, body and gaits are byte-identical in signature.
`head-landmarks.json` records the scaled skull centre, brow and ear landmarks for
headwear.

Fresh checks (`verification-report.json`): sources unchanged; head equals the
scaled source to 1 µm; single rigid Head weight; hair and T05/B01/F04 clear over
163 quarter-frame gait poses plus six gestures; face TEXCOORD_0, embedded image
and reciprocal UV-corner identity; 16-pose export 0.6 µm. A read-only probe found
zero new contacts with any of T01–T06 at this scale, hoods included. The neck seam
embedding (≈354 head/body pairs) is unchanged from the unscaled head.

Open: hair silhouette refinement, and re-exporting other wardrobe previews that
still embed the original head.
