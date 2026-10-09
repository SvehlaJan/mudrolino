"""Phone-budget LOD of an assembled outfit: decimate headwear, head/hair and, if needed, the body.

Head and hair are 37-51% of every outfit's triangles (measure_avatar_budget.mjs).
First, head/hair faces that no camera sees at rest are removed (inner layers, hair under
headwear), which moves no surface. Then headwear, then head and hair are decimated, each
down to a floor, until the outfit fits the triangle budget. With --body-floor < 1, an
outfit still over budget (bare legs in O03) bakes the body to its masked visible surface
and decimates that; garments and other accessories stay exact. Decimation keeps weights,
UVs and materials; slivers under MIN_WEIGHT are pruned. Shape keys (the
under-hat hair keys) cannot survive a modifier, so each key is rebuilt on the decimated
mesh by barycentric transfer from the original triangle under each new vertex. The
source outfit is unchanged: the LOD is saved as outfit-lod.blend / outfit-lod.glb with a
report of triangle counts and surface deviation. Re-run the outfit motion gate on it.

Usage: blender_cli.py build_catalog_lod.py --outfit-dir DIR [--blend outfit.blend] [--budget 95000 [--body-floor .15]
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from build_catalog_head_style_study import rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv

# Separate hair objects: the H02 bob and the H03-H05 variants on the reusable heads.
HAIR_PREFIXES = ('H02_hair', 'H03_hair', 'H04_hair', 'H05_hair')
HEAD_PREFIXES = ('H01_head', 'H02_head', *HAIR_PREFIXES)
HEADWEAR_PREFIXES = ('A01_', 'A02_')
MIN_RATIO = .15
# The glTF exporter drops weights <= 1e-4 that Blender still applies; collapse decimation
# interpolates such slivers, so prune them below this floor before renormalising.
MIN_WEIGHT = 1e-3


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def triangles(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    count = sum(len(p.vertices) - 2 for p in mesh.polygons)
    evaluated.to_mesh_clear()
    return count


def limit_influences(obj, count=4):
    """Keep each vertex's `count` largest bone weights above MIN_WEIGHT, renormalised."""
    for v in obj.data.vertices:
        # Copy first: element references go stale once a group is removed.
        groups = sorted(((g.group, g.weight) for g in v.groups), key=lambda g: -g[1])
        kept = [g for g in groups[:count] if g[1] >= MIN_WEIGHT] or groups[:1]
        for group, _ in groups[len(kept):]:
            obj.vertex_groups[group].remove([v.index])
        total = sum(w for _, w in kept)
        for group, w in kept:
            obj.vertex_groups[group].add([v.index], w / total, 'REPLACE')


def decimate(obj, ratio):
    """Replace obj's mesh with a decimated copy; rebuild shape keys by barycentric transfer.

    Collapses blend vertex weights, so influences are re-limited to four afterwards.
    """
    source = obj.data
    keys = [(k.name, [d.co.copy() for d in k.data], k.value) for k in source.shape_keys.key_blocks] if source.shape_keys else []
    base = source.copy()
    if base.shape_keys:
        holder = bpy.data.objects.new('lod_holder', base)
        bpy.context.collection.objects.link(holder)
        holder.shape_key_clear()
        bpy.data.objects.remove(holder, do_unlink=True)
    temp = bpy.data.objects.new('lod_temp', base)
    bpy.context.collection.objects.link(temp)
    modifier = temp.modifiers.new('LOD', 'DECIMATE')
    modifier.decimate_type, modifier.ratio = 'COLLAPSE', ratio
    bpy.ops.object.select_all(action='DESELECT')
    temp.select_set(True)
    bpy.context.view_layer.objects.active = temp
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    lod = temp.data
    bpy.data.objects.remove(temp, do_unlink=True)
    if keys:
        source.calc_loop_triangles()
        tris = [tuple(t.vertices) for t in source.loop_triangles]
        basis = [v.co.copy() for v in source.vertices]
        tree = BVHTree.FromPolygons(basis, tris, all_triangles=True)
        holder = bpy.data.objects.new('lod_keys', lod)
        bpy.context.collection.objects.link(holder)
        for name, coords, value in keys:
            key = holder.shape_key_add(name=name, from_mix=False)
            if name == keys[0][0]:
                continue  # Basis stays the decimated rest shape.
            for i, v in enumerate(lod.vertices):
                point, _, index, _ = tree.find_nearest(v.co)
                a, b, c = tris[index]
                key.data[i].co = v.co + (barycentric_transform(point, basis[a], basis[b], basis[c], coords[a], coords[b], coords[c]) - point)
            key.value = value
        bpy.data.objects.remove(holder, do_unlink=True)
    obj.data = lod
    limit_influences(obj)
    return deviation(basis_tree(source), lod, source)


def cull_invisible(obj, occluders, directions=16, heights=(.9, 1.2, 1.5, 1.9, 2.6), distance=3.0):
    """Delete faces of `obj` that no camera sees at rest (inner hair layers, hair under headwear).

    Cameras ring the avatar (`directions` x `heights`, `distance` m out). A face counts as
    visible when a ray from some camera to its centre reaches it first. Shape keys survive
    because bmesh keeps their layers. Returns the number of faces removed.
    """
    import math
    names, points_all, faces_all, owner = [], [], [], []
    for other in occluders:
        points, faces = world_mesh(other)
        base = len(points_all)
        points_all += points
        for k, face in enumerate(faces):
            faces_all.append(tuple(base + i for i in face))
            owner.append((other.name, k))
    tree = BVHTree.FromPolygons(points_all, faces_all)
    centre = Vector((0, 0, 1.4))
    cameras = [Vector((distance * math.cos(2 * math.pi * k / directions), distance * math.sin(2 * math.pi * k / directions), h))
               for k in range(directions) for h in heights]
    points, faces = world_mesh(obj)
    visible = set()
    for k, face in enumerate(faces):
        c = sum((points[i] for i in face), Vector()) / len(face)
        for camera in cameras:
            ray = c - camera
            hit = tree.ray_cast(camera, ray.normalized(), ray.length + 1e-3)
            if hit[2] is not None and owner[hit[2]] == (obj.name, k):
                visible.add(k)
                break
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    doomed = [f for f in bm.faces if f.index not in visible]
    bmesh.ops.delete(bm, geom=doomed, context='FACES_ONLY')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return len(doomed)


def bake_visible_body(body):
    """Replace the body's mesh with its masked visible surface and drop the mask modifiers.

    Coverage masks are vertex weights; decimating the full base mesh blurs them at the mask
    edges so hidden skin reappears inside garments. Baking first leaves only visible skin,
    whose open edges sit under garment hems (collapse decimation weights boundaries heavily).
    """
    for modifier in body.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.show_viewport = False
    bpy.context.view_layer.update()
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    baked = bpy.data.meshes.new_from_object(evaluated)
    # Loose authoring vertices are omitted by the GLB and would skew the deviation measure.
    bm = bmesh.new()
    bm.from_mesh(baked)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(baked)
    bm.free()
    for modifier in list(body.modifiers):
        if modifier.type == 'MASK':
            body.modifiers.remove(modifier)
        elif modifier.type == 'ARMATURE':
            modifier.show_viewport = True
    body.data = baked
    bpy.context.view_layer.update()


def basis_tree(mesh):
    mesh.calc_loop_triangles()
    return BVHTree.FromPolygons([v.co for v in mesh.vertices], [tuple(t.vertices) for t in mesh.loop_triangles], all_triangles=True)


def deviation(original_tree, lod, original):
    """Largest distance from LOD vertices to the original surface and back (rest, metres)."""
    def rendered(mesh):
        used = {i for p in mesh.polygons for i in p.vertices}
        return [v.co for v in mesh.vertices if v.index in used]
    forward = max(original_tree.find_nearest(co)[3] for co in rendered(lod))
    lod_tree = basis_tree(lod)
    backward = max(lod_tree.find_nearest(co)[3] for co in rendered(original))
    return max(forward, backward)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outfit-dir', type=Path, required=True)
    parser.add_argument('--budget', type=int, default=95_000, help='Target triangles for the whole outfit')
    parser.add_argument('--blend', default='outfit.blend', help='Outfit blend inside --outfit-dir')
    parser.add_argument('--body-floor', type=float, default=1.0, help='Allow baking and decimating the visible body down to this ratio (1 = never)')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source = args.outfit_dir / args.blend
    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig, motion = rig_signature(arm), motion_signature()
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    counts = {o.name: triangles(o) for o in meshes}
    total = sum(counts.values())
    headwear = [o for o in meshes if o.name.startswith(HEADWEAR_PREFIXES)]
    # Reduction order and floors: headwear, then heads/hair, then the visible body. Hair that
    # sits under headwear hugs it within millimetres, so it keeps at least half its triangles.
    groups = [(headwear, .6),
              ([o for o in meshes if o.name.startswith(HEAD_PREFIXES) and counts[o.name] > 8000 and not (headwear and o.name.startswith(HAIR_PREFIXES))], MIN_RATIO),
              # Hair under headwear is only culled, never decimated: the headwear hugs it within
              # millimetres and any surface change pokes through (2026-10-09 trials at 50%).
              ]
    # The body is never decimated: its coverage masks are vertex weights, and decimation blurs
    # them at the mask edges, so hidden skin reappears inside garments (tried 2026-10-09).
    rows = {}
    # Never-visible hair goes first: removing it moves no surface. world_mesh faces follow the
    # mesh's own polygon order here (hair has no topology-changing modifiers).
    occluders = [o for o in meshes if not o.name.startswith('body_underlayer_')]
    for obj in [o for o in meshes if o.name.startswith(('H01_head', *HAIR_PREFIXES))]:
        culled = cull_invisible(obj, occluders)
        rows[obj.name] = {'before': counts[obj.name], 'culled_faces': culled}
        counts[obj.name] = triangles(obj)
    excess = sum(counts.values()) - args.budget
    for members, floor in groups:
        if excess <= 0 or not members:
            continue
        size = sum(counts[o.name] for o in members)
        take = min(excess, size * (1 - floor))
        ratio = 1 - take / size
        for obj in members:
            rows.setdefault(obj.name, {'before': counts[obj.name]}).update({'ratio': ratio, 'max_deviation_m': decimate(obj, ratio)})
        for obj in members:
            rows[obj.name]['after'] = triangles(obj)
        excess -= sum(counts[o.name] - rows[o.name]['after'] for o in members)
    # Still over: bake the body to its visible surface, then decimate it (O03 shows bare legs).
    body = next(o for o in meshes if o.name.startswith('body_underlayer_'))
    if excess > 0 and args.body_floor < 1:
        before = triangles(body)
        bake_visible_body(body)
        ratio = max(args.body_floor, 1 - excess / before)
        rows[body.name] = {'before': before, 'baked': True, 'ratio': ratio, 'max_deviation_m': decimate(body, ratio), 'after': triangles(body)}
        excess -= before - rows[body.name]['after']
    for name, row in rows.items():
        row.setdefault('after', triangles(bpy.data.objects[name]))
    assert rig_signature(arm) == rig and motion_signature() == motion, 'Rig or gaits changed'
    after = {o.name: triangles(o) for o in meshes}
    blend_out = args.outfit_dir / 'outfit-lod.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
    masked.parent = arm
    export_uv(args.outfit_dir / 'outfit-lod.glb', [arm, masked, *[o for o in meshes if o is not body]])
    bpy.data.objects.remove(masked, do_unlink=True)
    report = {'source': str(source), 'source_sha256': digest(source), 'builder_sha256': digest(__file__), 'budget': args.budget, 'body_floor': args.body_floor,
              'triangles_before': total, 'triangles_after': sum(after.values()), 'decimated': rows,
              'blend': {str(blend_out): digest(blend_out)}, 'glb_sha256': digest(args.outfit_dir / 'outfit-lod.glb')}
    (args.outfit_dir / 'lod-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('LOD', json.dumps({k: report[k] for k in ('triangles_before', 'triangles_after', 'decimated')}))


if __name__ == '__main__':
    main()
