"""Isolated female T02/B01/F01 study; immutable foundation, fitted garments only."""
from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
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

def fixed_signatures(arm):
    return {'rig': rig_signature(arm), 'actions': motion_signature(), 'meshes': {
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

def hood_refit(obj, drop):
    groups = components(obj)
    rows = []
    for ids in groups:
        points = [obj.data.vertices[i].co for i in ids]
        bounds = [[min(p[a] for p in points), max(p[a] for p in points)] for a in range(3)]
        is_hood = bounds[1][0] > -.02 and bounds[2][0] > 1.20 and len(ids) > 100
        rows.append({'vertices': len(ids), 'bounds_m': bounds, 'hood': is_hood})
        if is_hood and drop:
            for i in ids:
                p = obj.data.vertices[i].co
                # Bounded rear-hanging-bag adjustment; neckline anchors stay fixed.
                factor = max(0, min(1, (p.y - .10) / .08))
                p.z -= drop * factor
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
    p.add_argument('--hood-drop', type=float, default=0)
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
        rows = hood_refit(obj, a.hood_drop) if id == 'T02' else []
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
        'fixed_foundation': baseline, 'pieces': piece_rows, 'hood_drop_m': a.hood_drop,
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
    print('FEMALE_OUTFIT_ASSEMBLY', json.dumps({'pieces': list(NAMES), 'hood_drop_m': a.hood_drop, 'foundation_unchanged': True}))

if __name__ == '__main__': main()
