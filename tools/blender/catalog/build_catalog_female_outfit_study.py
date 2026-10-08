"""Isolated female outfit study (default T02/B01/F01; --recipe for others); immutable foundation, fitted garments only."""
from __future__ import annotations
import argparse, hashlib, json, sys, re
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, setup_render
from catalog_piece import long_top_coverage, short_top_coverage
from catalog_bottom_geometry import full_trouser_coverage
from catalog_footwear_geometry import face_safe_footwear_coverage
from catalog_coverage_visibility import settle_coverage, gait_samples
from catalog_tee_underarm import arm_skin
from build_catalog_female_foundation_study import export_uv, topology_signature
from build_catalog_head_style_study import rig_signature, motion_signature, geometry_signature

NAMES = {'T01': 'T01_crew_tee', 'T02': 'T02_pullover_hoodie', 'T03': 'T03_raglan_tee', 'T04': 'T04_zip_hoodie',
         'T05': 'T05_crew_sweatshirt', 'T06': 'T06_henley', 'B01': 'B01_straight_trousers', 'B02': 'B02_joggers',
         'B04': 'B04_ivory_trousers', 'F01': 'F01_strap_sneakers', 'F02': 'F02_slip_ons', 'F03': 'F03_high_tops',
         'F04': 'F04_ankle_boots'}
# Piece kinds: coverage rule and the opening limits each kind keeps.
LONG_TOPS, SHORT_TOPS, FULL_BOTTOMS = ('T02', 'T04', 'T05', 'T06'), ('T01', 'T03'), ('B01', 'B02', 'B04')
# Footwear coverage height (the male builders' face-safe ankle cut): low tops and tall shoes.
FOOTWEAR = {'F01': .114, 'F02': .114, 'F03': .181, 'F04': .181}
DEFAULT_RECIPE = ('T02', 'B01', 'F01')
# Removed-face boundaries: tops keep the neck, hoodie wrists and tee sleeve hems; trousers keep waist and ankles.
OPENING_LIMITS = {'top_neck_z': 1.405, 'top_forearm_end': .96, 'top_sleeve_end': .45, 'B01_waist_z': .978, 'B01_ankle_z': .139}

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
        images = [{'name': re.sub(r'\.\d{3}$','',node.image.name), 'colorspace': node.image.colorspace_settings.name,
                   'packed_sha256': hashlib.sha256(node.image.packed_file.data).hexdigest()}
                  for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image]
        material_rows.append({'name': re.sub(r'\.\d{3}$','',mat.name), 'base_color': list(shader.inputs['Base Color'].default_value),
                              'roughness': shader.inputs['Roughness'].default_value,
                              'metallic': shader.inputs['Metallic'].default_value, 'images': images})
    payload = {'UV': {layer.name:[list(value.uv) for value in layer.data] for layer in head.data.uv_layers},
               'face_material_indices': [face.material_index for face in head.data.polygons], 'materials': material_rows}
    return hashlib.sha256(json.dumps(payload).encode()).hexdigest()


def fixed_signatures(arm):
    return {'rig': rig_signature(arm), 'actions': motion_signature(), 'head_UV_material_image': head_surface_signature(bpy.data.objects['H02_head']), 'hair_material': head_surface_signature(bpy.data.objects['H02_hair']), 'meshes': {
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

def fitted_parts(obj, id, arm, body, hood_offset, opening_relief, hood_lower, back_relief, back_clearance, controlled, tee_underarm=False, hood_shape=None):
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
    if id == 'T02' and back_relief:
        tree = BVHTree.FromPolygons([v.co for v in body.data.vertices], [tuple(face.vertices) for face in body.data.polygons])
        for v in obj.data.vertices:
            p = v.co
            arm_weight = sum(group.weight for group in v.groups if any(obj.vertex_groups[group.group].name.startswith(side+part) for side in ['Left','Right'] for part in ['Arm','ForeArm','Hand','Shoulder']))
            if roles.data[v.index].value != 0 or p.y <= .04 or not 1.26 < p.z < 1.42 or abs(p.x) > .15 or arm_weight > .05: continue
            point, normal, _, _ = tree.find_nearest(p)
            if normal.y <= .1: continue
            fade = max(0,min(1,(p.z-1.26)/.04)) * max(0,min(1,(1.42-p.z)/.025)) * max(0,min(1,(.15-abs(p.x))/.04))
            p.y -= min(back_relief, max(0,p.y-point.y-back_clearance)) * fade
    if id == 'T02' and hood_offset and not controlled:
        obj.data.calc_loop_triangles()
        triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if all(roles.data[i].value == 0 for i in t.vertices)]
        points = [v.co.copy() for v in obj.data.vertices]
        tree = BVHTree.FromPolygons(points, triangles, all_triangles=True)
        for v in obj.data.vertices:
            if roles.data[v.index].value != 2: continue
            seed = v.co.copy(); seed.z -= hood_lower * max(0,min(1,(seed.y-.10)/.04))
            point, normal, triangle, _ = tree.find_nearest(seed)
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
    if id == 'F01' and opening_relief and not controlled:
        # Re-seat closure/tongue on the finished upper after opening relief.
        obj.data.calc_loop_triangles()
        triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if all(roles.data[i].value == 0 for i in t.vertices)]
        points = [v.co.copy() for v in obj.data.vertices]
        tree = BVHTree.FromPolygons(points, triangles, all_triangles=True)
        for v in obj.data.vertices:
            if roles.data[v.index].value != 4: continue
            point, normal, triangle, _ = tree.find_nearest(v.co)
            # The closure lies over the instep; choose the outward/up surface.
            if normal.z < 0: normal.negate()
            offset = .0035 + (.0015 if v.normal.dot(normal) > 0 else -.0015)
            v.co = point + normal * offset
            ids = triangles[triangle]; aa,bb,cc = [points[i] for i in ids]
            if (bb-aa).cross(cc-aa).length < 1e-12: continue
            bary = barycentric_transform(point,aa,bb,cc,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
            factors=[max(0,min(1,value)) for value in bary]; total=sum(factors); weights={}
            for i,factor in zip(ids,factors):
                for group in obj.data.vertices[i].groups: weights[group.group]=weights.get(group.group,0)+group.weight*factor/total
            for i in [group.group for group in v.groups]: obj.vertex_groups[i].remove([v.index])
            for i,weight in weights.items():
                if weight>1e-7:obj.vertex_groups[i].add([v.index],weight,'REPLACE')
    if controlled and id == 'T02':
        # Pocket motion follows the actual fitted shirt surface, preserving its
        # authored rest coordinates and thickness rather than reprojecting it.
        obj.data.calc_loop_triangles()
        triangles = [tuple(t.vertices) for t in obj.data.loop_triangles if all(roles.data[i].value == 0 for i in t.vertices)]
        points = [v.co.copy() for v in obj.data.vertices]
        tree = BVHTree.FromPolygons(points, triangles, all_triangles=True)
        changed = 0
        for vertex in obj.data.vertices:
            if roles.data[vertex.index].value != 1: continue
            point, _, triangle, _ = tree.find_nearest(vertex.co)
            ids = triangles[triangle]; aa, bb, cc = [points[i] for i in ids]
            assert (bb-aa).cross(cc-aa).length > 1e-12, 'Degenerate pocket attachment triangle'
            bary = barycentric_transform(point, aa, bb, cc, Vector((1,0,0)), Vector((0,1,0)), Vector((0,0,1)))
            factors = [max(0,min(1,value)) for value in bary]; total = sum(factors)
            weights = {}
            for index, factor in zip(ids, factors):
                for weight in obj.data.vertices[index].groups:
                    weights[weight.group] = weights.get(weight.group,0) + weight.weight * factor / total
            for index in [weight.group for weight in vertex.groups]: obj.vertex_groups[index].remove([vertex.index])
            for index, weight in weights.items():
                if weight > .0001: obj.vertex_groups[index].add([vertex.index],weight,'REPLACE')
            changed += 1
        rows.append({'pocket_attachment': 'actual fitted shirt triangle weights; rest geometry unchanged', 'vertices':changed})
    if controlled and id == 'T02':
        import bmesh
        from catalog_female_hood_geometry import create_lowered_hood
        bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
        old_roles = [value.value for value in obj.data.attributes['female_detail_role'].data]
        bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if old_roles[vertex.index] == 2], context='VERTS')
        bm.to_mesh(obj.data); bm.free(); obj.data.update()
        anchors = obj.data.attributes.get('female_hood_anchor')
        if anchors is None: anchors=obj.data.attributes.new(name='female_hood_anchor',type='BOOLEAN',domain='POINT')
        for value in anchors.data:value.value=False
        hood = create_lowered_hood(obj, arm, obj.data.materials.get('A tangerine hoodie fabric'), obj.data.materials.get('A warm orange hood lining'), **(hood_shape or {}))
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);hood.select_set(True)
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()
    if controlled and id == 'F01':
        from catalog_female_sneaker_closures import replace_female_sneaker_closures
        rows.append({'fresh_closure_metadata':replace_female_sneaker_closures(obj,arm)})
    return rows


def footwear_collar_relief(obj, body, arm, clearance, start_z=.090, sectors=48):
    """Push a shoe's collar zone outward from each ankle axis until it clears the female body.

    Per side, vertices above start_z are binned by angle around the ankle (Foot bone head).
    Each angular sector moves by the largest push any of its vertices needs to sit
    `clearance` outside the body, so the shell keeps its thickness and the rim stays smooth;
    the push fades in over 15 mm above start_z. Returns the largest push per side (m).
    """
    import math
    masks = [m for m in body.modifiers if m.type == 'MASK']
    for m in masks: m.show_viewport = False
    bpy.context.view_layer.update()
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get()); mesh = evaluated.to_mesh()
    tree = BVHTree.FromPolygons([body.matrix_world @ v.co for v in mesh.vertices], [tuple(f.vertices) for f in mesh.polygons])
    evaluated.to_mesh_clear()
    for m in masks: m.show_viewport = True
    result = {}
    for prefix, sign in [('Left', 1), ('Right', -1)]:
        axis = arm.matrix_world @ arm.data.bones[prefix + 'Foot'].head_local
        zone = [v for v in obj.data.vertices if (v.co.x > 0) == (sign > 0) and v.co.z > start_z]
        def sector(v): return int((math.atan2(v.co.y - axis.y, v.co.x - axis.x) + math.pi) / (2 * math.pi) * sectors) % sectors
        need = [0.0] * sectors
        for v in zone:
            p = obj.matrix_world @ v.co
            q, n, _, d = tree.find_nearest(p)
            if q is None: continue
            radial = Vector((p.x - axis.x, p.y - axis.y, 0))
            if radial.length < 1e-6: continue
            radial.normalize()
            signed = (p - q).dot(n)  # Body normals face out: negative means inside the ankle.
            if signed < clearance:
                need[sector(v)] = max(need[sector(v)], clearance - signed)
        smooth = [max(need[(i - 1) % sectors], need[i], need[(i + 1) % sectors]) for i in range(sectors)]
        keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else []
        for v in zone:
            radial = Vector((v.co.x - axis.x, v.co.y - axis.y, 0))
            if radial.length < 1e-6: continue
            delta = radial.normalized() * smooth[sector(v)] * max(0, min(1, (v.co.z - start_z) / .015))
            v.co += delta
            for key in keys:  # Corrective targets are absolute positions: move them alike.
                key.data[v.index].co += delta
        result[prefix] = max(smooth)
    return result


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

UNDERARM_COVERAGE = {}

def mask(body, obj, arm, id, tee_underarm=False):
    if id in LONG_TOPS: ids = long_top_coverage(body, obj, arm)
    elif id in SHORT_TOPS:
        ids = short_top_coverage(body, obj, arm)
        if tee_underarm:
            # Release hidden arm skin a standard camera can see (inside and below the sleeve);
            # skin that touches the tee at rest or in the gait stays hidden as contact_T01.
            points = [body.matrix_world @ v.co for v in body.data.vertices]; faces = [tuple(f.vertices) for f in body.data.polygons]
            hidden, released, contact = settle_coverage(body, obj, arm, set(ids), arm_skin(body, faces), gait_samples())
            group = body.vertex_groups.get('contact_' + id) or body.vertex_groups.new(name='contact_' + id); group.add(sorted(contact), 1.0, 'REPLACE')
            ids = sorted(hidden); UNDERARM_COVERAGE[id] = {'released_arm_vertices': released, 'contact_vertices': len(contact)}
    elif id in FULL_BOTTOMS: ids = full_trouser_coverage(body, obj, arm)
    else: ids = face_safe_footwear_coverage(body, FOOTWEAR[id])
    if id in LONG_TOPS + SHORT_TOPS + FULL_BOTTOMS:
        def allowed(vertex):
            p = vertex.co
            if id in FULL_BOTTOMS: return .139 < p.z < .978
            if abs(p.x) < .14 and p.z >= 1.405: return False
            for prefix, sign in [('Left',1),('Right',-1)]:
                if p.x*sign <= .23: continue
                elbow=arm.data.bones[prefix+'ForeArm'].head_local;wrist=arm.data.bones[prefix+'Hand'].head_local;axis=wrist-elbow
                if (p-elbow).dot(axis)/axis.length_squared >= .96: return False
            return True
        safe = [True]*len(body.data.vertices)
        for face in body.data.polygons:
            if not all(allowed(body.data.vertices[i]) for i in face.vertices):
                for i in face.vertices:safe[i]=False
        ids = [i for i in ids if safe[i]]
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
    p.add_argument('--hood-lower', type=float, default=0)
    p.add_argument('--back-relief', type=float, default=0)
    p.add_argument('--back-clearance', type=float, default=.009)
    p.add_argument('--skip-reviews', action='store_true')
    p.add_argument('--controlled-components', action='store_true')
    p.add_argument('--recipe', default=','.join(DEFAULT_RECIPE), help='Comma-separated piece IDs, e.g. T01,B01,F01 for exact O01')
    p.add_argument('--source', action='append', default=[], help='ID=path.blend: fit a piece revision instead of the canonical master')
    p.add_argument('--collar-relief', type=float, default=0, help='Footwear other than F01: push the collar zone this far clear of the female ankle (m)')
    p.add_argument('--drop-correctives', action='append', default=[], help='Piece ID whose knee_clearance corrective keys and drivers are removed (the female runtime gates have no corrective driver)')
    p.add_argument('--hood-shape', type=json.loads, default=None, help='JSON keyword arguments for catalog_female_hood_geometry.create_lowered_hood')
    p.add_argument('--tee-underarm', action='store_true', help='T01 coverage: release arm skin inside the sleeve that a standard camera would see')
    p.add_argument('--accept-armpit-crease', action='store_true', help='Record the user-accepted T01 armpit crease edge (2026-10-08) as a known minor defect')
    a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    recipe = a.recipe.split(',')
    assert recipe and all(id in NAMES for id in recipe) and len(set(recipe)) == len(recipe), recipe
    a.output_dir.mkdir(parents=True, exist_ok=True); a.review_dir.mkdir(parents=True, exist_ok=True)
    piece_rows = {}; baseline = None
    for id in recipe:
        bpy.ops.wm.open_mainfile(filepath=str(a.foundation.resolve()))
        bpy.context.preferences.filepaths.save_version = 0
        arm = bpy.data.objects['Armature_Catalog']; body = bpy.data.objects['body_underlayer_female']; reset(arm)
        current = fixed_signatures(arm)
        if baseline is None: baseline = current
        assert current == baseline
        overrides = dict(item.split('=', 1) for item in a.source)
        source = Path(overrides[id]) if id in overrides else a.catalog_dir / id / (id + '.blend')
        obj = load_garment(source, id, arm); original = geometry_signature(obj)
        rows = fitted_parts(obj, id, arm, body, a.hood_offset, a.opening_relief, a.hood_lower, a.back_relief, a.back_clearance, a.controlled_components, a.tee_underarm, a.hood_shape)
        if id in a.drop_correctives and obj.data.shape_keys:
            keys = obj.data.shape_keys
            if keys.animation_data:
                for driver in list(keys.animation_data.drivers):
                    keys.driver_remove(driver.data_path, driver.array_index)
            dropped = [k.name for k in keys.key_blocks if k.name.startswith('knee_clearance_')]
            for name in dropped:
                obj.shape_key_remove(keys.key_blocks[name])
            if obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) == 1:
                obj.shape_key_remove(obj.data.shape_keys.key_blocks[0])
            rows.append({'dropped_correctives': dropped})
        if a.collar_relief and id in FOOTWEAR and id != 'F01':
            rows.append({'collar_relief_m': footwear_collar_relief(obj, body, arm, a.collar_relief)})
        normalized = normalize_garment(obj)
        indices = mask(body, obj, arm, id, a.tee_underarm)
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
    for id in recipe:
        obj = load_garment(a.output_dir / 'pieces' / id / 'outfit.blend', id, arm)
        mask(body, obj, arm, id, a.tee_underarm); garments.append(obj)
    assert fixed_signatures(arm) == baseline
    camera = setup_render(); camera.data.ortho_scale = 2.10
    export_assembly(a.output_dir, arm, body, garments)
    report = {'stage': 'isolated female fitting study; no acceptance', 'recipe': recipe, 'foundation': str(a.foundation),
        'foundation_sha256': digest(a.foundation), 'builder_sha256': digest(__file__),
        'fixed_foundation': baseline, 'pieces': piece_rows, 'hood_offset_m': a.hood_offset, 'opening_relief_m': a.opening_relief, 'hood_lower_m': a.hood_lower, 'back_relief_m': a.back_relief, 'back_clearance_m': a.back_clearance,
        'coverage': 'recomputed on current female original indices; no imported male masks',
        'opening_limits': OPENING_LIMITS,
        'footwear_opening_z': .118, 'footwear_safety_margin_m': .004,
        'footwear_openings_z': {id: FOOTWEAR[id] + .004 for id in recipe if id in FOOTWEAR},
        'head_export': 'UV-preserving export, unchanged canonical face material/image',
        'collar_relief_m':a.collar_relief,'dropped_correctives':a.drop_correctives,'controlled_components':a.controlled_components, 'tee_underarm':a.tee_underarm, 'hood_shape':a.hood_shape, 'underarm_coverage':UNDERARM_COVERAGE, 'accepted_visibility_exemptions':[{'piece':id,'region':'contact_'+id,'decision':'User accepted 2026-10-08: the cut edge of arm skin that touches the tee (at rest or in the gait) is a known minor defect; the A-pose arm presses against the torso.'} for id in recipe if id in SHORT_TOPS] if a.accept_armpit_crease else [], 'component_helpers':{name:digest(Path(__file__).with_name(name)) for name in ['catalog_female_hood_geometry.py','catalog_female_sneaker_closures.py',*(['catalog_coverage_visibility.py','catalog_tee_underarm.py'] if a.tee_underarm else [])]} if a.controlled_components else {},
        'exports': {name: digest(a.output_dir / name) for name in ['outfit.blend', 'outfit.glb', 'body.glb', 'garments.glb']}}
    (a.output_dir / 'assembly-report.json').write_text(json.dumps(report, indent=2) + '\n')
    if not a.skip_reviews:
        for label, motion, frame, pos in [('front', None, 0, (0,-3,.92)), ('side', None, 0, (3,0,.92)), ('back', None,0,(0,3,.92)), ('three-quarter', None,0,(2,-3,.92)), ('run-deep-kick','run',7.25,(2,-3,.92)), ('hood-back',None,0,(0,3,1.34)), ('hood-side',None,0,(3,0,1.34)), ('shoes-front',None,0,(0,-3,.13)), ('shoes-side',None,0,(3,0,.13))]:
            reset(arm)
            if motion:
                action = bpy.data.actions[motion]; arm.animation_data.action = action; arm.animation_data.action_slot = action.slots[0]
                bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
            target = Vector((0,.10,1.34)) if label.startswith('hood') else Vector((0,0,.13)) if label.startswith('shoes') else Vector((0,0,.92))
            camera.data.ortho_scale = .55 if label.startswith('hood') else .52 if label.startswith('shoes') else 2.10
            camera.location=pos; camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
            bpy.context.scene.render.filepath=str((a.review_dir/(label+'-review.png')).resolve()); bpy.ops.render.render(write_still=True)
    print('FEMALE_OUTFIT_ASSEMBLY', json.dumps({'pieces': recipe, 'hood_offset_m': a.hood_offset, 'opening_relief_m': a.opening_relief, 'hood_lower_m': a.hood_lower, 'back_relief_m': a.back_relief, 'back_clearance_m': a.back_clearance, 'foundation_unchanged': True}))

if __name__ == '__main__': main()
