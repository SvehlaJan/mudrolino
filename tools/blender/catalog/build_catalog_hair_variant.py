"""Build a hair variant (H03-H06) on a reusable selfie head study.

Opens the +30% head study of the style's base (catalog_headwear_geometry.HEADS),
removes the base hair (the H01 hair faces or the H02_hair object) and grows the
style's hair as a radial shell over the measured scalp (catalog_hair_plan.py): one
grid vertex per direction from the skull centre, offset from the first scalp hit,
faces kept where any corner lies above the hairline. The hair is bound rigidly to
Head. H06 is the bald head alone; its goatee belongs to the selfie face texture.
Body, rig, gaits, garments and the face UVs/image stay exact.

Usage: blender_cli.py build_catalog_hair_variant.py --style H03 --output-dir DIR --review-dir DIR
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset
from build_catalog_head import material
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_head_scale_study import masked_body, render_reviews
from build_catalog_female_foundation_study import export_uv
from catalog_headwear_geometry import HEADS, polygon_tree, direction
import catalog_hair_plan as plan

ELEVATION_MIN = -1.25


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def remove_base_hair(spec):
    """Delete the base hair; returns (head object, removed face count)."""
    head = bpy.data.objects[spec['skull'][0]]
    hair_name, keyword = spec['hair']
    if hair_name != head.name:
        hair = bpy.data.objects[hair_name]
        removed = len(hair.data.polygons)
        mesh = hair.data
        bpy.data.objects.remove(hair, do_unlink=True)
        bpy.data.meshes.remove(mesh)
        return head, removed
    slots = {i for i, m in enumerate(head.data.materials) if m and keyword in m.name.lower()}
    bm = bmesh.new()
    bm.from_mesh(head.data)
    doomed = [f for f in bm.faces if f.material_index in slots]
    bmesh.ops.delete(bm, geom=doomed, context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(head.data)
    bm.free()
    head.data.update()
    return head, len(doomed)


def lump_field(style, kd, d):
    """Largest lump value at unit direction d; waves stretch along a tilted, mirrored axis."""
    lumps = style['lumps']
    radius, stretch = lumps['radius'], lumps['stretch']
    best = 0.0
    for centre, index, _ in kd.find_range(d, 2 * math.sin(min(math.pi / 2, radius * stretch) / 2)):
        east = Vector((0, 0, 1)).cross(centre)
        east = east.normalized() if east.length > 1e-6 else Vector((1, 0, 0))
        north = centre.cross(east)
        local = d - centre
        tilt = math.copysign(lumps['tilt'], centre.x)
        along = local.dot(east) * math.cos(tilt) + local.dot(north) * math.sin(tilt)
        across = -local.dot(east) * math.sin(tilt) + local.dot(north) * math.cos(tilt)
        size = plan.lump_scale(index, lumps['jitter'])
        best = max(best, size * plan.lump(math.hypot(along / stretch, across), radius * size, lumps['profile']))
    return best


def grow_hair(style_id, scalp, centre, scale):
    """Radial hair shell: returns (vertices, faces, rows) with per-vertex above-line heights."""
    style = plan.style(style_id)
    columns, rows = style['grid']
    kd = KDTree(style['lumps']['count'])
    for i, c in enumerate(plan.lump_centres(style['lumps']['count'])):
        kd.insert(c, i)
    kd.balance()
    vertices, above = [], []
    for j in range(rows):
        elevation = ELEVATION_MIN + (math.pi / 2 - ELEVATION_MIN) * j / rows
        for i in range(columns):
            d = direction(2 * math.pi * i / columns, elevation)
            hit = scalp.ray_cast(centre, d, 1.0)[0]
            if hit is None:
                raise RuntimeError(f'Scalp ray missed at elevation {elevation:.3f}')
            radius = (hit - centre).length
            angle = plan.front_angle(d.x, d.y)
            line = (hit.z - centre.z) / scale - plan.hairline_height(style_id, angle)
            out = plan.offset(style_id, angle, elevation, line, lump_field(style, kd, Vector(d)))
            vertices.append(centre + d * (radius + out * scale))
            above.append(line)
    top = Vector((0, 0, 1))
    hit = scalp.ray_cast(centre, top, 1.0)[0]
    line = (hit.z - centre.z) / scale - plan.hairline_height(style_id, 0.0)
    vertices.append(centre + top * ((hit - centre).length + plan.offset(style_id, 0.0, math.pi / 2, line, lump_field(style, kd, top)) * scale))
    above.append(line)
    pole = len(vertices) - 1
    # Columns run east and rows north, so every face winds outward.
    faces = []
    for j in range(rows - 1):
        for i in range(columns):
            a, b = j * columns + i, j * columns + (i + 1) % columns
            faces.append((a, b, b + columns, a + columns))
    last = (rows - 1) * columns
    faces += [(last + i, last + (i + 1) % columns, pole) for i in range(columns)]
    kept = [f for f in faces if any(above[k] > 0 for k in f)]
    return vertices, kept


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--style', required=True, choices=sorted(plan.STYLES))
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--review-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    style = plan.style(args.style)
    spec = HEADS[style['base']]
    source = spec['study'] / spec['blend']
    landmarks = json.loads((spec['study'] / 'head-landmarks.json').read_text())
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.review_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig, motion = rig_signature(arm), motion_signature()
    unchanged = {o.name: geometry_signature(o) for o in bpy.data.objects
                 if o.type == 'MESH' and o.name not in spec['head_objects']}
    head, removed = remove_base_hair(spec)
    objects = [head]
    hair_report = None
    if style['hairline'] is not None:
        centre = Vector(landmarks['skull_centre'])
        vertices, faces = grow_hair(args.style, polygon_tree(head, spec['skull'][1]), centre, landmarks['scale'])
        mesh = bpy.data.meshes.new(f'{args.style}_hair')
        mesh.from_pydata([tuple(v) for v in vertices], [], faces)
        mesh.update()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(mesh)
        bm.free()
        hair = bpy.data.objects.new(f'{args.style}_hair', mesh)
        bpy.context.collection.objects.link(hair)
        mesh.materials.append(material(f'A {args.style} {style["label"]} hair', style['color'], .75))
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        group = hair.vertex_groups.new(name='Head')
        group.add(list(range(len(mesh.vertices))), 1.0, 'REPLACE')
        hair.modifiers.new('Shared head bone', 'ARMATURE').object = arm
        hair.parent = arm
        hair.matrix_world = Matrix.Identity(4)
        objects.append(hair)
        hair_report = {'object': hair.name, 'vertices': len(mesh.vertices), 'triangles': sum(len(p.vertices) - 2 for p in mesh.polygons)}
    assert rig_signature(arm) == rig and motion_signature() == motion, 'Rig or gaits changed'
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in unchanged.items()), 'Non-head geometry changed'

    blend = args.output_dir / f'{args.style}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    exports = {}
    export_uv(args.output_dir / f'{args.style}.glb', [arm, *objects])
    exports[f'{args.style}.glb'] = digest(args.output_dir / f'{args.style}.glb')
    body = bpy.data.objects[spec['body']]
    masked = masked_body(body, arm)
    garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
    export_uv(args.output_dir / 'foundation.glb', [arm, masked, *objects, *garments])
    bpy.data.objects.remove(masked, do_unlink=True)
    exports['foundation.glb'] = digest(args.output_dir / 'foundation.glb')
    # Exporting unparents and purges; reopen the saved blend so reviews see the study.
    names, head_name = [o.name for o in objects], head.name
    bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
    reset(bpy.data.objects['Armature_Catalog'])
    reviews = render_reviews(args.review_dir, [bpy.data.objects[n] for n in names])
    report = {
        'stage': 'Hair variant on the reusable selfie head; fit gates, headwear refits and art review pending.',
        'style': args.style, 'label': style['label'], 'base': style['base'],
        'source': str(source), 'source_sha256': digest(source), 'landmarks': landmarks,
        'builder_sha256': digest(__file__), 'plan_sha256': digest(Path(plan.__file__)),
        'head': head_name, 'removed_base_hair_faces': removed, 'hair': hair_report,
        'baseline': {'rig': rig, 'motion': motion, 'unchanged_geometry': unchanged},
        'blend': {str(blend): digest(blend)}, 'exports': exports, 'reviews': reviews,
    }
    (args.output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HAIR_VARIANT', json.dumps({k: report[k] for k in ('style', 'base', 'removed_base_hair_faces', 'hair')}))


if __name__ == '__main__':
    main()
