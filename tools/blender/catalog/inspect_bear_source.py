"""Freeze the bear's fitting-source inventory without changing the Blender scene."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_head_style_study import geometry_signature, motion_signature, rig_signature
from build_catalog_female_foundation_study import topology_signature, weights_signature
from build_catalog_t01 import reset


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source_hash = digest(args.source)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    meshes = {}
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        meshes[obj.name] = {
            'vertices': len(points),
            'polygons': len(obj.data.polygons),
            'geometry_sha256': geometry_signature(obj),
            'topology_sha256': topology_signature(obj),
            'weights_sha256': weights_signature(obj),
            'bounds': {
                'min': [min(point[axis] for point in points) for axis in range(3)],
                'max': [max(point[axis] for point in points) for axis in range(3)],
            },
            'materials': [material.name if material else None for material in obj.data.materials],
            'masks': [
                {'name': modifier.name, 'group': modifier.vertex_group,
                 'invert': modifier.invert_vertex_group, 'enabled': modifier.show_viewport}
                for modifier in obj.modifiers if modifier.type == 'MASK'
            ],
            'shape_keys': list(obj.data.shape_keys.key_blocks.keys()) if obj.data.shape_keys else [],
        }
    report = {
        'source': str(args.source),
        'source_sha256': source_hash,
        'blender_version': bpy.app.version_string,
        'units': bpy.context.scene.unit_settings.system,
        'metres_per_unit': bpy.context.scene.unit_settings.scale_length,
        'fps': bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
        'armature': arm.name,
        'rig_sha256': rig_signature(arm),
        'gaits_sha256': motion_signature(),
        'bones': {
            bone.name: {'parent': bone.parent.name if bone.parent else None,
                        'head': list(arm.matrix_world @ bone.head_local),
                        'tail': list(arm.matrix_world @ bone.tail_local),
                        'matrix_local': [list(row) for row in bone.matrix_local]}
            for bone in arm.data.bones
        },
        'meshes': meshes,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    destination = args.output_dir / 'source-inventory.json'
    if destination.exists():
        previous = json.loads(destination.read_text())
        if previous != report:
            raise RuntimeError('The frozen source inventory differs; use a new revision directory')
    else:
        destination.write_text(json.dumps(report, indent=2) + '\n')
    assert len(report['bones']) == 24, 'The approved shared rig has 24 bones'
    print(json.dumps({'report': str(destination), 'source_sha256': source_hash,
                      'bones': len(report['bones']), 'meshes': meshes}, indent=2))


if __name__ == '__main__':
    main()
