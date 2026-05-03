"""Export a shoe preview avatar whose shoes follow the foot bones.

This builds on the static shoe-pair asset. Each shoe mesh is bound rigidly to
the corresponding foot bone and the hidden lower-foot skin is removed from the
combined preview body so walking/running clips do not show foot poke-through.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


BODY_NAME = "body_underlayer_male"
ARMATURE_NAME = "Armature"
LEFT_FOOT_BONE = "LeftFoot"
RIGHT_FOOT_BONE = "RightFoot"
HIDDEN_FOOT_GROUPS = {LEFT_FOOT_BONE, "LeftToeBase", RIGHT_FOOT_BONE, "RightToeBase"}


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--shoes", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--foot-cut-z", type=float, default=0.08)
    parser.add_argument("--shoe-lift-z", type=float, default=0.035)
    parser.add_argument("--shoe-positive-x-inset", type=float, default=0.018)
    parser.add_argument("--shoe-negative-x-inset", type=float, default=0.036)
    return parser.parse_args(argv)


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    purge_orphans()


def purge_orphans() -> None:
    bpy.ops.outliner.orphans_purge(do_recursive=True)


def import_glb(path: str) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def export_glb(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    purge_orphans()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
    )


def find_required_object(name: str) -> bpy.types.Object:
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Missing required object: {name}")
    return obj


def remove_export_artifacts() -> None:
    for name in ("Icosphere",):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)


def crop_hidden_feet(body: bpy.types.Object, foot_cut_z: float) -> None:
    mesh = body.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()

    body_world = body.matrix_world.copy()
    deform_layer = bm.verts.layers.deform.active
    hidden_group_indexes = {
        group.index
        for group in body.vertex_groups
        if group.name in HIDDEN_FOOT_GROUPS
    }

    if deform_layer is None or not hidden_group_indexes:
        raise RuntimeError("Body mesh has no usable foot/toe vertex groups to crop")

    verts_to_delete = [
        vert
        for vert in bm.verts
        if (body_world @ vert.co).z <= foot_cut_z
        and any(group_index in vert[deform_layer] for group_index in hidden_group_indexes)
    ]

    bmesh.ops.delete(bm, geom=verts_to_delete, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    print(f"Cropped {len(verts_to_delete)} lower-foot body vertices at z <= {foot_cut_z:.3f}")


def shoe_meshes() -> list[bpy.types.Object]:
    return [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.name.startswith("shoes_blue_sneaker_")
    ]


def object_bounds_center(obj: bpy.types.Object) -> Vector:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mins = Vector((
        min(corner.x for corner in corners),
        min(corner.y for corner in corners),
        min(corner.z for corner in corners),
    ))
    maxs = Vector((
        max(corner.x for corner in corners),
        max(corner.y for corner in corners),
        max(corner.z for corner in corners),
    ))
    return (mins + maxs) * 0.5


def bake_world_transform(obj: bpy.types.Object) -> None:
    obj.data.transform(obj.matrix_world)
    obj.matrix_world.identity()


def bind_shoe_to_bone(
    obj: bpy.types.Object,
    armature: bpy.types.Object,
    bone_name: str,
    shoe_lift_z: float,
    shoe_positive_x_inset: float,
    shoe_negative_x_inset: float,
) -> None:
    center = object_bounds_center(obj)
    obj.location.x += -shoe_positive_x_inset if center.x > 0 else shoe_negative_x_inset
    obj.location.z += shoe_lift_z
    bpy.context.view_layer.update()
    bake_world_transform(obj)

    obj.vertex_groups.clear()
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")

    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature

    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.matrix_world = world


def bind_shoes(
    armature: bpy.types.Object,
    shoe_lift_z: float,
    shoe_positive_x_inset: float,
    shoe_negative_x_inset: float,
) -> None:
    meshes = shoe_meshes()
    if not meshes:
        raise RuntimeError("No shoe meshes found to bind")

    for obj in meshes:
        center = object_bounds_center(obj)
        bone_name = LEFT_FOOT_BONE if center.x > 0 else RIGHT_FOOT_BONE
        applied_inset = shoe_positive_x_inset if center.x > 0 else shoe_negative_x_inset
        print(
            f"Binding {obj.name} at x={center.x:.5f} to {bone_name}; "
            f"lift z={shoe_lift_z:.3f}; inset x={applied_inset:.3f}"
        )
        bind_shoe_to_bone(
            obj,
            armature,
            bone_name,
            shoe_lift_z,
            shoe_positive_x_inset,
            shoe_negative_x_inset,
        )

    for obj in list(bpy.context.scene.objects):
        if obj.type == "EMPTY" and obj.name.startswith("shoes_blue_sneaker"):
            bpy.data.objects.remove(obj, do_unlink=True)

    print(f"Bound {len(meshes)} shoe meshes to foot bones")


def main() -> None:
    args = parse_args()
    clear_scene()
    import_glb(args.base)
    import_glb(args.shoes)
    remove_export_artifacts()

    armature = find_required_object(ARMATURE_NAME)
    body = find_required_object(BODY_NAME)
    crop_hidden_feet(body, args.foot_cut_z)
    bind_shoes(
        armature,
        args.shoe_lift_z,
        args.shoe_positive_x_inset,
        args.shoe_negative_x_inset,
    )
    export_glb(args.output)
    print(f"Exported rigged shoe preview: {args.output}")


if __name__ == "__main__":
    main()
