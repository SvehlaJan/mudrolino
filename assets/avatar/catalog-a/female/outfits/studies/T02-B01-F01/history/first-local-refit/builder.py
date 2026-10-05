"""Isolated female T02/B01/F01 study; immutable foundation, fitted garments only."""
from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, setup_render
from catalog_piece import long_top_coverage
from catalog_bottom_geometry import full_trouser_coverage
from catalog_footwear_geometry import face_safe_footwear_coverage
from build_catalog_female_foundation_study import export_uv, topology_signature
from build_catalog_head_style_study import rig_signature, motion_signature, geometry_signature

NAMES = {'T02': 'T02_pullover_hoodie', 'B01': 'B01_straight_trousers', 'F01': 'F01_strap_sneakers'}

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def positions_signature(obj):
    return hashlib.sha256(json.dumps([list(v.co) for v in obj.data.vertices]).encode()).hexdigest()

def skin_signature(obj, arm):
    names = {bone.name for bone in arm.data.bones}
    rows = [[(obj.vertex_groups[w.group].name, w.weight) for w in v.groups
             if obj.vertex_groups[w.group].name in names] for v in obj.data.vertices]
    return hashlib.sha256(json.dumps(rows).encode()).hexdigest()

def head_surface_signature(head):
    material_rows = []
    for mat in head.data.materials:
        shader = mat.node_tree.nodes.get('Principled BSDF')
        images = [{'name': node.image.name, 'colorspace': node.image.colorspace_settings.name,
                   'packed_sha256': hashlib.sha256(node.image.packed_file.data).hexdigest()}
                  for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image]
        material_rows.append({'name': mat.name, 'base_color': list(shader.inputs['Base Color'].default_value),
                              'roughness': shader.inputs['Roughness'].default_value,
                              'metallic': shader.inputs['Metallic'].default_value, 'images': images})
    payload = {'UV': [list(value.uv) for value in head.data.uv_layers['canonical_face_uv'].data],
               'face_material_indices': [face.material_index for face in head.data.polygons], 'materials': material_rows}
    return hashlib.sha256(json.dumps(payload).encode()).hexdigest()


def fixed_signatures(arm):
    return {'rig': rig_signature(arm), 'actions': motion_signature(), 'head_UV_material_image': head_surface_signature(bpy.data.objects['H02_head']), 'meshes': {
        name: {'positions': positions_signature(bpy.data.objects[name]),
               'topology': topology_signature(bpy.data.objects[name]),
               'skin': skin_signature(bpy.data.objects[name], arm)}
        for name in ['body_underlayer_female', 'H02_head', 'H02_hair']}}

def load_garment(path, id, arm):
    with bpy.data.libraries.load(str(path.resolve()), link=False) as (source, data):
        assert NAMES[id] in source.objects
        data.objects = [NAMES[id]]
    obj = data.objects[0]; bpy.context.collection.objects.link(obj)
    for modifier in list(obj.modifiers):
        if modifier.type == 'ARMATURE': modifier.object = arm
    obj.parent = arm; obj.matrix_world = Matrix.Identity(4)
    if obj.data.shape_keys and obj.data.shape_keys.animation_data:
        for driver in obj.data.shape_keys.animation_data.drivers:
            for variable in driver.driver.variables:
                for target in variable.targets:
                    if target.id and getattr(target.id, 'type', None) == 'ARMATURE': target.id = arm
    return obj

def components(obj):
    adjacent = [set() for _ in obj.data.vertices]
    for edge in obj.data.edges:
        a, b = edge.vertices; adjacent[a].add(b); adjacent[b].add(a)
    unseen = set(range(len(adjacent))); groups = []
    while unseen:
        todo = [unseen.pop()]; group = []
        while todo:
            i = todo.pop(); group.append(i)
            for j in adjacent[i] & unseen: unseen.remove(j); todo.append(j)
        groups.append(group)
    return groups

def fitted_parts(obj, id, arm, hood_offset, opening_relief):
    groups = [ids for ids in components(obj) if len(ids) > 4]
    roles = obj.data.attributes.new(name='female_detail_role', type='INT', domain='POINT')
    anchors = obj.data.attributes.new(name='female_hood_anchor', type='BOOLEAN', domain='POINT')
    rows = []
    main = max(groups, key=len)
    for ids in groups:
        points = [obj.data.vertices[i].co.copy() for i in ids]
        bounds = [[min(p[a] for p in points), max(p[a] for p in points)] for a in range(3)]
        role = 0
        if id == 'T02' and ids != main: role = 2 if bounds[1][0] > -.02 and bounds[2][0] > 1.20 else 1
        if id == 'B01' and ids != main: role = 3
        if id == 'F01':
            # Small stitched instep closure/tongue components, excluding shells.
            role = 4 if len(ids) < 500 and bounds[2][0] > .06 and bounds[2][1] < .116 else 0
        for i in ids:
            roles.data[i].value = role
            if role == 2: anchors.data[i].value = obj.data.vertices[i].co.z > 1.425
        rows.append({'vertices': len(ids), 'bounds_m': bounds, 'role': role})
    if id == 'T02' and hood_offset:
        obj.data.calc_loop_triangles()
        triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if all(roles.data[i].value == 0 for i in t.vertices)]
        points = [v.co.copy() for v in obj.data.vertices]
        tree = BVHTree.FromPolygons(points, triangles, all_triangles=True)
        for v in obj.data.vertices:
            if roles.data[v.index].value != 2: continue
            point, normal, triangle, _ = tree.find_nearest(v.co)
            if normal.y < 0: normal.negate()
            layer = .0025 if v.normal.dot(normal) > 0 else -.0025
            v.co = point + normal * (hood_offset + layer)
            ids = triangles[triangle]; aa, bb, cc = [points[i] for i in ids]
            if (bb-aa).cross(cc-aa).length < 1e-12: continue
            bary = barycentric_transform(point, aa, bb, cc, Vector((1,0,0)), Vector((0,1,0)), Vector((0,0,1)))
            factors = [max(0,min(1,value)) for value in bary]; total = sum(factors)
            weights = {}
            for i, factor in zip(ids, factors):
                for group in obj.data.vertices[i].groups: weights[group.group] = weights.get(group.group,0) + group.weight * factor / total
            for i in [group.group for group in v.groups]: obj.vertex_groups[i].remove([v.index])
            for i, weight in weights.items():
                if weight > 1e-7: obj.vertex_groups[i].add([v.index], weight, 'REPLACE')
    if id == 'F01' and opening_relief:
        for prefix in ['Left','Right']:
            foot = arm.data.bones[prefix+'Foot'].head_local; toe = arm.data.bones[prefix+'ToeBase'].head_local
            import math
            angle = math.atan2(toe.x-foot.x, foot.y-toe.y)
            transform = Matrix.Translation(Vector((foot.x,foot.y,0))) @ Matrix.Rotation(angle,4,'Z')
            inverse = transform.inverted()
            for v in obj.data.vertices:
                if (v.co.x > 0) != (prefix == 'Left'): continue
                local = inverse @ v.co
                blend = max(0,min(1,(local.z-.096)/.016)) * max(0,min(1,(-local.y-.01)/.045))
                local.y -= opening_relief * blend
                v.co = transform @ local
    return rows


def normalize_garment(obj):
    changed = 0
    for v in obj.data.vertices:
        rows = [(w.group, w.weight) for w in v.groups if w.weight > .0001]
        rows = sorted(rows, key=lambda x: -x[1])[:4]; total = sum(w for _, w in rows)
        assert total > 0
        if len(rows) != len(v.groups) or abs(total - 1) > 1e-7: changed += 1
        for i in [w.group for w in v.groups]: obj.vertex_groups[i].remove([v.index])
        for i, weight in rows: obj.vertex_groups[i].add([v.index], weight / total, 'REPLACE')
    return changed

def mask(body, obj, arm, id):
    if id == 'T02': ids = long_top_coverage(body, obj, arm)
    elif id == 'B01': ids = full_trouser_coverage(body, obj, arm)
    else: ids = face_safe_footwear_coverage(body, .114)
    group = body.vertex_groups.new(name='covered_' + id); group.add(ids, 1, 'REPLACE')
    mod = body.modifiers.new('Female coverage ' + id, 'MASK')
    mod.vertex_group = group.name; mod.invert_vertex_group = True; mod.threshold = .5
    return ids

def export_assembly(folder, arm, body, garments):
    folder.mkdir(parents=True, exist_ok=True); reset(arm)
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    visible = bpy.data.objects.new('outfit_masked_body', mesh); bpy.context.collection.objects.link(visible)
    skin = visible.modifiers.new('Visible female skin', 'ARMATURE'); skin.object = arm
    visible.parent = arm; visible.matrix_world = Matrix.Identity(4)
    head = bpy.data.objects['H02_head']; hair = bpy.data.objects['H02_hair']
    export_uv(folder / 'garments.glb', [arm, *garments])
    export_uv(folder / 'body.glb', [arm, visible, head, hair])
    export_uv(folder / 'outfit.glb', [arm, visible, head, hair, *garments])
    bpy.data.objects.remove(visible, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=str((folder / 'outfit.blend').resolve()))

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--foundation', type=Path, required=True)
    p.add_argument('--catalog-dir', type=Path, required=True)
    p.add_argument('--output-dir', type=Path, required=True)
    p.add_argument('--review-dir', type=Path, required=True)
    p.add_argument('--hood-offset', type=float, default=0)
    p.add_argument('--opening-relief', type=float, default=0)
    p.add_argument('--skip-reviews', action='store_true')
    a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    a.output_dir.mkdir(parents=True, exist_ok=True); a.review_dir.mkdir(parents=True, exist_ok=True)
    piece_rows = {}; baseline = None
    for id in NAMES:
        bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()))
        bpy.context.preferences.filepaths.save_version = 0
        arm = bpy.data.objects['Armature_Catalog']; body = bpy.data.objects['body_underlayer_female']; reset(arm)
        current = fixed_signatures(arm)
        if baseline is None: baseline = current
        assert current == baseline
        source = a.catalog_dir / id / (id + '.blend')
        obj = load_garment(source, id, arm); original = geometry_signature(obj)
        rows = fitted_parts(obj, id, arm, a.hood_offset, a.opening_relief)
        normalized = normalize_garment(obj)
        indices = mask(body, obj, arm, id)
        assert fixed_signatures(arm) == baseline, 'Fixed female geometry/rig/action changed'
        folder = a.output_dir / 'pieces' / id
        export_assembly(folder, arm, body, [obj])
        piece_rows[id] = {'source': str(source), 'source_sha256': digest(source),
            'original_geometry': original, 'current_geometry': geometry_signature(obj),
            'normalized_vertices': normalized, 'covered_female_indices': indices,
            'components': rows, 'source_blend': str(folder / 'outfit.blend'),
            'source_blend_sha256': digest(folder / 'outfit.blend')}
    bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()))
    arm = bpy.data.objects['Armature_Catalog']; body = bpy.data.objects['body_underlayer_female']; reset(arm)
    garments = []
    for id in NAMES:
        obj = load_garment(a.output_dir / 'pieces' / id / 'outfit.blend', id, arm)
        mask(body, obj, arm, id); garments.append(obj)
    assert fixed_signatures(arm) == baseline
    camera = setup_render(); camera.data.ortho_scale = 2.10
    export_assembly(a.output_dir, arm, body, garments)
    report = {'stage': 'isolated female fitting study; no acceptance', 'foundation': str(a.foundation),
        'foundation_sha256': digest(a.foundation), 'builder_sha256': digest(__file__),
        'fixed_foundation': baseline, 'pieces': piece_rows, 'hood_offset_m': a.hood_offset, 'opening_relief_m': a.opening_relief,
        'coverage': 'recomputed on current female original indices; no imported male masks',
        'footwear_opening_z': .118, 'footwear_safety_margin_m': .004,
        'head_export': 'UV-preserving export, unchanged canonical face material/image',
        'exports': {name: digest(a.output_dir / name) for name in ['outfit.blend', 'outfit.glb', 'body.glb', 'garments.glb']}}
    (a.output_dir / 'assembly-report.json').write_text(json.dumps(report, indent=2) + '\n')
    if not a.skip_reviews:
        for label, motion, frame, pos in [('front', None, 0, (0,-3,.92)), ('side', None, 0, (3,0,.92)), ('back', None,0,(0,3,.92)), ('three-quarter', None,0,(2,-3,.92)), ('run-deep-kick','run',7.25,(2,-3,.92))]:
            reset(arm)
            if motion:
                action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
                bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
            camera.location=pos; camera.rotation_euler=(Vector((0,0,.92))-camera.location).to_track_quat('-Z','Y').to_euler()
            bpy.context.scene.render.filepath=str((a.review_dir/(label+'-review.png')).resolve()); bpy.ops.render.render(write_still=True)
    print('FEMALE_OUTFIT_ASSEMBLY', json.dumps({'pieces': list(NAMES), 'hood_offset_m': a.hood_offset, 'opening_relief_m': a.opening_relief, 'foundation_unchanged': True}))

if __name__ == '__main__': main()
