"""Read-only F02 row attachment diagnosis against the actual posed shell."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, world_mesh
from catalog_footwear_geometry import foot_rest_transform

SOURCE_SHA256 = '92ffa5913e4eaec9015b8e414f38b757e032375fc3d1194f4932dffd17a25f0f'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    sha = hashlib.sha256(args.source.read_bytes()).hexdigest()
    assert sha == SOURCE_SHA256, 'Re-audit changed starting source'
    assert not args.report.exists(), 'Preserve previous diagnosis'
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    arm = bpy.data.objects['Armature_Catalog']; obj = bpy.data.objects['F02_slip_ons']; reset(arm)
    material = 'A orange slip-on heel tabs'
    names = {'A navy slip-on upper', 'A navy slip-on collar', 'A ivory slip-on sole'}
    tab_faces = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name == material]
    shell_faces = [tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in names]
    ids = sorted({i for face in tab_faces for i in face})
    assert len(ids) == 60
    basis = [p.co.copy() for p in obj.data.shape_keys.key_blocks['Basis'].data]
    records = []
    for motion, frame in [('rest', 0), ('run', 2.5), ('run', 4.75), ('run', 7.25), ('run', 12.25), ('run', 12.75), ('run', 15.25)]:
        reset(arm)
        if motion != 'rest':
            action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
        bpy.context.scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame)); bpy.context.view_layer.update()
        points, _ = world_mesh(obj)
        tree = BVHTree.FromPolygons(points, shell_faces)
        pairs = tree.overlap(BVHTree.FromPolygons(points, tab_faces))
        touch = {i for _, face in pairs for i in tab_faces[face]}
        bone_matrices = {bone.name: arm.pose.bones[bone.name].matrix @ bone.matrix_local.inverted() for bone in arm.data.bones}
        samples = []
        for i in ids:
            side = 'Left' if basis[i].x > 0 else 'Right'
            transform = foot_rest_transform(arm, 1 if side == 'Left' else -1)
            local = transform.inverted() @ basis[i]
            rear = transform.to_3x3() @ Vector((0, 1, 0))
            matrix = Matrix.Identity(4) * 0
            for weight in obj.data.vertices[i].groups:
                matrix += bone_matrices[obj.vertex_groups[weight.group].name] * weight.weight
            direction = (matrix.to_3x3() @ rear).normalized()
            own_faces = [face for face in shell_faces if basis[face[0]].x * basis[i].x > 0]
            own = BVHTree.FromPolygons(points, own_faces)
            hit, normal, face, distance = own.ray_cast(points[i] + direction*.04, -direction, .08)
            nearest, norm, _, near_distance = own.find_nearest(points[i])
            sample = {'index': i, 'side': side, 'contact_incident': i in touch, 'rest_local': list(local), 'posed_xyz': list(points[i]),
                      'weights': {obj.vertex_groups[w.group].name: w.weight for w in obj.data.vertices[i].groups}, 'nearest_distance_m': near_distance}
            if hit is not None:
                if normal.dot(direction) < 0: normal.negate()
                desired = hit + normal*.0015
                delta = matrix.inverted().to_3x3() @ (desired-points[i])
                sample.update(ray_surface_distance_m=distance-.04, ray_normal=list(normal), rest_delta_for_1_5mm_surface_margin=list(delta), rest_delta_length_m=delta.length)
            samples.append(sample)
        records.append({'motion': motion, 'frame': frame, 'pairs': len(pairs),
                        'corrective_values': {key.name: key.value for key in obj.data.shape_keys.key_blocks if key.name != 'Basis'}, 'samples': samples})
    report = {'source': str(args.source), 'source_sha256': sha, 'source_saved': False,
              'diagnoser_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'records': records,
              'scope': 'Rest and native sampled pose diagnosis only; ray/nearest normals are instrumentation, not clearance proof.'}
    args.report.parent.mkdir(parents=True, exist_ok=True); args.report.write_text(json.dumps(report, indent=2)+'\n')
    assert hashlib.sha256(args.source.read_bytes()).hexdigest() == sha
    print('F02_ROW_DIAGNOSIS', json.dumps([{k: v for k, v in row.items() if k != 'samples'} for row in records]))


if __name__ == '__main__': main()
