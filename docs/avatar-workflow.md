# Avatar workflow and agent handoff

Updated 2026-10-04. This is the entry point for both Codex and Claude. Use
`AGENTS.md` for repository rules, the shared Blender skill for execution, and
`tools/blender/catalog/README.md` for the detailed fitting/acceptance loop.

## Resume in the correct checkout

Current work is on `feature/avatar-catalog` at
`/Users/svehla/.codex/worktrees/avatar-catalog/teo-learn`. The primary checkout
has other work; launch Claude in this worktree to continue these assets.
The user requested committing all avatar work on this branch after the Blender
update and female reference expansion. Check `git log -1` and `git status` before
resuming; the primary checkout has not been merged or changed by this handoff.

The live development gallery is http://127.0.0.1:3004/avatar-preview. Open a card
for references, model inspection, prompts and source files. The read-only gallery
refreshes as local asset files change; use Include history for older attempts.
Use `?model=study-h01-reference-a` for the revised head on the study outfit,
`?model=head-style-reference-a` for its head alone and `?view=modular` for the
original runtime workbench. See [viewer controls and checks](avatar-catalog-preview.md).

Authoritative inputs:

- [Approved palette-A gallery](../assets/avatar/concepts/2026-10-04/catalog-a/gallery.md):
  rounded matte Genmoji-like style, original category designs and construction sheets.
- [Female reference pack](../assets/avatar/concepts/2026-10-04/catalog-a-female/gallery.md):
  turnaround, six outfits, hoodie construction and accessory fit, with Claude
  modeling steps and exact prompts. Female 3D assets still need their own proof.
- [Progress and proof pointers](../assets/avatar/catalog-a/catalog-progress.json):
  status of each ID, study paths and outstanding repairs. Accepted IDs are empty.
- `assets/avatar/catalog-a/foundation/catalog-body.blend`: shared fitting body/rig.
- Piece `.blend` files, builders and retrospectives: editable construction sources.
  Keep isolated fitting/style revisions separate until their dependent proof passes.

At this handoff, eleven wearables retain fitting-candidate status; B03/B04/F02
need corrective repair. F04's independent checks and isolated T05/B01/F04 core
have passing proof, while complete O05/A02 and promotion remain open. The H01
revision is a style study, with no facial UV export or expression targets. These
are useful milestones, not an accepted production catalog. The female base and
separately fitted wardrobe remain in scope after current catalog acceptance.

## Register assets for the gallery

After adding references or exporting models, use the live gallery to confirm the
new files and their status. Images under `assets/avatar/concepts/` are discovered
without editing React code. Keep authoritative sheets outside `drafts/`; retain
superseded references there so history identifies them correctly. Existing male
`boards` and female `sheets`/`outputs` metadata formats are supported. Record the
actual output filename, shared wardrobe IDs, descriptive title and exact prompt
in the reference manifest to associate a sheet with the relevant model.

Keep canonical piece exports and their `.blend` sources together. Record stage,
retrospective and proof paths in `catalog-progress.json`; promote isolated studies
only after their own acceptance work. Give female fitted variants separate paths
and actual per-base proof. A file being viewable does not establish acceptance.
Use the source links to reach builders/proof rather than copying model artifacts
into the frontend. The gallery is an inspection tool; it does not edit metadata.

New female exports currently appear as standalone candidate cards. The logical
`female-*` milestones stay pending until a fitted export and its per-base proof
are explicitly registered in the inventory adapter. Extend that registration
alongside the first female foundation; filenames alone must not imply fit or
acceptance. The relevant normalization is in `tools/avatar/catalogLibraryServer.ts`.

See [gallery behavior and verification](avatar-catalog-preview.md) for routes,
refresh recovery and supported controls. After changing gallery tooling run the
focused browser verifier as well as the affected repository verification profile.

## Repeatable asset work

Choose one reference/category and representative outfit. Reuse category geometry
helpers for consistent construction; fit the new shell to the fixed scaffold.
Keep style edits separate from rig/body changes. Use the per-piece loop in
`tools/blender/catalog/README.md`, including openings, bilateral correctives,
attachments, full-cycle body/layer fit, export/material parity and actual runtime
rendering. Write a retrospective after each piece and apply the demonstrated fix.

Prefer these repo commands; `package.json` and each script's `--help` are the
command reference:

```bash
npm run avatar:blender -- --version
npm run avatar:blender -- tools/blender/inspect_avatar_glb.py --help
python3 tools/avatar/verify_catalog_piece.py --help
npm run avatar:catalog:inspect
npm run avatar:catalog:capture
```

Capture runs use a fresh timestamped review directory;
`CATALOG_STYLE_REVIEW_OUTPUT` can select a deliberate output path. Existing dated
review evidence is preserved by default.

`BLENDER_BIN` selects an executable path (spaces are supported) or a command on
PATH. An invalid explicit override fails rather than silently selecting another
version. The shared runner uses `--python-exit-code 1`: Blender otherwise can
print a Python exception and still exit successfully. Verification runs preserve
stage logs and current source hashes; historical reports are not refreshed by
changing a status label.

Keep Blender jobs sequential. For live MCP work, use one client as scene owner,
save a revision script and source before handing off, and run the same CLI gates.
Keep failed studies/reports. Dependency links, Python caches and Blender `.blend1`
backups are ignored; canonical `.blend` files and deliberate revisions remain visible.

## Selfie personalization: 2D texture on a reusable head

The product contract is a selfie-derived stylized **2D face texture**, applied to
a reusable 3D head. H01-H06 remain fictional style/hair references; they are not
instructions to generate a personalized 3D mesh for every user. The previous
face-first study remains useful visual evidence. Its proposed personalized head
and expression-first sequence is superseded by this clarification.

Proposed data flow:

1. A parent chooses a selfie behind the parent gate. A server/serverless endpoint
   transforms it into a neutral, frontal palette-A face with even lighting and
   recognizable identity. Keep provider credentials server-side.
2. Align eyes/nose/mouth to one canonical face template, remove the background and
   return a masked PNG plus skin-tone metadata. Validate format/dimensions and
   let the parent preview, regenerate, accept or reset the result.
3. Apply that image to a UV-mapped facial region on the rounded reusable head.
   Blend the face boundary into the head's skin tone. Keep side/back geometry and
   compatible hair as reusable assets; hair variants can be chosen separately.
4. Persist only the accepted generated asset and metadata locally by default.
   Raw selfies are transient by default; backend/provider retention must be
   configured and disclosed before launch. Local reset deletes the generated asset.
   A provider call sends the image outside the device; this feature needs a thin
   backend even though the rest of the app is local-first.

The generic head supplies actual volume, shading and the neck attachment. The
texture supplies identity through features, brows, coloring and beard marks.
A front selfie does not recover the person's exact side profile or skull shape.
Preserve likeness within that deliberate stylization and review front/three-quarter/
side angles rather than promising an exact 3D scan.

Current H01 combines modeled eyes, nose, lips, beard and hair in rigid Head-weighted
geometry. Its head GLBs have no TEXCOORD_0. Simply pasting a face image would leave
duplicate features. Author a **separate texture-ready head study** with one named
`face_surface` material, a stable UV template/mask, neutral skin material and
compatible simplified feature geometry. Remove conflicting baked/vertex color
tints and modeled beard details from that version. Export UVs and base-color
textures explicitly; the garment exporter currently uses `export_texcoords=False`.

Begin with a local sample texture, then one consenting real-selfie proof when
provided. Verify recognizable identity, no duplicated eyes/mouth, seam blending,
orientation/color and neck/hair/clothing clearance in the real viewer. Prove UV
and image preservation through GLB reimport. A small face decal at `face_anchor`
is an optional placement experiment; the intended finish is a fitted UV surface.
Only after the neutral texture works, test consistent blink/smile texture variants
or generic facial morphs. No selfie upload/generation endpoint exists yet.

Next work: prove this texture-ready head; settle its head/hair envelope; author
A02 and complete O05; repair B03/B04/F02 and refresh affected outfit proofs; then
expand remaining assets and finish style/budget/runtime acceptance. A fixture-led
head proof prevents further catalog headwear being fitted to an unsuitable face.

## Tooling assessment (checked 2026-10-04)

Blender is now **5.2.2 LTS** at `/Applications/Blender.app`. The previous 5.1.1
app is retained at `/Applications/Blender 5.1.1.app`. The shared CLI selects the
standard app; use `BLENDER_BIN` for explicit fallback. Native settings migration
preserved the existing Blender Lab MCP extension, confirmed configured and loaded
on a fresh normal startup. See the [upgrade audit](audits/2026-10-04-blender-lts-upgrade.md)
for checksum/signature, migration and the passing 16-pose export smoke. The UV head
profile still needs separate proof. [Official LTS support](https://www.blender.org/download/lts/).

A later process audit found Claude Desktop's Blender MCP extension running; the
earlier direct-config inspection missed that extension-based connection. This
Codex session still exposes no callable Blender MCP tools. Addon loading is
confirmed, but no end-to-end Claude client call was made here. Preserve existing
client configuration rather than adding a duplicate server.

For a new third-party MCP connection, current upstream is **mcp-for-blender**,
formerly blender-mcp, with Claude and Codex support. That is an optional alternative
to the installed extension, not an update that was installed here.
[Upstream setup](https://github.com/ahujasid/mcp-for-blender).

For a deliberate installation session, upstream currently documents:

```bash
claude mcp add blender uvx mcp-for-blender
codex mcp add blender -- uvx mcp-for-blender
```

These are setup references, not commands run by this handoff. Pin a tested package
version in client args once selected, match its addon and record both versions.
GUI clients may need an absolute path to `uvx`. Only one MCP client should own the
live Blender scene; cross-agent reproducibility still comes from saved code and
CLI proof. Paid generation integrations need their own authorization; connecting
MCP does not authorize spending credits.

Existing glTF-Transform, Khronos validation, Playwright and native Blender checks
already cover the key verification needs. Highest-value additions are a canonical
face UV fixture and a small reusable Blender Asset Library of validated category
parts/materials. A new generator service is lower priority than consistent
references, category construction and fit checks. The subsequent user-authorized Blender update is recorded in the upgrade audit;
MCP client configuration was preserved.

## Wrap-up verification

Fresh checks on 2026-10-04: lint passed with zero errors and the known
ContentContext warning; 96 unit tests passed; all pure verifiers passed after
rerunning outside the sandbox because tsx IPC was denied there. Both skill
entry points passed the skill-creator validator. Focused CLI tests cover literal
paths/arguments, version selection and failure propagation; real Blender also
returned exit 1 for an intentional Python exception.

F03 opening regression at its 0.185m boundary accepted the safe source and
rejected the unsafe fixture, with the master SHA unchanged. Desktop/phone
catalog inspection and the existing modular workbench passed through the new
npm command, including Walk/Run, pause/scrub, camera/zoom/reset and skeleton.
Reports are under `artifacts/verification/avatar-catalog/wrap-up/` and
`artifacts/verification/avatar-catalog/inspection-page/`. The fresh timestamped
capture was smoke-checked separately. The subsequent fresh `verify:edit -- --force` selected and passed integration
before the requested commit: lint, 96 unit tests, pure verifiers, audio inventory,
integration browser checks, production build and bundle boundaries. Report:
`artifacts/verification/2026-10-04T15-34-07-813Z-integration.json`. No release
profile was run. These checks do not accept unfinished models or implement
selfie generation; female references are a modeling input.
