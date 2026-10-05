# H01 reference-A refinement plan

**Goal:** Produce one reviewable H01 revision that approaches the approved face
and hair style while preserving the current fitting foundation.

**Architecture:** Keep revision outputs under
`assets/avatar/catalog-a/H01/style-revisions/reference-a/`. Use the same Head
bone and neck attachment on the existing body. Compare old/new head geometry
with identical lighting and camera settings; register it as a study only.

**Source review:** `docs/audits/2026-10-04-avatar-style-review.md`.

- [x] Copy the head construction into a revision-specific Blender builder rather
      than overwriting `tools/blender/catalog/build_catalog_head.py` or H01.blend.
      Load the existing styled foundation and replace H01_head only. Record source
      hashes and assert exact equality of body vertices, rig binds and actions.
- [x] Refine the face surface for the lower cheeks and chin while
      preserving the neck overlap. Re-seat facial features against the updated
      surface with `face_y`; avoid independent transforms that create floating
      eyelids, lips or eyebrows. Review front, side, back and three-quarter at 320px.
- [ ] Rework eye opening, nose bridge/tip and lip geometry. Repaint the stubble
      mask with a connected moustache/sideburn shape. Use white COLOR_0 for
      unpainted features, preserving the existing export material convention.
- [ ] Replace round front hair masses with elongated swept volumes. Keep a closed
      scalp and united smooth volume. Optimize the finished silhouette, recording
      vertex, triangle and material counts before and after rather than assuming
      remesh density alone proves quality or performance.
- [x] Export independent H01.glb and a study outfit.glb; preserve the old assets.
      Run `tools/blender/catalog/verify_catalog_head.py` with revision-specific
      --blend, --glb, --output-dir and --review-dir. Require all walk/run frames,
      head gestures, weights and reimport checks to pass. Run exported-material
      and Khronos validation using the existing catalog verification tools.
- [x] Expose the revision as a labeled study in the development viewer. Run the
      current desktop/phone inspection check and compare old/new with the same
      framing. Head/T05 clearance passed 163 sampled poses. Headwear, hood and
      facial expressions remain open before final promotion.
- [x] Save a retrospective covering visual differences, failed iterations and
      proof tied to the final revision hashes. Update progress/ROADMAP accurately;
      retain candidate status until the intended final checks are complete.

**Sequence superseded by the 2026-10-04 user clarification:** selfie
personalization uses a generated 2D texture on a reusable head. The completed
H01 revision remains a style reference. Next prove a separate UV-mapped,
texture-ready head with a neutral sample face, then the selfie texture flow;
expressions can follow that proof. See `docs/avatar-workflow.md`. Settle the
head/hair envelope before fitting A02 and completing O05.

First study implemented by `tools/blender/catalog/build_catalog_head_style_study.py`.
Remaining eye/nose/lip/hair tasks above include final sculpting, expression-ready
construction and geometry optimization; the first parameterized deformation
does not complete those requirements.
