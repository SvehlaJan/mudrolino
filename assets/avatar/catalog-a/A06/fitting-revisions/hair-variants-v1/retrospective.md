# A06 loop scarf with hair variants — retrospective (2026-10-09)

H03 curls and H05 silver waves reach the female O05 scarf (223 and 144 hair/scarf pairs
without a key). Each wears it through a drape study:

```
drape_catalog_hair_over_scarf.py --outfit-blend A06/fitting-revisions/o05-head130/female/outfit.blend
  --hair-blend H0x/fitting-revisions/selfie-head-v1/female/H0x.blend --hair H0x_hair
  --drop A02_folded_beanie --output-dir A06/fitting-revisions/hair-variants-v1/H0x
```

The study swaps the variant hair in for the bob and drops the beanie, which is fitted to
the bob (headwear is fitted per hair in A01/A02 `hair-variants-v1`). The variant gets its
own `over_A06` key from the same rule as the bob (`build_catalog_a06.drape_hair`).

| Hair | Max lift | Moved vertices | Motion | Head gestures | Export |
| --- | --- | --- | --- | --- | --- |
| H03 | 89 mm | 2,025 | 163 poses clear | clear | 1.1 µm |
| H05 | 44 mm | 1,208 | 163 poses clear | clear | 1.1 µm |

H04 and H06 clear the male O05 scarf with no key, so the hair-variant wardrobe sweep
includes it. It leaves out the female scarf for H03 and H05, which these studies cover.
Art review pending.
