# Avatar catalog inspection page

User-authorized scope: update the existing `/avatar-preview` development page to
inspect current Blender catalog models. Continue inline; no commit or PR.

- Add a Vite serve-only catalog endpoint that inventories actual GLBs, exposes
  only explicitly inventoried assets, and labels current candidates/repairs/studies.
  Keep bulky Blender source and generated assets outside public production output.
- Make catalog inspection the development default. Preserve the old modular
  workbench at `?view=modular` and existing `?agent=1` verification behavior.
- List body, wearable, complete-outfit and current fitting-study entries. Show
  independent wearables on their matching covered body and bind skinned assets
  to the shared skeleton regardless of their clothing category.
- Reuse lazy AvatarPresenter/Scene/Model, with opt-in inspection camera and
  pause/normalized pose controls. Drive corrective targets for embedded outfit
  meshes as well as external garments. Keep local saved avatar state untouched.
- Test the server's inventory/path allowlist and preview asset resolution before
  implementation. Verify actual desktop/mobile canvases, selection changes,
  animation/pause/scrub, camera presets and unchanged modular workbench.
- Run lint/unit/pure and the required verify:edit profile; check production lazy
  chunk boundary and that development catalog assets/API are not shipped.
- Update ROADMAP and leave a running worktree dev server on an unused local port.
