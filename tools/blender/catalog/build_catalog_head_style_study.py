"""Create an isolated reference-A head study on the unchanged fitting outfit."""
import argparse, hashlib, json, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_catalog_head as head_builder
from build_catalog_head import head_objects, sphere, face_y
from build_catalog_t01 import export, reset, setup_render, select
from prepare_catalog_body import action_curves


def geometry_signature(obj):
    payload = {'vertices': [list(v.co) for v in obj.data.vertices],
               'faces': [list(p.vertices) for p in obj.data.polygons],
               'weights': [[(w.group, w.weight) for w in v.groups] for v in obj.data.vertices]}
    return hashlib.sha256(json.dumps(payload).encode()).hexdigest()


def rig_signature(arm):
    return hashlib.sha256(json.dumps([(b.name, [list(row) for row in b.matrix_local]) for b in arm.data.bones]).encode()).hexdigest()


def motion_signature():
    data = {name: [(curve.data_path, curve.array_index,
                   [(list(p.co), list(p.handle_left), list(p.handle_right), p.interpolation) for p in curve.keyframe_points])
                  for curve in action_curves(bpy.data.actions[name])] for name in ('walk', 'run')}
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def lower_face(point):
    x, y, z = point
    t = max(0, min(1, (1.620 - z) / .160))
    return Vector((x * (1.015 + .105 * t), y, z + .022 * t))


def smoothstep(value):
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']; reset(arm)
    unchanged = {obj.name: geometry_signature(obj) for obj in bpy.data.objects if obj.type == 'MESH' and obj.name != 'H01_head'}
    rig_before = rig_signature(arm)
    motion_before = motion_signature()
    old_head = bpy.data.objects['H01_head']; old_mesh = old_head.data
    bpy.data.objects.remove(old_head, do_unlink=True)
    if old_mesh.users == 0: bpy.data.meshes.remove(old_mesh)
    for material in list(bpy.data.materials):
        if material.name.startswith('A ') and material.users == 0: bpy.data.materials.remove(material)
    original_sphere = head_builder.sphere
    def swept_sphere(name, location, scale, mat, rotation=(0, 0, 0), segments=32, rings=16):
        if name == 'H01 sculpted wave' and location[1] < 0:
            scale = (scale[0] * 1.32, scale[1] * .88, scale[2] * .85)
        return original_sphere(name, location, scale, mat, rotation, segments, rings)
    head_builder.sphere = swept_sphere
    try: parts, _ = head_objects()
    finally: head_builder.sphere = original_sphere
    hair_material = next(o.data.materials[0] for o in parts if o.name.startswith('H01 hair'))
    parts.append(sphere('H01 connected moustache', (0, face_y(0, 1.576, .003), 1.576), (.009, .0035, .0045), hair_material))
    for obj in parts:
        # Operate in shared rest-space, then join with identity transforms.
        obj.data.transform(obj.matrix_world); obj.matrix_world = Matrix.Identity(4)
        eye = obj.name.startswith(('H01 eye', 'H01 brown iris', 'H01 pupil'))
        cx = .055 if sum(v.co.x for v in obj.data.vertices) >= 0 else -.055
        for vertex in obj.data.vertices:
            point = vertex.co.copy()
            if eye:
                original_y = point.y
                point.x = cx + (point.x - cx) * 1.22
                point.z = 1.634 + (point.z - 1.634) * .83
                # Seat a thin curved eye volume against the actual face surface.
                if obj.name.startswith('H01 eye white'):
                    point.y = face_y(point.x, point.z, .0015) + ((original_y + .095) / .017) * .004
                else:
                    offset = .008 if obj.name.startswith('H01 eye sparkle') else .007 if obj.name.startswith('H01 pupil') else .0055
                    center, radius, depth = (-.116, .001, .0003) if obj.name.startswith('H01 eye sparkle') else (-.1145, .0015, .0004) if obj.name.startswith('H01 pupil') else (-.112, .0025, .0006)
                    point.y = face_y(point.x, point.z, offset) + ((original_y - center) / radius) * depth
            if obj.name.startswith('H01 nose'):
                point.x *= 1.08
                point.z = 1.593 + (point.z - 1.593) * 1.16
                point.y = -.113 + (point.y + .113) * .85
            if obj.name.startswith('H01 hair') and point.z > 1.685:
                point.z = 1.685 + (point.z - 1.685) * .88
                point.x *= 1.04
            elif point.z > 1.700:
                # Compress scalp and upper skull together so flattening the hair
                # cannot expose skin through its closed cap.
                point.z = 1.700 + (point.z - 1.700) * .88
            vertex.co = lower_face(point)
        if obj.name.startswith('H01 hair'):
            select(obj); modifier = obj.modifiers.new('Softer swept silhouette study', 'SMOOTH')
            modifier.factor = .45; modifier.iterations = 5
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        colors = obj.data.color_attributes.get('Head tint')
        if obj.name == 'H01 rounded face':
            for vertex in obj.data.vertices:
                x, y, z = vertex.co
                frontness = max(0, min(1, (y + .120) / .135))
                top_z = 1.592 + .060 * frontness
                lower = smoothstep((top_z - z) / .022)
                visible = smoothstep((.065 - y) / .075)
                mouth_clear = smoothstep(((x / .057) ** 2 + ((z - 1.568) / .028) ** 2 - .75) / .65)
                amount = lower * visible * mouth_clear * .78
                skin, beard = (.72, .385, .215), (.155, .061, .027)
                colors.data[vertex.index].color = (*(skin[i] * (1 - amount) + beard[i] * amount for i in range(3)), 1)
        elif not colors:
            colors = obj.data.color_attributes.new(name='Head tint', type='FLOAT_COLOR', domain='POINT')
            for color in colors.data: color.color = (1, 1, 1, 1)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
    head = bpy.context.object; head.name = 'H01_head'
    group = head.vertex_groups.new(name='Head'); group.add(list(range(len(head.data.vertices))), 1, 'REPLACE')
    modifier = head.modifiers.new('Shared head bone', 'ARMATURE'); modifier.object = arm
    head.parent = arm; head.matrix_world = Matrix.Identity(4)
    assert rig_signature(arm) == rig_before
    assert all(geometry_signature(bpy.data.objects[name]) == signature for name, signature in unchanged.items())
    export(args.output_dir / 'H01.glb', [arm, head])
    body = bpy.data.objects['body_underlayer_male']
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
    bpy.context.collection.objects.link(masked)
    assert [g.name for g in masked.vertex_groups] == [g.name for g in body.vertex_groups]
    modifier = masked.modifiers.new('Shared body skin', 'ARMATURE'); modifier.object = arm; masked.parent = arm
    garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
    assert len(garments) == 3, [o.name for o in garments]
    export(args.output_dir / 'outfit.glb', [arm, masked, head, *garments])
    assert motion_signature() == motion_before
    bpy.data.objects.remove(masked, do_unlink=True)
    camera = setup_render(); reset(arm)
    bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir / 'H01.blend').resolve()))
    reviews = []
    for label, position in [('front', (0, -3, 1.64)), ('side', (3, 0, 1.64)), ('back', (0, 3, 1.64)), ('three-quarter', (2, -3, 1.64))]:
        camera.data.ortho_scale = .50; camera.location = position
        camera.rotation_euler = (Vector((0, 0, 1.63)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        file = args.output_dir / (label + '-review.png'); bpy.context.scene.render.filepath = str(file.resolve())
        bpy.ops.render.render(write_still=True); reviews.append(file.name)
    report = {'stage': 'isolated face-style study; final style, expression and headwear compatibility pending',
              'source': str(args.source), 'source_sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'head_vertices': len(head.data.vertices), 'head_polygons': len(head.data.polygons),
              'unchanged_geometry': unchanged, 'rig_signature': rig_before, 'motion_signature': motion_before,
              'body_rig_garments_exact': True, 'walk_run_exact': True,
              'parameters': {'lower_face_max_lift_m': .022, 'eye_width_scale': 1.22, 'eye_height_scale': .83,
                             'eye_white_half_depth_m': .004, 'iris_half_depth_m': .0006, 'upper_hair_height_scale': .88,
                             'front_wave_width_scale': 1.32, 'beard_max_blend': .78}, 'reviews': reviews}
    (args.output_dir / 'style-study-report.json').write_text(json.dumps(report, indent=2))
    print('HEAD_STYLE_STUDY', json.dumps(report))


if __name__ == '__main__': main()
