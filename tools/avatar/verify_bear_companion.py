"""Screen or densely sample the saved bear's body/garment clearance."""
import argparse
from array import array
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils.bvhtree import BVHTree
from mathutils import Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'blender/catalog'))
from bear_companion_common import digest, relaxed_pose, write_json
from build_catalog_t01 import reset, world_mesh
from catalog_coverage_visibility import visible_hidden_faces

GARMENTS = ['T01_crew_tee_outfit', 'B01_straight_trousers_outfit', 'F01_strap_sneakers_outfit']


def evaluated_geometry(meshes):
    geometry = {}
    for obj in meshes:
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        geometry[obj.name] = ([obj.matrix_world @ vertex.co for vertex in mesh.vertices],
                              [tuple(triangle.vertices) for triangle in mesh.loop_triangles])
        evaluated.to_mesh_clear()
    return geometry


def inspect_geometry(geometry, garments):
    trees = {}
    bounds = {}
    for name, (points, polygons) in geometry.items():
        trees[name] = BVHTree.FromPolygons(points, polygons, all_triangles=True)
        bounds[name] = {'min': [min(point[axis] for point in points) for axis in range(3)],
                            'max': [max(point[axis] for point in points) for axis in range(3)]}
    pairs = {}
    regions = {}
    names = list(geometry)
    for index, left in enumerate(names):
        for right in names[index + 1:]:
            if left not in garments and right not in garments:
                continue  # Joined anatomical/face surfaces are not cloth obstacles to each other.
            contacts = trees[left].overlap(trees[right])
            count = len(contacts)
            if count:
                key = f'{left}/{right}'
                pairs[key] = count
                points, polygons = geometry[left]
                contact_points = [points[vertex] for index, _ in contacts for vertex in polygons[index]]
                regions[key] = {'min': [min(point[axis] for point in contact_points) for axis in range(3)],
                                'max': [max(point[axis] for point in contact_points) for axis in range(3)]}
    return {'pairs': pairs, 'total_pairs': sum(pairs.values()), 'contact_regions': regions, 'bounds': bounds}


def inspect_pose(meshes, garments):
    return inspect_geometry(evaluated_geometry(meshes), garments)


def vertex_distance(left, right):
    def directed(points, target):
        tree = KDTree(len(target))
        for index, point in enumerate(target):
            tree.insert(point, index)
        tree.balance()
        return max(tree.find(point)[2] for point in points)
    def rendered(row):
        points, faces = row
        return [points[index] for index in sorted({index for face in faces for index in face})]
    a, b = rendered(left), rendered(right)
    return max(directed(a, b), directed(b, a))


def opening_coverage(body, occluding_meshes):
    masks = [mod for mod in body.modifiers if mod.type == 'MASK']
    hidden = set()
    for mod in masks:
        group = body.vertex_groups[mod.vertex_group]
        assert mod.invert_vertex_group, 'Coverage inspector expects inverted removal masks'
        hidden.update(vertex.index for vertex in body.data.vertices
                      if any(weight.group == group.index and weight.weight > .5 for weight in vertex.groups))
    try:
        for mod in masks:
            mod.show_viewport = False
        bpy.context.view_layer.update()
        points, faces = world_mesh(body)
        trees = [BVHTree.FromPolygons(*world_mesh(obj)) for obj in occluding_meshes]
        exposed, removed = visible_hidden_faces(points, faces, hidden, trees)
        centres = [sum((points[v] for v in faces[index]), Vector()) / len(faces[index]) for index in exposed]
        bands = {}
        for point in centres:
            label = f'z{math.floor(point.z * 10) / 10:.1f}'
            bands[label] = bands.get(label, 0) + 1
        return {'visible_faces': len(exposed), 'removed_faces': removed, 'sample': exposed[:12],
                'height_bands': bands, 'centroid_sample': [list(point) for point in centres[:20]],
                'region': {'min': [min(point[axis] for point in centres) for axis in range(3)],
                           'max': [max(point[axis] for point in centres) for axis in range(3)]} if centres else None}
    finally:
        for mod in masks:
            mod.show_viewport = True
        bpy.context.view_layer.update()


def main():
    started = time.monotonic()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path, required=True)
    parser.add_argument('--glb', type=Path)
    parser.add_argument('--substeps', type=int, default=4)
    parser.add_argument('--runtime-samples', type=Path, help='samples.json from actual Three.js sampler')
    parser.add_argument('--coverage', action='store_true', help='Ray-check all covered body openings, no inherited exceptions')
    parser.add_argument('--screen-only', action='store_true')
    parser.add_argument('--arm-screen', help='Comma-separated neutral arm degrees for a bounded diagnostic bracket')
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    arm = bpy.data.objects['Armature_Catalog']
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    assert set(GARMENTS).issubset({obj.name for obj in meshes})
    action = bpy.data.actions.get('celebrate')
    runtime = None
    payload = None
    if args.runtime_samples:
        runtime = json.loads(args.runtime_samples.read_text())
        assert args.glb and runtime['glb_sha256'] == digest(args.glb), 'Stale runtime sample GLB'
        binary = args.runtime_samples.parent / 'positions.bin'
        assert runtime['positions_sha256'] == digest(binary), 'Stale runtime position payload'
        payload = binary.open('rb')
    results = []
    if action:
        reset(arm)
        arm.animation_data.action = action
        if action.slots:
            arm.animation_data.action_slot = action.slots[0]
        start, end = action.frame_range
        frames = [start + (end - start) * index / 6 for index in range(7)] if args.screen_only else [
            start + index / args.substeps for index in range(round((end - start) * args.substeps) + 1)]
        for frame in frames:
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
            bpy.context.view_layer.update()
            native_geometry = evaluated_geometry(meshes)
            row = {'pose': 'celebrate', 'frame': frame, **inspect_geometry(native_geometry, GARMENTS)}
            if args.coverage:
                body = bpy.data.objects['body_underlayer_male']
                row['openings'] = opening_coverage(body, [obj for obj in meshes if obj != body])
            if runtime:
                sample_index = round(frame * runtime['substeps'])
                assert abs(runtime['frames'][sample_index]['frame'] - frame) < 1e-7
                payload.seek(sample_index * runtime['stride'] * 4)
                values = array('f')
                values.frombytes(payload.read(runtime['stride'] * 4))
                exported = {}
                offset = 0
                for item in runtime['meshes']:
                    points, faces = exported.setdefault(item['source'], ([], []))
                    base = len(points)
                    points.extend(Vector(values[offset + i * 3:offset + i * 3 + 3]) for i in range(item['count']))
                    indices = item['indices']
                    faces.extend(tuple(base + value for value in indices[i:i + 3]) for i in range(0, len(indices), 3))
                    offset += item['count'] * 3
                assert set(exported) == set(native_geometry), 'Missing exported surface'
                row['runtime_contacts'] = inspect_geometry(exported, GARMENTS)
                row['export_errors_m'] = {name: vertex_distance(native_geometry[name], exported[name]) for name in exported}
                row['runtime_floor_m'] = runtime['frames'][sample_index]['floor']
            results.append(row)
    elif args.arm_screen:
        for degrees in map(float, args.arm_screen.split(',')):
            relaxed_pose(arm, degrees)
            results.append({'pose': 'arm-screen', 'degrees': degrees, **inspect_pose(meshes, GARMENTS)})
    else:
        for label, apply in [('bind-rest', lambda: reset(arm)), ('relaxed', lambda: relaxed_pose(arm, 8))]:
            apply()
            results.append({'pose': label, **inspect_pose(meshes, GARMENTS)})
    args.output_dir.mkdir(parents=True, exist_ok=True)
    worst = max(results, key=lambda result: result['total_pairs'])
    maximum_error = max((max(row.get('export_errors_m', {'none': 0}).values()) for row in results), default=0)
    runtime_contacts = max((row.get('runtime_contacts', {}).get('total_pairs', 0) for row in results), default=0)
    opening_max = max((row.get('openings', {}).get('visible_faces', 0) for row in results), default=0)
    passed = worst['total_pairs'] == 0 and runtime_contacts == 0 and opening_max == 0 and maximum_error < .00003
    report = {'profile': 'native-contact-screen' if args.screen_only else 'native-dance-contacts',
              'blend': str(args.blend), 'blend_sha256': digest(args.blend),
              'verifier_sha256': digest(Path(__file__)), 'blender_version': bpy.app.version_string,
              'sample_count': len(results), 'checks': results, 'worst': worst,
              'elapsed_seconds': time.monotonic() - started,
              'maximum_export_error_m': maximum_error, 'export_threshold_m': .00003,
              'maximum_runtime_contacts': runtime_contacts, 'maximum_visible_opening_faces': opening_max,
              'runtime_samples_sha256': digest(args.runtime_samples) if runtime else None,
              'status': 'passed' if passed else 'failed',
              'scope': {'contacts': 'All evaluated native body/garment/head/layer triangles; intentional anatomical face joins excluded',
                        'runtime': 'Actual Three.js SLERP and skinning, bidirectional all-rendered-vertex comparison' if runtime else 'not run',
                        'openings': '32 standard cameras; no historical contact exceptions' if args.coverage else 'not run',
                        'art_acceptance': 'separate user review'}}
    destination = args.output_dir / ('native-screen.json' if args.screen_only else 'native-dance-report.json')
    write_json(destination, report)
    print(json.dumps({'report': str(destination), 'samples': len(results), 'worst': worst,
                      'seconds': report['elapsed_seconds']}))
    if payload:
        payload.close()
    if not passed:
        raise RuntimeError(f"Bear gate failed: native={worst['pairs']}, runtime={runtime_contacts}, openings={opening_max}, export={maximum_error}")


if __name__ == '__main__':
    main()
