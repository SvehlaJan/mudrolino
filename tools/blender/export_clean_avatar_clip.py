"""Export a base avatar GLB with a cleaned rotation-only action.

This is intentionally conservative: it keeps the base character mesh and
armature, uses the reference GLB only as an animation source, copies matching
bone quaternion curves, and drops baked per-bone location/scale curves.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
import sys

import bpy


BONE_PATH_RE = re.compile(r'pose\.bones\["(?P<bone>[^"]+)"\]\.(?P<property>.+)')


def iter_action_fcurves(action: bpy.types.Action):
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return

    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                channelbag = strip.channelbag(slot)
                if channelbag is None:
                    continue
                yield from channelbag.fcurves


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def find_armature(objects: list[bpy.types.Object], label: str) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected exactly one armature in {label}, found {len(armatures)}")
    return armatures[0]


def find_best_action(armature: bpy.types.Object) -> bpy.types.Action:
    if armature.animation_data and armature.animation_data.action:
        return armature.animation_data.action
    if len(bpy.data.actions) == 1:
        return bpy.data.actions[0]

    actions = sorted(bpy.data.actions, key=lambda action: len(list(iter_action_fcurves(action))), reverse=True)
    if not actions:
        raise RuntimeError("Reference GLB has no animation actions")
    return actions[0]


def copy_rotation_action(
    source_action: bpy.types.Action,
    target_armature: bpy.types.Object,
    action_name: str,
    copy_hips_location: bool = False,
) -> bpy.types.Action:
    target_bones = {bone.name for bone in target_armature.data.bones}
    clean_action = bpy.data.actions.new(action_name)
    clean_action.frame_start = source_action.frame_range[0]
    clean_action.frame_end = source_action.frame_range[1]
    if target_armature.animation_data is None:
        target_armature.animation_data_create()
    target_armature.animation_data.action = clean_action

    copied = 0
    copied_hips_location = 0
    skipped = 0
    hips_location_first_values: dict[int, float] = {}
    target_hips_location = target_armature.pose.bones["Hips"].location.copy()

    for source_curve in iter_action_fcurves(source_action):
        match = BONE_PATH_RE.fullmatch(source_curve.data_path)
        if not match:
            skipped += 1
            continue

        bone_name = match.group("bone")
        property_name = match.group("property")

        if property_name == "location" and bone_name == "Hips" and copy_hips_location:
            target_curve = clean_action.fcurve_ensure_for_datablock(
                target_armature,
                source_curve.data_path,
                index=source_curve.array_index,
                group_name=source_curve.group.name if source_curve.group else "",
            )
            first_value = source_curve.keyframe_points[0].co.y
            hips_location_first_values[source_curve.array_index] = first_value
            target_curve.keyframe_points.add(len(source_curve.keyframe_points) - 1)
            for target_point, source_point in zip(target_curve.keyframe_points, source_curve.keyframe_points):
                target_point.co.x = source_point.co.x
                target_point.co.y = (
                    source_point.co.y
                    - first_value
                    + target_hips_location[source_curve.array_index]
                )
                target_point.interpolation = source_point.interpolation
                target_point.easing = source_point.easing
                target_point.handle_left_type = source_point.handle_left_type
                target_point.handle_right_type = source_point.handle_right_type
                target_point.handle_left = source_point.handle_left
                target_point.handle_right = source_point.handle_right
            copied_hips_location += 1
            continue

        if property_name != "rotation_quaternion":
            skipped += 1
            continue

        if bone_name not in target_bones:
            skipped += 1
            continue

        target_curve = clean_action.fcurve_ensure_for_datablock(
            target_armature,
            source_curve.data_path,
            index=source_curve.array_index,
            group_name=source_curve.group.name if source_curve.group else "",
        )
        target_curve.keyframe_points.add(len(source_curve.keyframe_points) - 1)
        for target_point, source_point in zip(target_curve.keyframe_points, source_curve.keyframe_points):
            target_point.co = source_point.co
            target_point.interpolation = source_point.interpolation
            target_point.easing = source_point.easing
            target_point.handle_left_type = source_point.handle_left_type
            target_point.handle_right_type = source_point.handle_right_type
            target_point.handle_left = source_point.handle_left
            target_point.handle_right = source_point.handle_right
        copied += 1

    if copied == 0:
        raise RuntimeError(f"No matching quaternion bone curves were copied from {source_action.name}")

    print(
        f"Created action {clean_action.name}: copied {copied} quaternion curves, "
        f"copied {copied_hips_location} hips location curves, "
        f"skipped {skipped} non-matching or unsupported curves"
    )
    return clean_action


def keep_only_base_objects(base_objects: list[bpy.types.Object]) -> None:
    keep = set(base_objects)
    for obj in list(bpy.context.scene.objects):
        obj.select_set(obj not in keep)
    bpy.ops.object.delete()


def keep_only_action(action_to_keep: bpy.types.Action) -> None:
    for action in list(bpy.data.actions):
        if action != action_to_keep:
            bpy.data.actions.remove(action)


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIVE_ACTIONS",
        export_force_sampling=False,
        export_nla_strips=False,
        export_bake_animation=False,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--action-name", default="success_cheer")
    parser.add_argument("--copy-hips-location", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)

    clear_scene()
    base_objects = import_glb(args.base)
    base_armature = find_armature(base_objects, "base GLB")
    reference_objects = import_glb(args.reference)
    reference_armature = find_armature(reference_objects, "reference GLB")
    reference_action = find_best_action(reference_armature)

    clean_action = copy_rotation_action(
        reference_action,
        base_armature,
        args.action_name,
        copy_hips_location=args.copy_hips_location,
    )
    keep_only_base_objects(base_objects)
    keep_only_action(clean_action)
    export_glb(args.output)
    print(f"Exported cleaned avatar clip: {args.output}")


if __name__ == "__main__":
    main()
