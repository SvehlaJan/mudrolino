"""Export disposable head/hair proportion options; never save or promote sources.

Run via blender_queue.py and blender_cli.py. The resulting GLBs are rest-pose
review fixtures, not fitted candidates. Body topology, rig and clips stay fixed.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path


def scaled_point(point, pivot, scale):
    if scale == 1:
        return tuple(point)
    return tuple(anchor + (value - anchor) * scale for value, anchor in zip(point, pivot))


def validate_scales(values):
    values = tuple(values)
    if not values or 1 not in values or len(set(values)) != len(values):
        raise ValueError('Provide unique scales including the unchanged 1.0 baseline')
    if any(not math.isfinite(value) or not .8 <= value <= 1.5 for value in values):
        raise ValueError('Review scales must be finite and within 0.8–1.5')
    if any(value != round(value, 1) for value in values):
        raise ValueError('Review scales require one decimal place to avoid export path collisions')
    return values


def validate_output(output, protected_root):
    output, protected_root = Path(output).resolve(), Path(protected_root).resolve()
    if output == protected_root or output.is_relative_to(protected_root) or protected_root.is_relative_to(output):
        raise ValueError('Review output must not overlap protected model assets')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def review_envelope(world_geometry, head_points):
    points = [point for vertices, _faces in world_geometry for point in vertices]
    points += list(head_points)
    return {'min': [min(point[i] for point in points) for i in range(3)],
            'max': [max(point[i] for point in points) for i in range(3)]}


def main():
    import bpy
    from mathutils import Vector
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from build_catalog_t01 import reset, world_mesh
    from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
    from build_catalog_female_foundation_study import export_uv

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--male-source', type=Path, default=Path('assets/avatar/catalog-a/H01/style-revisions/painted-face/H01.blend'))
    parser.add_argument('--female-source', type=Path, default=Path('assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01/outfit.blend'))
    parser.add_argument('--scales', default='1,1.1,1.2,1.3')
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    scales = validate_scales(float(value) for value in args.scales.split(','))
    validate_output(args.output_dir, Path('assets'))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    if (args.output_dir / 'manifest.json').exists():
        raise ValueError('Use a new output directory; preserve previous review evidence')
    protected = {str(source): digest(source) for source in (args.male_source, args.female_source)}
    records = []
    for base, source, body_name, head_names, recipe in [
        ('male', args.male_source, 'body_underlayer_male', ['H01_head'], 'T05/B01/F04 painted-face study'),
        ('female', args.female_source, 'body_underlayer_female', ['H02_head', 'H02_hair'], 'T02/B01/F01 capsule'),
    ]:
        bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
        arm = bpy.data.objects['Armature_Catalog']; reset(arm)
        body = bpy.data.objects[body_name]
        heads = [bpy.data.objects[name] for name in head_names]
        garment_names = ['T05_crew_sweatshirt_outfit', 'B01_straight_trousers_outfit', 'F04_ankle_boots_outfit'] if base == 'male' else ['T02_pullover_hoodie', 'B01_straight_trousers', 'F01_strap_sneakers']
        garments = [bpy.data.objects[name] for name in garment_names]
        assert len(garments) == 3, (base, [obj.name for obj in garments])
        before = {obj.name: geometry_signature(obj) for obj in bpy.data.objects if obj.type == 'MESH' and obj not in heads}
        rig_before, actions_before = rig_signature(arm), motion_signature()
        pivot = tuple(arm.matrix_world @ arm.data.bones['Head'].head_local)
        originals = {obj.name: [tuple(vertex.co) for vertex in obj.data.vertices] for obj in heads}
        # The viewer fits models by total bounds. Transparent review-only markers
        # give all scales/modes the same envelope instead of shrinking the body.
        envelope = review_envelope([world_mesh(obj) for obj in [body, *garments]],
            [Vector(scaled_point(head.matrix_world @ Vector(point), pivot, scale))
             for head in heads for point in originals[head.name] for scale in scales])
        assert max(envelope['max']) < 3, 'Invalid world bounds for the shared meter-scale base'
        marker_material = bpy.data.materials.new('Review-only invisible framing')
        marker_material.use_nodes = True
        marker_material.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value = 0
        marker_material.surface_render_method = 'DITHERED'
        vertices, faces = [], []
        for corner in [envelope['min'], envelope['max']]:
            offset = len(vertices)
            vertices += [tuple(corner[i] + sign[i] * .00001 for i in range(3))
                         for sign in [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)]]
            faces += [tuple(offset + value for value in face) for face in [(0, 1, 2), (0, 3, 1), (0, 2, 3), (1, 3, 2)]]
        marker_mesh = bpy.data.meshes.new('Review-only fixed framing')
        marker_mesh.from_pydata(vertices, [], faces); marker_mesh.update()
        marker = bpy.data.objects.new('preview_framing_only', marker_mesh)
        bpy.context.collection.objects.link(marker); marker.data.materials.append(marker_material)
        for scale in scales:
            for head in heads:
                inverse = head.matrix_world.inverted()
                for vertex, original in zip(head.data.vertices, originals[head.name]):
                    # The common world pivot also handles a non-identity object transform.
                    world = head.matrix_world @ Vector(original)
                    vertex.co = inverse @ Vector(scaled_point(world, pivot, scale)) if scale != 1 else original
                head.data.update()
            bpy.context.view_layer.update()
            for mode in ['clothed', 'unclothed']:
                masks = [(modifier, modifier.show_viewport) for modifier in body.modifiers if modifier.type == 'MASK']
                try:
                    if mode == 'unclothed':
                        for modifier, _ in masks: modifier.show_viewport = False
                    bpy.context.view_layer.update()
                    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
                    mesh = bpy.data.meshes.new_from_object(evaluated)
                    visible = bpy.data.objects.new('proportion_preview_body', mesh)
                    bpy.context.collection.objects.link(visible)
                    visible.matrix_world = body.matrix_world.copy()
                    assert [g.name for g in visible.vertex_groups] == [g.name for g in body.vertex_groups]
                    skin = visible.modifiers.new('Unchanged shared body skin', 'ARMATURE'); skin.object = arm
                    visible.parent = arm
                    directory = args.output_dir / base / f'{scale:.1f}'
                    directory.mkdir(parents=True, exist_ok=True)
                    output = directory / f'{mode}.glb'
                    objects = [arm, visible, *heads, marker, *(garments if mode == 'clothed' else [])]
                    export_uv(output, objects)
                    bpy.data.objects.remove(visible, do_unlink=True)
                    if mesh.users == 0: bpy.data.meshes.remove(mesh)
                finally:
                    for modifier, value in masks: modifier.show_viewport = value
                    bpy.context.view_layer.update()
                assert rig_signature(arm) == rig_before, 'Preview changed the rig'
                assert motion_signature() == actions_before, 'Preview changed the source actions'
                assert all(geometry_signature(bpy.data.objects[name]) == signature for name, signature in before.items()), 'Preview changed a non-head source mesh'
                records.append({'base': base, 'scale': scale, 'mode': mode, 'recipe': recipe if mode == 'clothed' else 'unclothed source body',
                    'source': str(source), 'source_sha256': protected[str(source)], 'head_objects': head_names,
                    'pivot_world_m': pivot, 'file': str(output), 'sha256': digest(output),
                    'fixed_review_envelope_m': envelope,
                    'rig_signature': rig_before, 'actions_signature': actions_before, 'non_head_geometry_exact': True,
                    'head_rest_bounds_world_m': {head.name: {'min': [min((head.matrix_world @ vertex.co)[i] for vertex in head.data.vertices) for i in range(3)], 'max': [max((head.matrix_world @ vertex.co)[i] for vertex in head.data.vertices) for i in range(3)]} for head in heads}})
    assert all(digest(path) == sha for path, sha in protected.items()), 'Source files changed'
    report = {'stage': 'Review-only proportion proposals; no native fitting, expression or acceptance proof',
        'blender': bpy.app.version_string, 'builder_sha256': digest(__file__), 'protected_sources': protected,
        'source_files_unchanged': True, 'scales': scales, 'records': records,
        'limitations': ['Head/hair meshes are uniformly scaled about the original Head bind anchor.', 'Transparent review-only framing markers keep camera normalization identical across options; they are not production geometry.', 'UVs and painted faces scale with those meshes; this does not revise face placement or head shape.', 'Clothing is unchanged and may intersect the larger head/hair. Review first, then rebuild and verify dependent assets.']}
    (args.output_dir / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PROPORTION_OPTIONS', json.dumps({'records': len(records), 'output': str(args.output_dir), 'source_files_unchanged': True}))


if __name__ == '__main__':
    main()
