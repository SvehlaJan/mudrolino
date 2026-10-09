"""Verify a hair-variant study (build_catalog_hair_variant.py) and its wardrobe fit.

Gates: source/builder/plan/blend/export hashes; unchanged rig, gaits, body and
garments; the head equals the base head minus its base hair; rigid single-Head
binding; head plus hair no heavier than the head it replaces; no painted feature
hidden by hair from five front cameras; no skin showing through the hair inside the
hairline; no hair contact with ears or nose; hair clear of the body and garments over
quarter-frame walk/run plus six gestures, in the study and in every --outfits blend
(headwear excluded: caps and beanies need their own refit per hair); face UVs/image
and the rest shape preserved through the head GLB. Glasses contact is reported.

Usage: blender_cli.py verify_catalog_hair_variant.py --study-dir DIR [--outfits a.blend,b.blend]
  [--glasses A03.blend:A03_glasses,...]
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh, bvh
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from verify_catalog_head_scale_study import GESTURES, gait_frames, pose_gesture
from verify_catalog_female_foundation_study import uv_corner_rows, uv_corner_identity, read_glb, roundtrip_error
from catalog_headwear_geometry import HEADS, direction
import catalog_hair_plan as plan

HEADWEAR = ('A01_', 'A02_')
CAMERAS = [(0, 0), (35, 0), (-35, 0), (0, 20), (0, -15)]  # (yaw, pitch) degrees about the face


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def part_tree(obj, keep):
    """BVH of obj's polygons whose material name passes keep(name)."""
    points, faces = world_mesh(obj)
    chosen = [f for f, p in zip(faces, obj.data.polygons) if keep(obj.data.materials[p.material_index].name.lower())]
    return BVHTree.FromPolygons(points, chosen) if chosen else None


def first_hit(trees, origin, ray, distance):
    best = None
    for name, tree in trees.items():
        hit = tree.ray_cast(origin, ray, distance)
        if hit[0] is not None and (best is None or hit[3] < best[1]):
            best = (name, hit[3], hit[0])
    return best


def hidden_features(head, hair, points):
    """Painted features whose first hit from a front camera is hair, not the head."""
    head_tree, hair_tree = bvh(head)[0], bvh(hair)[0]
    hidden = []
    for x, z in points:
        surface = head_tree.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0)[0]
        if surface is None:
            hidden.append({'feature': [x, z], 'camera': 'none', 'reason': 'not on the head'})
            continue
        for yaw, pitch in CAMERAS:
            y, p = math.radians(yaw), math.radians(pitch)
            camera = surface + Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p))) * 2.0
            ray = (surface - camera)
            hit = first_hit({'head': head_tree, 'hair': hair_tree}, camera, ray.normalized(), ray.length + 1e-3)
            if hit and hit[0] == 'hair':
                hidden.append({'feature': [round(x, 4), round(z, 4)], 'camera': [yaw, pitch]})
    return hidden


def skin_through_hair(style_id, head, hair, centre, scale, margin):
    """Directions well inside the hairline whose first hit from outside is skin."""
    head_tree, hair_tree = bvh(head)[0], bvh(hair)[0]
    count = total = 0
    for i in range(180):
        for j in range(70):
            elevation = -1.2 + (math.pi / 2 + 1.2) * j / 70
            d = direction(2 * math.pi * i / 180, elevation)
            skin = head_tree.ray_cast(centre + d, -d, 1.0)
            if skin[0] is None:
                continue
            line = (skin[0].z - centre.z) / scale - plan.hairline_height(style_id, plan.front_angle(d.x, d.y))
            if line < margin:
                continue
            total += 1
            hair_hit = hair_tree.ray_cast(centre + d, -d, 1.0)
            if hair_hit[0] is None or skin[3] < hair_hit[3] - 1e-5:
                count += 1
    return count, total


def sweep(arm, hair, obstacles):
    """Hair contact pairs with each obstacle over quarter-frame gaits and six gestures."""
    rows = []

    def sample(label):
        bpy.context.view_layer.update()
        tree = bvh(hair)[0]
        row = {'pose': label}
        for obj in obstacles:
            row[obj.name] = len(tree.overlap(bvh(obj)[0]))
        rows.append(row)

    for motion in ('walk', 'run'):
        action = bpy.data.actions[motion]
        reset(arm)
        arm.animation_data.action = action
        arm.animation_data.action_slot = action.slots[0]
        for frame in gait_frames(action):
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
            sample(f'{motion}:{frame}')
    for name, axis, angle in [('rest', (0, 0, 1), 0), *GESTURES]:
        pose_gesture(arm, axis, angle)
        sample(name)
    reset(arm)
    worst = {key: max(row[key] for row in rows) for key in rows[0] if key != 'pose'}
    return {'samples': len(rows), 'maximum_pairs': worst,
            'contacts': [row for row in rows if any(row[k] for k in worst)][:10]}


def append_object(blend, name, arm):
    with bpy.data.libraries.load(str(Path(blend).resolve()), link=False) as (source, data):
        if name not in source.objects:
            raise RuntimeError(f'{name} not in {blend}')
        data.objects = [name]
    obj = data.objects[0]
    bpy.context.collection.objects.link(obj)
    for modifier in obj.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.object = arm
    obj.parent = arm
    bpy.context.view_layer.update()
    return obj


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study-dir', type=Path, required=True)
    parser.add_argument('--outfits', default='', help='Comma-separated outfit blends on the same base')
    parser.add_argument('--glasses', default='', help='Comma-separated BLEND:OBJECT glasses studies on the same base')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    study = json.loads((args.study_dir / 'study-report.json').read_text())
    style_id, spec = study['style'], HEADS[study['base']]
    blend = Path(next(iter(study['blend'])))
    report = {'study_dir': str(args.study_dir), 'study_report_sha256': digest(args.study_dir / 'study-report.json'),
              'verifier_sha256': digest(__file__), 'style': style_id, 'base': study['base'], 'failures': [], 'status': 'running'}

    def check(condition, gate, details=None):
        if not condition:
            report['failures'].append({'gate': gate, 'details': details})

    try:
        check(digest(study['source']) == study['source_sha256'], 'source_unchanged')
        check(digest(Path(__file__).with_name('build_catalog_hair_variant.py')) == study['builder_sha256'], 'builder_matches_study')
        check(digest(Path(plan.__file__)) == study['plan_sha256'], 'plan_matches_study')
        check(digest(blend) == study['blend'][str(blend)], 'saved_blend_matches_study')
        check(all(digest(args.study_dir / n) == h for n, h in study['exports'].items()), 'exports_match_study')

        # Source head: kept faces (all but the base hair) and its triangle count with hair.
        bpy.ops.wm.open_mainfile(filepath=str(Path(study['source']).resolve()))
        reset(bpy.data.objects['Armature_Catalog'])
        source_head = bpy.data.objects[study['head']]
        hair_name, keyword = spec['hair']
        source_triangles = sum(triangles(bpy.data.objects[n]) for n in spec['head_objects'])
        kept = [p for p in source_head.data.polygons
                if hair_name != source_head.name or keyword not in source_head.data.materials[p.material_index].name.lower()]
        source_points = [source_head.matrix_world @ source_head.data.vertices[i].co for i in sorted({i for p in kept for i in p.vertices})]

        bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
        arm = bpy.data.objects['Armature_Catalog']
        reset(arm)
        head = bpy.data.objects[study['head']]
        hair = bpy.data.objects[study['hair']['object']] if study['hair'] else None
        check(rig_signature(arm) == study['baseline']['rig'], 'rig_unchanged')
        check(motion_signature() == study['baseline']['motion'], 'gaits_unchanged')
        check(all(geometry_signature(bpy.data.objects[n]) == s for n, s in study['baseline']['unchanged_geometry'].items()),
              'body_and_garments_unchanged')
        check(not any(n in bpy.data.objects for n in spec['head_objects'] if n != head.name), 'base_hair_removed')
        tree = KDTree(len(source_points))
        for i, point in enumerate(source_points):
            tree.insert(point, i)
        tree.balance()
        head_points = [head.matrix_world @ v.co for v in head.data.vertices]
        head_error = max(tree.find(p)[2] for p in head_points)
        check(len(head_points) == len(source_points) and len(head.data.polygons) == len(kept) and head_error < 1e-7,
              'head_is_base_head_without_hair', {'error_m': head_error, 'vertices': [len(head_points), len(source_points)]})
        for obj in [head] + ([hair] if hair else []):
            check(len(obj.vertex_groups) == 1 and obj.vertex_groups[0].name == 'Head', 'single_head_group', obj.name)
            check(all(len(v.groups) == 1 and abs(v.groups[0].weight - 1) < 1e-7 for v in obj.data.vertices), 'rigid_head_weight', obj.name)
        variant_triangles = triangles(head) + (triangles(hair) if hair else 0)
        report['triangles'] = {'base_head_and_hair': source_triangles, 'variant_head_and_hair': variant_triangles,
                               'hair': triangles(hair) if hair else 0}
        check(variant_triangles <= source_triangles, 'no_heavier_than_base_head', report['triangles'])

        landmarks = study['landmarks']
        centre, scale = Vector(landmarks['skull_centre']), landmarks['scale']
        if hair:
            features = plan.feature_points(landmarks['head'], landmarks['pivot'], scale)
            report['hidden_features'] = hidden_features(head, hair, features)
            check(not report['hidden_features'], 'painted_features_visible', report['hidden_features'][:6])
            through, total = skin_through_hair(style_id, head, hair, centre, scale, max(plan.style(style_id)['edge'].values()))
            report['skin_through_hair'] = {'rays': total, 'skin_first': through}
            check(total > 0 and through == 0, 'scalp_covered', report['skin_through_hair'])
            # Modelled ears and nose (H01) are the head parts off the scalp material; the
            # H02 head is all scalp, its ears hidden by design.
            scalp = spec['skull'][1]
            features_tree = part_tree(head, lambda name: scalp not in name) if scalp else None
            hair_tree = bvh(hair)[0]
            ear_pairs = len(hair_tree.overlap(features_tree)) if features_tree else 0
            report['hair_ear_nose_pairs'] = ear_pairs
            check(ear_pairs == 0, 'clear_of_ears_and_nose', ear_pairs)
            body = bpy.data.objects[spec['body']]
            garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
            report['study_clearance'] = sweep(arm, hair, [body, *garments])
            check(not any(report['study_clearance']['maximum_pairs'].values()), 'study_body_and_garment_clearance',
                  report['study_clearance']['maximum_pairs'])

        # Face image, UV corners and rest shape through the head GLB.
        glb = args.study_dir / f'{style_id}.glb'
        model, binary = read_glb(glb)
        material_index = next(i for i, m in enumerate(model['materials']) if m['name'] == 'face_surface')
        texture = model['textures'][model['materials'][material_index]['pbrMetallicRoughness']['baseColorTexture']['index']]
        view = model['bufferViews'][model['images'][texture['source']]['bufferView']]
        image = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        check(hashlib.sha256(image).hexdigest() == digest(spec['study'] / 'sample-face.png'), 'embedded_face_image_preserved')
        primitives = [p for mesh in model['meshes'] for p in mesh['primitives'] if p.get('material') == material_index]
        check(bool(primitives) and all('TEXCOORD_0' in p['attributes'] for p in primitives), 'face_TEXCOORD_0_preserved')
        source_corners = uv_corner_rows(head, head.data.uv_layers['canonical_face_uv'])
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(glb.resolve()))
        imported = [o for o in bpy.data.objects if o not in before]
        rig = next(o for o in imported if o.type == 'ARMATURE')
        rig.animation_data_create()
        reset(rig)
        mapping = {o: next(m for m in imported if m.type == 'MESH' and m.name.startswith(o.name)) for o in [head] + ([hair] if hair else [])}
        identity = uv_corner_identity(source_corners, uv_corner_rows(mapping[head], mapping[head].data.uv_layers.active))
        report['uv_corner_identity'] = identity
        check(identity['passed'], 'canonical_uv_corner_identity')
        report['export_rest_error_m'] = {o.name: roundtrip_error(o, e) for o, e in mapping.items()}
        check(max(report['export_rest_error_m'].values()) < .00003, 'export_rest_shape', report['export_rest_error_m'])
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)

        # Glasses on the same base: skin must stay clear; temples may enter hair.
        report['glasses'] = {}
        for entry in filter(None, args.glasses.split(',')):
            path, name = entry.rsplit(':', 1)
            glasses = append_object(path, name, arm)
            glasses_tree = bvh(glasses)[0]
            report['glasses'][name] = {'hair_pairs_info': len(glasses_tree.overlap(bvh(hair)[0])) if hair else 0,
                                       'head_pairs': len(glasses_tree.overlap(bvh(head)[0]))}
            check(report['glasses'][name]['head_pairs'] == 0, 'glasses_clear_of_head', {name: report['glasses'][name]})
            bpy.data.objects.remove(glasses, do_unlink=True)

        # Wardrobe (last: it opens other blends): the same hair in every outfit on this
        # base, headwear excluded.
        report['wardrobe'] = {}
        for outfit in filter(None, args.outfits.split(',')) if hair else []:
            bpy.ops.wm.open_mainfile(filepath=str(Path(outfit).resolve()))
            outfit_arm = bpy.data.objects['Armature_Catalog']
            reset(outfit_arm)
            variant_hair = append_object(blend, study['hair']['object'], outfit_arm)
            skip = set(spec['head_objects']) | {variant_hair.name}
            obstacles = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in skip
                         and not o.name.startswith(HEADWEAR)]
            result = sweep(outfit_arm, variant_hair, obstacles)
            result['excluded_headwear'] = [o.name for o in bpy.data.objects if o.name.startswith(HEADWEAR)]
            report['wardrobe'][outfit] = result
            check(not any(result['maximum_pairs'].values()), 'wardrobe_clearance', {outfit: result['maximum_pairs']})
        report['headwear'] = 'A01/A02 under-hat keys and crowns are fitted to the base hair; each needs a refit for this hair.'
        report['status'] = 'passed' if not report['failures'] else 'failed'
    except Exception as error:  # Record the failure in the source-bound report.
        report['status'] = 'failed'
        report['failures'].append({'gate': 'verifier_exception', 'details': repr(error)})
    (args.study_dir / 'verification-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HAIR_VARIANT_VERIFICATION', json.dumps({k: report[k] for k in ('style', 'status', 'failures')}))
    if report['status'] != 'passed':
        raise RuntimeError('Hair-variant gates failed; see verification-report.json')


if __name__ == '__main__':
    main()
