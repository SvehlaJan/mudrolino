"""Shared Blender machinery for headwear fitted to measured head envelopes.

A headwear builder supplies its design dict and a `build_parts(env, mats)`
callback; `build_headwear_study` opens a verified head study, adds the
`under_<ID>` hair key, samples the worn envelope, binds the parts rigidly to
Head, saves, exports, renders and writes a source-bound study report.
Pure rules live in catalog_headwear_plan.py.
"""
import hashlib
import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from build_catalog_t01 import reset, setup_render, world_mesh
from build_catalog_head import material
from build_catalog_head_style_study import geometry_signature, rig_signature, motion_signature
from build_catalog_female_foundation_study import export_uv
from catalog_headwear_plan import band_heights, band_height, under_hat_radius, smoothstep

ROOT = Path('assets/avatar/catalog-a')
HEADS = {
    'male': {'study': ROOT / 'H01/style-revisions/painted-face-scale-130', 'blend': 'H01.blend',
             'skull': ('H01_head', 'face_surface'), 'hair': ('H01_head', 'hair'),
             'body': 'body_underlayer_male', 'head_objects': ['H01_head']},
    'female': {'study': ROOT / 'female/foundation/studies/h02-scale-130', 'blend': 'female-foundation.blend',
               'skull': ('H02_head', None), 'hair': ('H02_hair', None),
               'body': 'body_underlayer_female', 'head_objects': ['H02_head', 'H02_hair']},
}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def material_slots(obj, keyword):
    return {i for i, m in enumerate(obj.data.materials) if m and (keyword is None or keyword in m.name.lower())}


def polygon_tree(obj, keyword):
    points, faces = world_mesh(obj)
    slots = material_slots(obj, keyword)
    return BVHTree.FromPolygons(points, [f for f, p in zip(faces, obj.data.polygons) if p.material_index in slots])


def direction(theta, elevation):
    return Vector((math.cos(elevation) * math.cos(theta), math.cos(elevation) * math.sin(theta), math.sin(elevation)))


class Envelope:
    """Skull radius field, worn-hair envelope field and band for one head.

    The envelope is the outer surface of the skull plus flattened hair, sampled
    on a regular (azimuth, elevation) grid, dilated by one sample so hair edges
    stay covered, smoothed from above (s = max(raw, blur(s))) and blended back to
    the true surface within `band_hug` of the band so the band hugs the head.
    `ease(theta, t)` is the design's clearance over that envelope.
    """

    GRID = (256, 120)
    ELEVATION = (-.9, math.pi / 2)

    def __init__(self, skull, centre, band, scale, ease, band_hug):
        self.skull, self.centre, self.band, self.scale = skull, Vector(centre), band, scale
        self.ease, self.band_hug = ease, band_hug
        self.field = None

    def skull_radius(self, d):
        hit = self.skull.ray_cast(self.centre, d, 1.0)[0]
        if hit is None:
            raise RuntimeError(f'Skull ray missed along {tuple(d)}')
        return (hit - self.centre).length

    def band_z(self, theta):
        return band_height(theta, self.band['front'], self.band['side'], self.band['back'])

    def sample_envelope(self, worn):
        n, m = self.GRID
        low, high = self.ELEVATION
        raw = []
        for j in range(m):
            elevation = low + (high - low) * j / (m - 1)
            row = []
            for i in range(n):
                d = direction(2 * math.pi * i / n - math.pi, elevation)
                hit = worn.ray_cast(self.centre + d, -d, 1.0)[0]
                row.append((hit - self.centre).length if hit is not None else self.skull_radius(d))
            raw.append(row)
        raw = [[max(raw[min(m - 1, max(0, j + dj))][(i + di) % n] for dj in (-1, 0, 1) for di in (-1, 0, 1))
                for i in range(n)] for j in range(m)]
        field = [row[:] for row in raw]
        for _ in range(8):
            blurred = [[sum(field[min(m - 1, max(0, j + dj))][(i + di) % n] for dj in (-1, 0, 1) for di in (-1, 0, 1)) / 9
                        for i in range(n)] for j in range(m)]
            field = [[max(raw[j][i], blurred[j][i]) for i in range(n)] for j in range(m)]
        hug = self.band_hug * self.scale
        for j in range(m):
            elevation = low + (high - low) * j / (m - 1)
            for i in range(n):
                theta = 2 * math.pi * i / n - math.pi
                z = (self.centre + direction(theta, elevation) * raw[j][i]).z
                weight = smoothstep((z - self.band_z(theta)) / hug)
                field[j][i] = raw[j][i] + (field[j][i] - raw[j][i]) * weight
        self.field = field

    def envelope_radius(self, theta, elevation):
        n, m = self.GRID
        low, high = self.ELEVATION
        x = ((theta + math.pi) / (2 * math.pi) * n) % n
        y = min(m - 1.0, max(0.0, (elevation - low) / (high - low) * (m - 1)))
        i0, j0 = int(x), int(y)
        fx, fy = x - i0, y - j0
        i1, j1 = (i0 + 1) % n, min(m - 1, j0 + 1)
        f = self.field
        return (f[j0][i0] * (1 - fx) + f[j0][i1] * fx) * (1 - fy) + (f[j1][i0] * (1 - fx) + f[j1][i1] * fx) * fy

    def radius(self, theta, elevation, t, extra=0.0):
        return self.envelope_radius(theta, elevation) + self.ease(theta, t) + extra

    def point(self, theta, elevation, t, extra=0.0):
        return self.centre + direction(theta, elevation) * self.radius(theta, elevation, t, extra)

    def band_elevation(self, theta, above=0.0):
        """Elevation at which the crown surface reaches the band height plus `above` (bisection)."""
        low, high, target = -.7, 1.45, self.band_z(theta) + above
        for _ in range(40):
            mid = (low + high) / 2
            if self.point(theta, mid, 0).z < target:
                low = mid
            else:
                high = mid
        return (low + high) / 2

    def elevation(self, theta, t, top, above=0.0):
        start = self.band_elevation(theta, above)
        return start + (top - start) * t


def mesh_object(name, vertices, faces, materials):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for mat in materials:
        mesh.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def grid_faces(rows, cols, wrap=False):
    faces = []
    for row in range(rows - 1):
        for col in range(cols if wrap else cols - 1):
            nxt = (col + 1) % cols
            faces.append((row * cols + col, row * cols + nxt, (row + 1) * cols + nxt, (row + 1) * cols + col))
    return faces


def orient_outward(obj, centre, outward=True):
    """Make an open surface's normals point away from (or toward) the centre."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    score = sum(f.normal.dot(f.calc_center_median() - centre) for f in bm.faces)
    if (score < 0) == outward:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()


def solidify(obj, thickness, offset, material_offset=0):
    modifier = obj.modifiers.new('Fabric thickness', 'SOLIDIFY')
    modifier.thickness, modifier.offset, modifier.material_offset = thickness, offset, material_offset
    modifier.use_even_offset = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def measured_ear_top(skull_obj, landmarks):
    """Highest ear point on heads with modelled ears; otherwise the landmark estimate."""
    if not any(m and 'ear' in m.name.lower() for m in skull_obj.data.materials):
        return landmarks['ear_top_z']
    centre = landmarks['skull_centre']
    skip = {i for i, m in enumerate(skull_obj.data.materials) if m and ('face_surface' in m.name or 'hair' in m.name.lower())}
    points, faces = world_mesh(skull_obj)
    return max(points[v].z for f, p in zip(faces, skull_obj.data.polygons) if p.material_index not in skip
               for v in f if abs(points[v].x - centre[0]) > .12 * landmarks['scale'])


def worn_tree(skull_obj, skull_keyword, hair_obj, hair_keyword):
    """Skull plus flattened hair (its under-key active); ears and nose excluded."""
    points, faces = [], []
    for obj, keyword in ((skull_obj, skull_keyword), (hair_obj, hair_keyword)):
        p, f = world_mesh(obj)
        slots = material_slots(obj, keyword)
        faces += [tuple(len(points) + v for v in face) for face, poly in zip(f, obj.data.polygons) if poly.material_index in slots]
        points += p
    return BVHTree.FromPolygons(points, faces)


def add_under_key(hair_obj, keyword, env, design, key_name):
    """Shape key flattening hair inside and just below the band; returns the changed count.

    design: hair_layer, tuck, release and optional brim_tuck/brim_half_angle,
    which tuck hair deeper beneath a front brim.
    """
    if hair_obj.data.shape_keys is None:
        hair_obj.shape_key_add(name='Basis', from_mix=False)
    key = hair_obj.shape_key_add(name=key_name, from_mix=False)
    slots = material_slots(hair_obj, keyword)
    hair_vertices = {v for p in hair_obj.data.polygons if p.material_index in slots for v in p.vertices}
    inverse = hair_obj.matrix_world.inverted()
    changed = 0
    for i in hair_vertices:
        world = hair_obj.matrix_world @ hair_obj.data.vertices[i].co
        offset = world - env.centre
        radius = offset.length
        d = offset / radius
        theta = math.atan2(d.y, d.x)
        tuck = design['tuck']
        if design.get('brim_tuck'):
            from_front = abs(math.atan2(math.sin(theta + math.pi / 2), math.cos(theta + math.pi / 2)))
            tuck += design['brim_tuck'] * smoothstep((design['brim_half_angle'] + .1 - from_front) / .25)
        new_radius = under_hat_radius(radius, env.skull_radius(d), env.band_z(theta) - world.z,
                                      design['hair_layer'], tuck * env.scale, design['release'] * env.scale)
        if new_radius < radius - 1e-7:
            key.data[i].co = inverse @ (env.centre + d * new_radius)
            changed += 1
    key.value = 1.0
    return changed


def render_reviews(output_dir, target):
    camera = setup_render()
    reviews = {}
    for label, offset, ortho, aim in [('front-full', (0, -4, 0), 2.4, Vector((0, 0, 1.0))),
                                      ('front', (0, -3, 0), .66, target), ('side', (-3, 0, 0), .66, target),
                                      ('three-quarter', (-2.1, -2.1, .2), .66, target), ('back', (0, 3, 0), .66, target),
                                      ('back-three-quarter', (2.1, 2.1, .25), .66, target)]:
        camera.data.ortho_scale = ortho
        camera.location = aim + Vector(offset)
        camera.rotation_euler = (aim - camera.location).to_track_quat('-Z', 'Y').to_euler()
        path = output_dir / f'{label}-review.png'
        bpy.context.scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        reviews[label] = str(path)
    return reviews


def build_headwear_study(item_id, object_name, design, build_parts, base, output_dir, builder_path, crown_materials):
    """Open the verified head study, fit the design and write every output plus the study report."""
    config = HEADS[base]
    output_dir.mkdir(parents=True, exist_ok=True)
    source = config['study'] / config['blend']
    landmarks = json.loads((config['study'] / 'head-landmarks.json').read_text())
    if json.loads((config['study'] / 'verification-report.json').read_text())['status'] != 'passed':
        raise RuntimeError('Fit headwear only to a verified head study')
    source_hashes = {str(p): digest(p) for p in (source, config['study'] / 'head-landmarks.json', config['study'] / 'verification-report.json')}

    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.preferences.filepaths.save_version = 0
    arm = bpy.data.objects['Armature_Catalog']
    reset(arm)
    rig_before, motion_before = rig_signature(arm), motion_signature()
    unchanged = {o.name: geometry_signature(o) for o in bpy.data.objects if o.type == 'MESH'}
    skull_obj, hair_obj = bpy.data.objects[config['skull'][0]], bpy.data.objects[config['hair'][0]]

    landmarks = dict(landmarks, ear_top_z=max(landmarks['ear_top_z'], measured_ear_top(skull_obj, landmarks)))
    band = band_heights(landmarks, design['front_above_brow'], design['side_above_ear'], design['back_above_centre'],
                        design['front_rise_over_side'])
    env = Envelope(polygon_tree(skull_obj, config['skull'][1]), landmarks['skull_centre'], band, landmarks['scale'],
                   design['ease_fn'](landmarks['scale']), design['band_hug'])
    key_name = f'under_{item_id}'
    changed = add_under_key(hair_obj, config['hair'][1], env, design, key_name)
    env.sample_envelope(worn_tree(skull_obj, config['skull'][1], hair_obj, config['hair'][1]))
    assert all(geometry_signature(bpy.data.objects[n]) == s for n, s in unchanged.items()), 'Basis geometry changed'

    mats = {name: material(f'{item_id} {name}', color) for name, color in design['colors'].items()}
    parts, extra = build_parts(env, mats)
    for obj in parts:
        for bone in arm.data.bones:
            obj.vertex_groups.new(name=bone.name)
        obj.vertex_groups['Head'].add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    item = bpy.context.object
    item.name = item.data.name = object_name
    for group in [g for g in item.vertex_groups if g.name != 'Head']:
        item.vertex_groups.remove(group)
    for layer in list(item.data.uv_layers):  # Untextured; avoid unused TEXCOORD exports.
        item.data.uv_layers.remove(layer)
    item.modifiers.new('Head attachment', 'ARMATURE').object = arm
    world = item.matrix_world.copy()
    item.parent = arm
    item.matrix_world = world
    assert rig_signature(arm) == rig_before and motion_signature() == motion_before, 'Headwear build changed the rig or gaits'

    blend_out = output_dir / f'{item_id}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out.resolve()))
    heads = [bpy.data.objects[n] for n in config['head_objects']]
    body = bpy.data.objects[config['body']]
    export_uv(output_dir / f'{item_id}.glb', [arm, item])
    export_uv(output_dir / 'head-under-hat.glb', [arm, *heads])
    if base == 'male':
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        masked = bpy.data.objects.new('outfit_masked_body', bpy.data.meshes.new_from_object(evaluated))
        bpy.context.collection.objects.link(masked)
        masked.modifiers.new('Shared body skin', 'ARMATURE').object = arm
        masked.parent = arm
        garments = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_outfit')]
        export_uv(output_dir / 'outfit.glb', [arm, masked, *heads, *garments, item])
        bpy.data.objects.remove(masked, do_unlink=True)
        recipe = f'T05/B01/F04 + {item_id} review assembly'
    else:
        export_uv(output_dir / 'outfit.glb', [arm, body, *heads, item])
        recipe = f'unclothed female foundation + {item_id} (T02 hood refit pending at this head scale)'
    reset(arm)
    reviews = render_reviews(output_dir, env.centre + Vector((0, -.02, .02)))

    here = Path(__file__)
    report = {
        'stage': f'Envelope-fitted {item_id} revision; run verify_catalog_headwear.py for fit/motion gates. Art review pending.',
        'item': item_id, 'object': object_name, 'crown_materials': [f'{item_id} {m}' for m in crown_materials],
        'base': base, 'head_study': str(config['study']), 'source_hashes': source_hashes,
        'builder': str(builder_path), 'builder_sha256': digest(builder_path),
        'geometry_sha256': digest(here), 'plan_sha256': digest(here.with_name('catalog_headwear_plan.py')),
        'blender': bpy.app.version_string,
        'design': {k: v for k, v in design.items() if not callable(v)},
        'band_heights_m': band, 'landmarks': landmarks, **extra,
        'under_hat': {'object': hair_obj.name, 'key': key_name, 'changed_vertices': changed},
        'mesh': {'vertices': len(item.data.vertices), 'polygons': len(item.data.polygons), 'attachment': 'Head, weight 1'},
        'recipe': recipe, 'baseline': {'rig': rig_before, 'motion': motion_before, 'unchanged_basis_geometry': unchanged},
        'blend': {str(blend_out): digest(blend_out)},
        'exports': {name: digest(output_dir / name) for name in (f'{item_id}.glb', 'head-under-hat.glb', 'outfit.glb')},
        'reviews': reviews,
    }
    (output_dir / 'study-report.json').write_text(json.dumps(report, indent=2) + '\n')
    return report
