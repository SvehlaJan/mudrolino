"""Inspect how a garment GLB fits against the base avatar skeleton.

Mirrors the Three.js runtime attachment logic exactly:
  - X >= 0  →  LeftFoot  (character's anatomical left)
  - X <  0  →  RightFoot (character's anatomical right)

For each garment root the script reports:
  - Which bone it attaches to
  - XYZ offset between garment origin and bone head (Three.js Y-up space)
  - Ankle position as a % of shoe height from sole (ideal 50-70 %)
  - STATUS: OK if |x_offset| < 5 cm, WARN otherwise

When --animation is supplied, it also renders a QA grid:
  front + side view at rest pose and two animation mid-frames.

Usage (Blender CLI):
  '/Applications/Blender.app/Contents/MacOS/Blender' \\
    --background --factory-startup --enable-autoexec \\
    --python tools/blender/inspect_slot_fit.py \\
    -- \\
    --base   public/avatar/modular/male-base-plain.glb \\
    --garment public/avatar/garments/shoes_blue_sneakers_v1.glb \\
    --animation public/avatar/modular/male-base-plain-walking.glb \\
    --output-dir /tmp/slot-fit-debug \\
    --frames 1 13 25

Usage (Blender MCP – paste body of main() into execute_blender_code):
  Set BASE_PATH / GARMENT_PATH / ANIMATION_PATH / OUTPUT_DIR at the top,
  then paste the rest.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--base", type=Path, required=True)
    p.add_argument("--garment", type=Path, required=True)
    p.add_argument("--animation", type=Path)
    p.add_argument("--output-dir", type=Path, default=Path("/tmp/slot-fit-debug"))
    p.add_argument("--frames", nargs="+", type=int, default=[1, 13, 25])
    p.add_argument("--width", type=int, default=800)
    p.add_argument("--height", type=int, default=600)
    return p.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.ops.outliner.orphans_purge(do_recursive=True)


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.context.scene.objects if o not in before]


def find_armature() -> bpy.types.Object | None:
    return next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)


def bl_to_threejs(v) -> tuple[float, float, float]:
    """Blender Z-up → Three.js Y-up coordinate conversion."""
    return (v[0], v[2], -v[1])


# ---------------------------------------------------------------------------
# Attach logic – mirrors the fixed Three.js runtime
# ---------------------------------------------------------------------------

def attach_garments_to_bones(
    armature: bpy.types.Object,
    garment_roots: list[bpy.types.Object],
) -> list[dict]:
    """Attach each garment root to the foot bone on the same side of X=0.

    Returns a list of diagnostic records, one per garment root.
    Matches the fixed AvatarModel.tsx attachShoeSceneToFootBones:
      positive X → LeftFoot, negative X → RightFoot.
    """
    bpy.context.view_layer.update()
    diagnostics = []

    for root in garment_roots:
        pos_bl = root.matrix_world.translation
        pos_ts = bl_to_threejs(pos_bl)

        bone_name = "LeftFoot" if pos_ts[0] >= 0 else "RightFoot"

        if bone_name not in armature.data.bones:
            print(f"  WARN: {bone_name} not found in armature, skipping {root.name}")
            continue

        pb = armature.pose.bones[bone_name]
        bone_world_bl = armature.matrix_world @ pb.head
        bone_ts = bl_to_threejs(bone_world_bl)

        offset_x = pos_ts[0] - bone_ts[0]
        offset_y = pos_ts[1] - bone_ts[1]
        offset_z = pos_ts[2] - bone_ts[2]

        # Shoe height from mesh child bounding box
        mesh_child = next((c for c in root.children if c.type == "MESH"), None)
        shoe_height = None
        ankle_pct = None
        if mesh_child:
            corners = [mesh_child.matrix_world @ Vector(c) for c in mesh_child.bound_box]
            ys = [bl_to_threejs(c)[1] for c in corners]
            shoe_height = max(ys) - min(ys)
            if shoe_height > 0:
                ankle_pct = round(-offset_y / shoe_height * 100, 1)

        status = "OK" if abs(offset_x) < 0.05 else "WARN:large_x_offset"

        diagnostics.append({
            "garment_root": root.name,
            "assigned_bone": bone_name,
            "garment_pos_threejs": [round(v, 4) for v in pos_ts],
            "bone_pos_threejs": [round(v, 4) for v in bone_ts],
            "offset_x_m": round(offset_x, 4),
            "offset_y_m_garment_below_bone": round(offset_y, 4),
            "offset_z_m": round(offset_z, 4),
            "garment_height_m": round(shoe_height, 4) if shoe_height else None,
            "ankle_pct_from_sole": ankle_pct,
            "status": status,
        })

        # Perform the actual attachment (preserves world position)
        world_before = root.matrix_world.copy()
        root.parent = armature
        root.parent_type = "BONE"
        root.parent_bone = bone_name
        bpy.context.view_layer.update()
        root.matrix_world = world_before

        print(f"  {root.name} → {bone_name}  x_offset={offset_x:+.4f}m  ankle={ankle_pct}%  {status}")

    return diagnostics


# ---------------------------------------------------------------------------
# Animation
# ---------------------------------------------------------------------------

def transfer_animation(anim_path: Path, armature: bpy.types.Object) -> None:
    before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(anim_path))

    for obj in list(bpy.context.scene.objects):
        if obj.type == "ARMATURE" and obj is not armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    new_actions = [a for a in bpy.data.actions if a not in before]
    if not new_actions:
        print("  WARN: no new action in animation GLB")
        return

    action = new_actions[0]
    print(f"  Action: {action.name}  frames {action.frame_range[0]:.0f}–{action.frame_range[1]:.0f}")
    armature.animation_data_create()
    armature.animation_data.action = action
    # Blender 5.x layered-action system: bind the slot so the action evaluates.
    if hasattr(armature.animation_data, "action_slot") and len(action.slots) > 0:
        armature.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_start = int(action.frame_range[0])
    bpy.context.scene.frame_end = int(action.frame_range[1])


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

VIEW_CAMERAS = {
    "front": ((0.0, -1.8, 0.95), (1.37, 0, 0)),
    "side":  ((1.8, 0.0, 0.95), (1.37, 0, 1.5708)),
}


def setup_render(width: int, height: int) -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -2, 3))
    bpy.context.object.data.energy = 350
    bpy.context.object.data.size = 4

    bpy.ops.object.light_add(type="POINT", location=(-2, -2, 2))
    bpy.context.object.data.energy = 80

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    if hasattr(bpy.context.scene, "eevee"):
        bpy.context.scene.eevee.taa_render_samples = 32
    bpy.context.scene.render.resolution_x = width
    bpy.context.scene.render.resolution_y = height
    bpy.context.scene.world.color = (0.88, 0.92, 1.0)
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"


def add_camera(name: str, location: tuple, rotation: tuple) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = 58
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = Vector(location)
    cam.rotation_euler = rotation
    return cam


def render_views(
    output_dir: Path,
    frames: list[int],
    width: int,
    height: int,
) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    setup_render(width, height)
    cameras = {view: add_camera(f"cam_{view}", loc, rot) for view, (loc, rot) in VIEW_CAMERAS.items()}
    rendered = []

    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for view, cam in cameras.items():
            bpy.context.scene.camera = cam
            out = output_dir / f"frame_{frame:03d}_{view}.png"
            bpy.context.scene.render.filepath = str(out)
            bpy.ops.render.render(write_still=True)
            rendered.append(str(out))
            print(f"  Rendered: {out}")

    return rendered


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()
    clear_scene()

    print(f"Loading base: {args.base}")
    import_glb(args.base)

    armature = find_armature()
    if armature is None:
        raise RuntimeError("No armature in base GLB")
    print(f"Armature: {armature.name}")

    print(f"Loading garment: {args.garment}")
    before = set(bpy.context.scene.objects)
    import_glb(args.garment)
    garment_roots = [
        o for o in bpy.context.scene.objects
        if o not in before and o.parent is None and o.type in {"EMPTY", "MESH"}
    ]
    print(f"Garment roots: {[r.name for r in garment_roots]}")

    bpy.context.view_layer.update()
    print("Attaching garment roots to bones (position-based):")
    diagnostics = attach_garments_to_bones(armature, garment_roots)

    if args.animation:
        print(f"Loading animation: {args.animation}")
        transfer_animation(args.animation, armature)

    rendered = render_views(args.output_dir, args.frames, args.width, args.height)

    report = {
        "base": str(args.base),
        "garment": str(args.garment),
        "animation": str(args.animation) if args.animation else None,
        "attachments": diagnostics,
        "rendered_frames": rendered,
    }

    report_path = args.output_dir / "fit_report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(f"\nFit report: {report_path}")

    warnings = [d for d in diagnostics if d["status"] != "OK"]
    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  {w['garment_root']}: {w['status']}")
    else:
        print("\nAll attachments: OK")


if __name__ == "__main__":
    main()
