"""Map real B04 own-shell pairs to source faces, authored components and depths."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from b04_detail_components import components
from build_catalog_t01 import reset, world_mesh, setup_render


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--review-dir', type=Path, required=True)
    parser.add_argument('--run-frame', type=float, action='append', default=[])
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    sha = hashlib.sha256(args.blend.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    obj = bpy.data.objects['B04_ivory_trousers']
    arm = bpy.data.objects['Armature_Catalog']
    shell_materials = {'A ivory tapered trouser fabric', 'A ivory tapered trouser trim'}
    shell_ids = [face.index for face in obj.data.polygons if obj.data.materials[face.material_index].name in shell_materials]
    rest_points = [vertex.co.copy() for vertex in obj.data.vertices]
    groups = components(len(rest_points), [tuple(edge.vertices) for edge in obj.data.edges])
    rows = []
    for indices in groups:
        index_set = set(indices)
        faces = [face.index for face in obj.data.polygons if all(i in index_set for i in face.vertices)]
        materials = sorted({obj.data.materials[obj.data.polygons[i].material_index].name for i in faces})
        if set(materials) & shell_materials:
            continue
        bounds = [[min(rest_points[i][axis] for i in indices), max(rest_points[i][axis] for i in indices)] for axis in range(3)]
        if materials == ['A navy tapered trouser button']:
            role = 'waist button'
        else:
            role = {104: 'front pocket opening tube', 136: 'fly seam tube',
                    242: 'rounded back pocket patch', 20: 'belt loop'}.get(len(indices), 'unmapped authored detail')
        rows.append({'component': len(rows), 'role': role, 'vertices': indices,
            'faces': faces, 'materials': materials, 'rest_bounds_m': bounds, 'samples': []})
    records = []
    for motion, frame in [('rest', 0), ('walk', .8), ('run', 6.25), ('run', 6.5), ('run', 15.25)] + [('run', frame) for frame in args.run_frame]:
        reset(arm)
        if motion != 'rest':
            action = bpy.data.actions[motion]
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
        bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
        bpy.context.view_layer.update()
        points, faces = world_mesh(obj)
        assert len(faces) == len(obj.data.polygons), 'Evaluated topology changed'
        shell = BVHTree.FromPolygons(points, [faces[i] for i in shell_ids])
        record = {'motion': motion, 'frame': frame, 'components': []}
        for row in rows:
            pairs = shell.overlap(BVHTree.FromPolygons(points, [faces[i] for i in row['faces']]))
            samples = []
            for index in row['vertices']:
                point, normal, nearest_face, distance = shell.find_nearest(points[index])
                samples.append({'vertex': index, 'signed_distance_m': (points[index] - point).dot(normal),
                    'nearest_shell_face': shell_ids[nearest_face], 'distance_m': distance,
                    'rest_xyz': list(rest_points[index]), 'posed_xyz': list(points[index])})
            deepest = min(samples, key=lambda sample: sample['signed_distance_m'])
            sample = {'motion': motion, 'frame': frame, 'pairs': len(pairs),
                'actual_face_pairs': [{'shell_face': shell_ids[a], 'detail_face': row['faces'][b],
                    'shell_material': obj.data.materials[obj.data.polygons[shell_ids[a]].material_index].name}
                    for a, b in pairs], 'deepest_signed_sample': deepest,
                'negative_vertices': sum(sample['signed_distance_m'] < 0 for sample in samples)}
            row['samples'].append(sample)
            record['components'].append({'component': row['component'], 'role': row['role'],
                'pairs': sample['pairs'], 'deepest_signed_distance_m': deepest['signed_distance_m']})
        records.append(record)
    # Exact source views, with original materials and no saved scene changes.
    args.review_dir.mkdir(parents=True, exist_ok=True)
    camera = setup_render()
    camera.data.ortho_scale = .46
    reviews = []
    for motion, frame in [('rest', 0), ('run', args.run_frame[0] if args.run_frame else 6.25)]:
        reset(arm)
        if motion != 'rest':
            action = bpy.data.actions[motion]
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
        bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
        bpy.context.view_layer.update()
        for name, position in [('front', (0, -3, .92)), ('back', (0, 3, .92))]:
            camera.location = position
            camera.rotation_euler = (Vector((0, 0, .88)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
            path = args.review_dir / (motion + '-' + str(frame) + '-' + name + '-review.png')
            bpy.context.scene.render.filepath = str(path.resolve())
            bpy.ops.render.render(write_still=True)
            reviews.append(str(path))
    assert hashlib.sha256(args.blend.read_bytes()).hexdigest() == sha
    report = {'status': 'diagnostic; own-shell acceptance remains failed', 'blend': str(args.blend),
        'tool_hashes': {str(Path('tools/blender/catalog') / name): hashlib.sha256((Path('tools/blender/catalog') / name).read_bytes()).hexdigest()
            for name in ('diagnose_catalog_b04_own_shell.py', 'b04_detail_components.py', 'build_catalog_t01.py')},
        'blend_sha256': sha, 'source_unchanged': True, 'components': rows, 'poses': records,
        'reviews': reviews, 'review_width': bpy.context.scene.render.resolution_x,
        'construction': 'Source builder seats the waist button at 2 mm offset with 2.5 mm half-depth; this intentionally embeds its back 0.5 mm. No explicit accepted-contact roles exist, so the unchanged zero-contact gate rejects it.',
        'scope': 'Exact per-component polygon pairs and nearest signed shell distances at diagnostic poses; not a full clearance gate.'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print('B04_OWN_SHELL_DIAGNOSIS', json.dumps({'blend': str(args.blend), 'components': len(rows), 'poses': records}))


if __name__ == '__main__':
    main()
