# Female O05 (T05/B01/F04/A02) on the +30% head

Status: technical gates pass; art review pending.

1. **Core:** `female/outfits/studies/T05-B01-F04-head130` uses `--recipe T05,B01,F04 --source
   B01=../../../B01/fitting-revisions/pull-loop-compression-study/B01.blend`. Canonical B01
   with F04 has 584 boot contacts in every pose on both bases. The male fix, a B01
   revision with rear cuff room and local loop compression, works unchanged on the
   female base. The complete runner passes, 15/15.
2. **Beanie:** `attach_catalog_headwear.py` copies the A02 beanie from its female head
   study, along with its `under_A02` hair key by vertex index (the hair must match the
   study to 1 µm). Results:
   - **Motion:** 163 poses clear.
   - **Beanie gestures:** clear of the hair and sweatshirt.
   - **Export:** 1.1 µm.
   - **Materials and glTF:** pass.
   - **Gallery:** passes.
