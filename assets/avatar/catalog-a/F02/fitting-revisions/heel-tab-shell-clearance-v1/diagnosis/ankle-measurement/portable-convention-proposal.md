# F02 ankle measurement and proposed portable convention

Read-only measurement completed on 2026-10-07. No source, exported model, gait,
runtime binder, corrective, weight, contact role or acceptance limit changed.
This proposal needs root review before any implementation.

## Evidence and conclusion

`native-and-equivalent.json` freshly measures neutral bind plus all 163 gait
samples (101 walk, 62 run) twice: saved native actions and temporary poses from
the actual glTF SLERP evaluator. `actual-three.json` freshly loads the unchanged
F02 GLB and gait GLBs with GLTFLoader, AnimationMixer and the existing
`bindGarmentCorrectives`. `analysis.json` derives angles and comparisons from
those records and validates all their asset/tool hashes. These are measurement
reports, not a new accepted source/export or Three vertex deformation gate.

The largest raw-glTF/actual-Three difference is 7.546e-7 rad for ankle twist,
7.193e-7 rad for residual swing and 5.434e-7 for the existing knee value. World
matrix elements differ by at most 1.331e-6. Saved-native/raw-glTF differences
reach 0.001240497 rad for twist; the native quaternion curves and exported SLERP
remain separate pose domains. Equivalent native/raw twist differs by at most
3.307e-7 rad. Both source-native and actual runtime domains need later fitting.

Native Left twist spans -0.666912 to 0.354249 rad; Right spans -0.799169 to
0.200591 rad. Positive means dorsiflexion, negative plantarflexion. Off-axis
swing reaches 0.355192 rad (20.35 degrees). All sampled rotations stay within
the principal twist branch; no angle unwrapping was used.

The one additional bounded witness solves only Left/walk frames 18.4–18.6
against the twist at frame 16.25. It converges to **18.497394180297846**, with
raw-glTF angle error 1.973442e-9 rad (requested 1e-8). Actual Three's two twists
differ by 1.858282e-9 rad and both existing knee binder values are exactly zero.
At the same poses, the unchanged source under equivalent bone poses differs
by 0.167224572 rad in full ankle rotation, 7.673264 mm in maximum tab position
in Foot-local coordinates and 0.344727 mm in nearest tab/shell gap vectors.
The source-native pair at those exact frames has a 3.160219e-6 rad twist
difference and the same zero knee values. Both equivalent poses retain 10 Left
tab/shell pairs. All bracket evaluations and the exact fractional pose are in
`iso-angle-native-and-equivalent.json`; actual Three and derived analysis are
saved separately. No broad search followed.

An ankle twist plus the existing knee values therefore cannot reconstruct the
full tab/shell deformation. A conservative clearance envelope driven by one
angle might still clear both states; this experiment does not disprove that
possibility or establish a fitting error bound for it. Nearest-shell vectors
can change triangle targets and are instrumentation, not a sewn base identity.

The inactive Right knee regressions remain intact. At native run12.25, Right
twist is -0.618088 rad, swing 0.138791 rad, knee value 0 and own-shell pairs 118.
At run12.75 they are -0.799169 rad, 0.075407 rad, 0 and 120 respectively. The
equivalent runtime-pose source reproduces the same pair counts and zero knee
values. Existing knee semantics cannot distinguish those attachment states.

## Exact proposed control convention

Capture neutral bind before assigning any action or running the mixer, using
the same saved rig and export. For each side independently, let `L0` and `F0`
be normalized proper rotations of the bind Leg and Foot world matrices. Let
`L` and `F` be their current world rotations. Strip positive column scale;
reject reflection, shear or a missing/degenerate leg chain. Do not infer the
sign from a mirrored object name or a bone's local Euler X axis.

Use bind world positions to construct `forward = unit(ToeBase - Foot)` and
`up = unit(Leg - Foot)`. Define `a = unit(L0^T (forward × up))` in Leg-local
coordinates and `B = L0^T F0`. The ankle delta is

```
D = (L^T F) B^T
q = normalized quaternion(D), sign chosen with q.w >= 0
t = dot(q.xyz, a)
n = hypot(t, q.w)
T = quaternion(a * t/n, q.w/n)
twist = 2 atan2(t/n, q.w/n)
S = q * inverse(T)
```

`twist` is radians with bind zero and positive dorsiflexion on both sides.
Reject `n < 1e-10` (undefined orthogonal 180-degree twist). The current measured
gaits avoid the ±pi branch; any future wider gait needs an explicit branch
policy and fresh endpoint proof. Blender's `(x,y,z) -> (x,z,-y)` conversion is a
proper rotation and preserves this convention and sign.

Retain the full local rotation as the calibration input. A portable finite
control payload can contain twist and **two signed swing components**, with
`f = unit(L0^T forward)`, `u = unit(a × f)`, and the swing rotation vector
`v = log(S)` expressed in radians: `swing_forward = dot(v,f)` and
`swing_up = dot(v,u)`. The right-handed basis is `(f,u,a)` and
`q = exp(swing_forward*f + swing_up*u) * T` reconstructs the local delta.
Two swing components are proposed to preserve direction; no claim is made
that the minimum sufficient fitting dimension has already been identified.
The measured public helper implements twist/residual-swing instrumentation;
the signed swing payload and any corrective interpolation are still proposals.

Persist `B`, `a`, `f`, `u`, side/bone identities and their source/export binding
in explicit future asset metadata. Native evaluation should compute controls
from these matrices through a registered pipeline function and drive only the
new ankle correction. Any scripted driver or custom-property bridge needs
saved/reopened dependency-update proof; a raw local `ROT_X` driver is not an
equivalent convention. Three should compute the same controls after mixer
update and `updateMatrixWorld`, before applying new ankle morph influences.
Never recapture neutral bind from an already animated scene.

Keep the current knee binder and its clamps exactly as they are. Proposed
ankle control values remain signed radians; calibration and interpolation
must be source-bound and specify their own domain rather than borrowing knee
thresholds. Full rotation measurements permit a later conservative envelope
study without claiming a one-angle reconstruction.

Use comparison tolerances of **1e-5 rad** for twist/swing and **1e-5** for the
existing knee value; raw/Three rotation matrix elements must agree within
**2e-6**. These are instrumentation tolerances, not garment contact exemptions.
Preserve the native 0.8/25.6 walk and 0.8/16 run endpoints exactly. Float GLB
durations correspond to 25.600001335144043 and 16.000000476837158 frames, so the
sampled ends are just below duration and do not wrap. Actual default LoopRepeat
at exact duration wraps to time zero; a later binder verifier must also cover
that boundary explicitly.

## Required next work before any promotion

Root must approve the semantics and calibration scope first. A new isolated
construction must retain a physically attached basal shell triangle and ordered
base/tip ribbon, reference shape/position, unchanged body/rig/gait and unaffected
shoe weights. Any tab-only weight changes remain bounded to the audited 60
vertices, with normalized at most four influences and actual triangle evidence.
New side-isolated keys use `from_mix=False`.

Saved/reopened invariants, independent side checks, native and equivalent runtime
dense body/layer/detail gates, source/export and actual Three deformation proof,
and <=320px reference/attachment review remain required. The detail contract is
still 12 mm, zero prohibited own-shell contacts and `attachment_roles: null`.
No candidate was saved or promoted in this phase.
