# T06 broad placket revision retrospective

Status: technical gates pass; art review pending. Builder:
`tools/blender/catalog/build_catalog_t06_placket.py` (through `build_piece`, on the
+30% male foundation). The canonical T06 stays unchanged.

The canonical henley had the user-chosen four buttons (2026-10-06), but as 11 mm
dots on a 22 mm placket, which read as specks at runtime size. Following the
four-button reference, this revision has:
- a 38 mm placket from 1.405 to 1.283 m with a rounded bottom
- four 21 mm rounded navy buttons, 27 mm apart
- an orange collar facing on the inner neck rib and the upward-facing back rim

The front rib stays ivory, as in the reference. The inner surface alone lies
against the neck and never showed, so the back rim carries the visible orange.

Gates:
- **Piece:** 163-pose motion clear against body and the +30% head. Stitched
  placket/buttons stay within 11.4 mm of the cloth over 164 poses (12 mm cap).
  Head clearance, glTF validation of `T06.glb` and `body-T06.glb`, and materials
  pass. `build_piece` now keeps UVs for painted heads.
- **Outfit:** worn as T06/B01/F01 on the +30% head (`outfits/T06-B01-F01-head130`,
  a review combination, not O06), 163 poses are clear with zero coverage holes,
  16-pose export at 6.07 µm and valid glTF.
- **Shown alone:** one hip face at the hem is visible from a low camera; trousers
  cover it.

Open: female T06, O06 (needs F02 repair and A05), and art review of button scale
and facing strength.
