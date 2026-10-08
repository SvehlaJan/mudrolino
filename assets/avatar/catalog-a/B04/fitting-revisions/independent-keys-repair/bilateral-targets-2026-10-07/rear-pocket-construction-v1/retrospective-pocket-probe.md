# B04 rear-pocket construction probe — 2026-10-07

Root alone used the verified cuff source `291d4927…` as an unchanged baseline.
The reference has broader, lower rear patches with rounded lower corners. The
proposal retains the actual paired 11 × 11 surfaces and all original topology,
materials, smoothing and UV corners, changing only 484 pocket coordinates,
weights and key coordinates in memory. Footprint: 100 × 100 mm, top Z 920 mm,
inner X ±33 mm, lower radius 35 mm; inner/outer cloth offsets 1.4/2.6 mm.
Every point samples its actual underlying cloth triangle before thickness.
Root reviewed both 320px rear views. This is a visual proposal, not approved art.

The complete non-saving screen **failed** in both ordered 164-pose domains:
54 maximum patch/cloth pairs and 17.234 mm maximum detail distance against the
unchanged zero-contact / 12 mm limits. Visible-body and F01/F03 pairs were zero.
There were 106 failing poses per domain; no blend or GLB candidate was saved.
The live cuff/O04 model bytes remain unchanged. Exact execution tools, input
hashes, plan, all pose rows and contact faces remain in `rounded-footprint-probe/`.
The process exited 0 while its report explicitly says failed; this is not a pass.
Full stdout was observed but not redirected; its preservation is not claimed.

Five-pose native diagnosis separates two defects. Allowing the sampled opposite
corrective reduced run-8.5 host transport error from 21.972 to 3.812 mm and detail
distance from 17.234 to 8.248 mm, but increased left patch/cloth pairs from 0 to 88.
Walk-19.5 still had 40 left / 14 right pairs. That counterfactual deliberately
violates independent patch-key isolation and is not a fitting candidate. Broad
geometry needs host-surface conformity as well as sound corrective provenance;
copying opposite keys or moving all patches outward cannot establish the target.

Read-only centre-strip audit found 18 positive-X vertices whose Right deltas
exactly equal Left deltas (up to 25.972 mm). The old isolation gate excluded the
central 40 mm strip, so its recorded passes do not establish independence there.
Both sides' original pelvic skin legitimately mixes Hips/LeftUpLeg/RightUpLeg;
clearing bone weights would not fix inherited corrective coordinates. Prior
fit/export passes remain their recorded scope, with this additional technical
repair qualification. No current-source acceptance is inferred.

Next bounded step: audit the complete centre-strip side assignment, then screen
removing the identified inherited Right coordinates on an isolated in-memory
baseline, preserving intended Right targets, body, rig, gaits, cuffs and all
other garment fields. Require complete native/equivalent fit/detail/self/layer
proof before saving. Only then retry the broad rounded reference footprint on a
surface construction that follows host triangulation; do not shrink it to make
an easier fit or relax isolation, collision or distance limits.

Workflow: a separately tested batched edit helper removes eligible indices once
per vertex group. Applying the identical 484-vertex plan took 0.00487 seconds in
the native diagnostic and preserved all unaffected signature fields. The initial
builder still contains its original repeated removals; adopt the tested helper
in the next version while retaining this execution source. Initial preflight
skin/centre-key assumptions and their exact tool snapshots remain in `history/`.
