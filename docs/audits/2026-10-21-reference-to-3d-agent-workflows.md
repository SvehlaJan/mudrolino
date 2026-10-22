# Faithful 2D-reference-to-3D character workflows for coding agents

Researched 2026-10-21 against primary documentation and source. Research only:
no installation, generation, paid request, modeling, secret inspection, or asset
acceptance test was performed. Versions and prices below are a dated snapshot.

## Recommendation

Start the bear again from its approved reference proportions. The smallest useful
toolset is the existing Blender CLI/queue, a vision-capable agent, and reproducible
reference-versus-render review images. A Blender MCP is optional convenience for
that feedback loop; it does not supply better character geometry by itself.
If generation is wanted, test one bounded **multi-image Meshy candidate** after
the turnaround is approved, then continue in Blender. Tripo is the useful second
candidate when segmented parts or its low-poly model family answer a specific
problem. This ranking is project judgment, not a measured generator comparison.

The previous failure was an incorrect shape prior: retaining a slender human
torso and limbs while changing bear features. More tools do not establish likeness.
The restart should permit a new bear mesh and bear-specific proportions, while
preserving only independently required runtime/rig contracts. Fit the skeleton
to accepted anatomy; do not let a human mesh decide the anatomy.

## A practical likeness-first loop

This is a proposed workflow, not a claim that these steps have already succeeded.

1. **Make one reference contract.** Use the original approved artwork as the
   primary authority. Record head/body height, head/torso width, belly width,
   muzzle projection, eye spacing/height, ear placement, shoulder width, limb
   length/thickness, paw size, and clothing outline in normalized coordinates.
   Separate visible evidence from invented back/side anatomy. Produce front,
   profile, back and three-quarter views in the same neutral pose, scale and
   outfit. Generated turnarounds are proposals: reject a sheet that changes the
   eye spacing, muzzle, belly, hands or garment between views.
2. **Block out a new bear.** Use a handful of editable masses with named
   parameters for head, muzzle, ears, torso, arms, legs and paws. Use separate
   eyes, nose and clothing objects. Render flat clay/silhouette views first;
   texture and lighting must not conceal bad proportions. Do not reuse the
   human surface merely to retain its existing index map.
3. **Measure and look after every meaningful revision.** Lock cameras, crop,
   pose and lighting. Compare the source-view silhouette, landmark offsets and
   ratios; inspect side and three-quarter volume as well. Use silhouette overlap
   only for views whose camera/pose match. Review copies must be at most 320px
   wide under this repository's rules. Keep a short list of concrete corrections
   per iteration, and retain the last accepted shape. Numeric closeness assists
   visual judgment; it is not an automatic likeness score.
4. **Accept coarse likeness before surface work.** Then sculpt secondary forms
   or import a generated candidate as a shape reference. Build intentional
   deformation topology around shoulders, hips, elbows, knees and mouth/eyes
   where needed. Blender documents retopology as useful for generated/sculpted
   meshes that will deform; voxel remeshing is useful for sculpting/blockout, but
   is not the same promise as animation-ready edge flow.
   [Blender retopology manual](https://docs.blender.org/manual/en/4.0/modeling/meshes/retopology.html).
5. **Keep garments genuinely editable.** Model body and removable clothes as
   separate surfaces with seams, openings and thickness appropriate to the target.
   An automatically segmented jacket does not establish a complete body beneath
   it, usable garment interiors, clean cuffs, or compatible deformation. Those
   properties need explicit inspection and repair.
6. **Rig the accepted form and test its actual motion.** A custom armature or
   fitted Rigify components can preserve the bear proportions. Rigify generates
   controls from a metarig, whose bones must be positioned to the geometry; it
   does not require adopting a human mesh. Keep its editable metarig.
   [Rigify basics](https://docs.blender.org/manual/en/latest/addons/rigging/rigify/basics.html),
   [Rigify component API](https://developer.blender.org/docs/features/animation/rigify/).
   Test raised arms, belly compression, paw contact, garment openings and the
   real celebration clip before adding fine detail.
7. **Choose an exportable fur treatment.** For this small web character, start
   with a soft material, painted/baked fur direction and restrained mesh tufts.
   Test fur cards only if the silhouette needs them. Blender-only procedural
   shaders and strand curves are not automatically transported to glTF: its
   exporter supports recognized PBR/unlit material structures, mesh skinning and
   morph animation, and requires converting non-mesh curves to mesh. Bake detail
   to supported textures and verify the actual GLB in the app.
   [Blender glTF manual](https://docs.blender.org/manual/en/3.6/addons/import_export/scene_gltf2.html).
   The cited manual is older because current manual pages failed to fetch;
   confirm the installed 5.2 exporter before choosing exact options.

The existing [authoring-process research](2026-10-19-avatar-authoring-process-research.md)
still supplies the later export, weights and motion gates. Those gates cannot
substitute for rejecting a visually wrong blockout.

## Blender MCP: useful interaction, not a shape generator

The original `ahujasid/blender-mcp` URL now redirects to **mcp-for-blender**.
Its current README explicitly documents Claude Desktop, Claude Code, Codex,
Cursor, VS Code, OpenCode and Antigravity setup; Codex is no longer merely an
assumed compatible client. It connects a client-side MCP server to a Blender
add-on. It exposes Python execution, object/material changes, scene inspection
and multi-angle/wireframe/render feedback; generation integrations call separate
services. It requires Blender 3.0+, Python 3.10+ and uv. These are documented
capabilities, not a compatibility test of this machine's Blender 5.2.2.
[Current project README](https://github.com/ahujasid/mcp-for-blender).

The source also exposes topology and weight-health fields in scene inspection,
and image-returning viewport tools. That helps an agent close the inspect/edit/
render loop. It does not remove Python/context failures, long Blender operations,
or the need for critical visual review.
[MCP server source](https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/src/blender_mcp/server.py).

Current telemetry policy distinguishes minimal anonymous usage metadata (on by
default) from prompts/code/screenshots/scene content (opt-in). Set
`DISABLE_TELEMETRY=true` to disable all telemetry. Do not repeat older claims that
all content is necessarily uploaded by default. The bridge executes arbitrary
Python in the user's Blender process. Its opt-in `BLENDER_MCP_SAFE_MODE=1` AST
guard covers the MCP path, while the local socket can still accept raw execution;
the project explicitly says this is not a sandbox. Keep it local and inspect/pin
the installed version rather than blindly running an installer.
[Telemetry policy](https://github.com/ahujasid/mcp-for-blender#telemetry-control),
[safe-mode source and stated limits](https://raw.githubusercontent.com/ahujasid/mcp-for-blender/main/src/blender_mcp/safe_mode.py).

Because the existing queue already executes Blender scripts and renders, adding
MCP is not the immediate unblock. Its benefit would be persistent live scene
inspection and shorter visual iterations. Installing it is optional work needing
an explicit setup decision; no installation was performed here.

## Image-to-3D alternatives

| Tool | Verified capability and suitability | Constraints and cost snapshot |
| --- | --- | --- |
| **Meshy 7.1 API** | Accepts 1–4 images of the same object; first image is the primary front view. Separate geometry and texture references, PBR, and a pose option are available. Good bounded candidate for a reference-driven shape start. [Multi-image API](https://docs.meshy.ai/en/api/multi-image-to-3d). | Standard geometry: **20 credits mesh-only; 30 with 2K/4K textures; 35 with 8K**. Ultra 2K adds 5. No USD conversion asserted because purchased credits/plan determine it. [API pricing](https://docs.meshy.ai/en/api/pricing). |
| **Tripo H3 / P1 API** | H3 accepts four ordered slots `[front,left,back,right]`, front required and at least two actual images. P1 is positioned by its docs for cleaner low-poly output, with face limit 48–20,000; this is a vendor positioning claim, not measured bear fidelity. [H3](https://docs.tripo3d.ai/model-generation/multiview-to-model-v3-0-v3-1.html), [P1](https://docs.tripo3d.ai/model-generation/multiview-to-model-p1-20260311.html). | H3 multi-view **20 credits geometry / 30 textured**; P1 **40 / 50**. H3 extras include quad +5, generated parts +20; segmentation 40, rig 25. USD not inferred. Studio subscriptions have separate credit costs from API. [API pricing](https://docs.tripo3d.ai/get-started/pricing.html). |
| **Hunyuan3D 2.1 local** | Separate image-to-shape and PBR texture stages. Official README lists macOS/Windows/Linux; practical support must still be tested. [Repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1). | README states **10GB VRAM shape, 21GB texture, 29GB combined**. Its community license explicitly excludes EU, UK and South Korea: do not recommend ordinary local use for this Europe/Warsaw context without resolving applicability. [License](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE). |
| **Tencent HY 3D Global cloud** | Distinct from locally licensed 2.1 weights. Official cloud API documents front input plus left/right/back views, PBR and geometry/low-poly modes. Newer hosted Model 3.0/3.1 are mentioned in billing. [Official API PDF](https://staticintl.cloudcachetci.com/doc/pdf/product/pdf/1281_74103_en.pdf). | Pro: geometry 15 credits, textured 25, low-poly 30; multi-view +10, PBR +10, custom face count +10. $0.015/credit for smallest prepaid pack ($15/1,000), $0.02 postpaid. Example textured multi-view+PBR =45 credits: **$0.675 prepaid allocation / $0.90 postpaid**. Cloud account eligibility/terms need separate confirmation; local 2.1's restriction is not proof of cloud ineligibility. [Official billing](https://www.tencentcloud.com/document/product/1284/75281). |
| **TRELLIS / TRELLIS.2 local** | Original TRELLIS has multi-image conditioning, explicitly described as a tuning-free extension that may not suit every input. TRELLIS.2 produces textured PBR meshes and supports open surfaces; neither statement promises separate editable clothes or animation topology. [TRELLIS](https://github.com/microsoft/TRELLIS), [TRELLIS.2](https://github.com/microsoft/TRELLIS.2). | Original: Linux tested, NVIDIA ≥16GB. TRELLIS.2: Linux tested, NVIDIA ≥24GB, CUDA. TRELLIS.2 model/code MIT, some renderer dependencies have separate licenses. A Mac Blender installation alone does not satisfy these prerequisites. No hosted API price verified. |
| **SAM 3D Objects** | Reconstructs shape, texture and layout from a single image plus object mask; aimed at natural scenes/occlusion. Interesting geometry proposal, but no demonstrated advantage for a clean stylized turnaround or riggable bear. SAM 3D Body is human recovery, unsuitable as a bear shape prior. [Official repository](https://github.com/facebookresearch/sam-3d-objects). | Official setup: Linux, NVIDIA ≥32GB VRAM, gated checkpoint access. Code/weights use **SAM License**, not MIT/Apache; review conditions for redistribution/use. [Setup](https://github.com/facebookresearch/sam-3d-objects/blob/main/doc/setup.md), [license](https://github.com/facebookresearch/sam-3d-objects/blob/main/LICENSE). No official hosted API price verified. |

### What generated output does not establish

Meshy's remesher offers quad-dominant or decimated triangle output, including
external input meshes. A quad checkbox is not evidence of joint loops, clean
mouth topology, garment interiors, or deformation quality.
[Remesh API](https://docs.meshy.ai/en/api/remesh).
Its rigging API explicitly works best for standard humanoid bipeds with clear
limbs, and excludes non-humanoid assets; a squat stylized bear needs a real
deformation trial rather than an assumption that automatic rigging will work.
[Rigging limits](https://docs.meshy.ai/en/api/rigging).

Tripo H3 `generate_parts` creates editable segments but cannot combine with
texture/PBR or quad output in that request. Its rig docs warn remeshing,
segmentation and completion discard input skinning/animation; finish geometry
edits before rigging. Separate parts therefore still require an intentional
clothing/body workflow.
[H3 parameter constraints](https://docs.tripo3d.ai/model-generation/multiview-to-model-v3-0-v3-1.html),
[rig lifecycle constraints](https://docs.tripo3d.ai/animation/rig-v2-5-20260210.html).

Meshy's official help says paid customers own generated assets subject to input
rights, while free outputs use CC BY 4.0; API access is paid-plan only. Tripo terms
distinguish free and paid user ownership, and grant the provider service-related
rights; its help/Studio pricing pages currently differ on free commercial use.
Use the paid/private route for this candidate and verify account terms before
spending rather than infer rights from a free export button.
[Meshy ownership](https://intercom.help/meshy/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained),
[Meshy API availability](https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan),
[Tripo terms](https://www.tripo3d.ai/terms),
[Tripo commercial help](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially),
[Tripo Studio guide](https://www.tripo3d.ai/product-doc/getting-started/pricing-credits).

## Concrete unblock and uncertainties

- **For the local restart:** confirm the exact source artwork/variant and which
  body/rig requirements really must be retained. Approve a consistent turnaround
  and coarse bear silhouette before authoring detail. No new subscription or MCP
  is required to begin that reviewable blockout.
- **For an optional generated candidate:** approve provider, uploading the
  reference images, and a fixed credit cap. A single standard Meshy multi-image
  geometry candidate is currently 20 credits; two candidates 40, before textures,
  remesh or rigging. Under repository rules, summarize actual command cost and
  wait for approval before `--confirm-spend`. No chargeable call is authorized by
  this research note.
- **For MCP:** explicitly authorize installing/configuring a pinned build only
  if live viewport interaction is wanted. Keep content telemetry disabled and
  evaluate its socket/execution exposure. Do not install it merely hoping it
  changes likeness quality.
- No same-reference generator trial, topology audit, local GPU capability test,
  cloth deformation test or likeness comparison was performed. Vendor benchmark
  claims do not rank these tools for this bear. CUDA requirements are documented
  prerequisites, not proof a community Mac port cannot work. Prices and APIs
  can change; recheck the chosen operation immediately before a paid request.
