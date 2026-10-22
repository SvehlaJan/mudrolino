"""Inspect a generated bear without altering its input GLB or accepting its art.

Normalize only a presentation parent, render four <=320px views, and retain the
imported editable scene and source-bound inventory for likeness review.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, material, write_json
from build_catalog_t01 import setup_render


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--glb', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        raise ValueError('Use a new or empty review directory')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.import_scene.gltf(filepath=str(args.glb.resolve()))
    imported = list(bpy.data.objects)
    meshes = [obj for obj in imported if obj.type == 'MESH']
    points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    if not points:
        raise ValueError('Generated GLB has no mesh vertices')
    minimum = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    maximum = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    height = maximum.z - minimum.z
    if height <= 0:
        raise ValueError('Generated model has no positive height')
    scale = 2.28 / height
    pivot = bpy.data.objects.new('Review-only normalization', None)
    bpy.context.collection.objects.link(pivot)
    for obj in imported:
        if obj.parent is None:
            matrix = obj.matrix_world.copy()
            obj.parent = pivot
            obj.matrix_world = matrix
    pivot.matrix_world = Matrix.Scale(scale, 4) @ Matrix.Translation(Vector((
        -(minimum.x + maximum.x) / 2,
        -(minimum.y + maximum.y) / 2,
        -minimum.z,
    )))
    bpy.context.view_layer.update()
    inventory = []
    for obj in meshes:
        obj.data.calc_loop_triangles()
        inventory.append({'name': obj.name, 'vertices': len(obj.data.vertices),
                          'triangles': len(obj.data.loop_triangles),
                          'uv_layers': len(obj.data.uv_layers),
                          'materials': [m.name if m else None for m in obj.data.materials]})
    images = [{'name': image.name, 'size': list(image.size)} for image in bpy.data.images
              if image.type == 'IMAGE']
    camera = setup_render()
    scene = bpy.context.scene
    scene.cycles.samples = 24
    scene.render.resolution_x = 320
    scene.render.resolution_y = 400
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.83,.79,.72,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .75
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.001))
    bpy.context.object.name = 'Review-only studio floor'
    bpy.context.object.data.materials.append(material('Review studio floor','#EFE8DB',.9))
    target = Vector((0,0,1.155))
    camera.data.ortho_scale = 2.60
    views = {}
    for label, offset in [('three-quarter',(-2,-5,.35)),('front',(0,-5,.28)),
                          ('side',(-5,0,.28)),('back',(0,5,.28))]:
        camera.location = target + Vector(offset)
        camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
        path = args.output_dir / f'{label}-review.png'
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        views[label] = str(path)
    blend = args.output_dir / 'generated-review.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    report = {'stage': 'generated candidate; art, topology, clothing separation and motion unaccepted',
              'glb': str(args.glb), 'glb_sha256': digest(args.glb),
              'bytes': args.glb.stat().st_size, 'builder_sha256': digest(Path(__file__)),
              'original_bounds': {'min': list(minimum), 'max': list(maximum)},
              'review_scale': scale, 'meshes': inventory, 'images': images,
              'triangles': sum(item['triangles'] for item in inventory),
              'armatures': sum(obj.type == 'ARMATURE' for obj in imported),
              'blend': str(blend), 'blend_sha256': digest(blend),
              'blender_version': bpy.app.version_string, 'review_width': 320, 'views': views}
    write_json(args.output_dir / 'generated-review-report.json', report)
    print(json.dumps({'triangles': report['triangles'], 'views': views}))


if __name__ == '__main__':
    main()
