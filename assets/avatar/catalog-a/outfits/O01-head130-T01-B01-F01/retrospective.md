# Male O01 (T01 / B01 / F01) on the +30% head

Status: exact male O01 with canonical masters on the +30% painted H01. Fit/export
gates pass; art review pending. T01 carries the sleeve-opening gap found on the
female fit (same coverage rule).

Foundation: `build_catalog_scaled_male_foundation.py --head-study
H01/style-revisions/painted-face-scale-130`. It takes the canonical body and rig
plus the verified scaled head, checked by its signatures. Assembly:
`assemble_catalog_outfit.py --uv-export`, a new opt-in. The garment exporter
drops texture coordinates, which made the painted face invalid glTF
(MESH_PRIMITIVE_TOO_FEW_TEXCOORDS).

Gates, run individually because the male runner hard-codes the canonical
foundation and outfit naming: corrective sides; 163-pose outfit motion with
zero body/head/layer pairs; 16-pose export at 6.07 µm; head clearance; glTF
validation of body/garments/outfit; materials. Runtime correctives are not
applicable (no active corrective values, as in the canonical cap-free outfits).
`verify_catalog_correctives.ts` now skips textures, because Node cannot decode
them. Desktop/phone gallery playback passes.
