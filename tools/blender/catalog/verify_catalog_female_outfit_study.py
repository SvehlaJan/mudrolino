"""Source-bound isolated female outfit fitting, fixed-foundation and export gates."""
from __future__ import annotations
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy
from mathutils import Quaternion
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog_t01 import reset, bvh, world_mesh
from mathutils.bvhtree import BVHTree
from build_catalog_female_outfit_study import fixed_signatures, NAMES, DEFAULT_RECIPE, positions_signature, skin_signature, head_surface_signature, components, LONG_TOPS, SHORT_TOPS, FULL_BOTTOMS, FOOTWEAR
from build_catalog_head_style_study import geometry_signature, rig_signature
from build_catalog_female_foundation_study import topology_signature
from prepare_catalog_body import action_curves
from catalog_gltf_gait_pose import RuntimeGaitPose
from verify_catalog_female_foundation_study import digest, read_glb, roundtrip_error, uv_corner_rows, uv_corner_identity
from catalog_coverage_visibility import visible_hidden_faces


LEG_FOLD = lambda bone: bone.endswith(('Leg', 'Foot', 'ToeBase')) and not bone.endswith('UpLeg')


def face_dominant_bones(obj, arm):
    """Dominant bone per evaluated face (masked bodies drop faces; topology is pose-independent)."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    names = {g.index: g.name for g in obj.vertex_groups}
    bones = {b.name for b in arm.data.bones}
    out = []
    for poly in mesh.polygons:
        weights = {}
        for i in poly.vertices:
            for g in mesh.vertices[i].groups:
                name = names.get(g.group)
                if name in bones:
                    weights[name] = weights.get(name, 0) + g.weight
        out.append(max(weights, key=weights.get) if weights else '')
    evaluated.to_mesh_clear()
    return out


def drive_imported_correctives(mapping):
    """Copy evaluated knee_clearance corrective values from each source onto its imported copy.

    The GLB carries morph targets but not Blender's drivers; the runtime drives them from
    the same knee angles. Returns {source name: {key: value}} for the sample record.
    """
    values = {}
    for source, target in mapping.items():
        keys = source.data.shape_keys
        if not keys or not any(k.name.startswith('knee_clearance_') for k in keys.key_blocks):
            continue
        assert target.data.shape_keys, f'{target.name}: exported correctives missing'
        row = {}
        for key in keys.key_blocks:
            if key.name.startswith('knee_clearance_'):
                target.data.shape_keys.key_blocks[key.name].value = key.value
                row[key.name] = key.value
        values[source.name] = row
    bpy.context.view_layer.update()
    return values

def fitting_mesh_signature(obj):
    payload={'geometry':geometry_signature(obj),'matrix_world':[list(row) for row in obj.matrix_world], 'matrix_parent_inverse':[list(row) for row in obj.matrix_parent_inverse], 'hide_viewport':obj.hide_viewport,'hide_render':obj.hide_render, 'surface_material_UV':head_surface_signature(obj), 'modifiers':[{'name':modifier.name,'type':modifier.type,'show_viewport':modifier.show_viewport,'show_render':modifier.show_render, 'binding_rig':rig_signature(modifier.object) if modifier.type=='ARMATURE' and modifier.object else None,'preserve_volume':getattr(modifier,'use_deform_preserve_volume',None),'vertex_groups':getattr(modifier,'use_vertex_groups',None),'bone_envelopes':getattr(modifier,'use_bone_envelopes',None),'vertex_group':getattr(modifier,'vertex_group',None),'invert_vertex_group':getattr(modifier,'invert_vertex_group',None)} for modifier in obj.modifiers], 'groups':[group.name for group in obj.vertex_groups],
        'attributes':{name:[value.value for value in obj.data.attributes[name].data] for name in ['female_detail_role','female_hood_anchor']},
        'shape_keys':[(key.name,[list(point.co) for point in key.data]) for key in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else [],
        'drivers':[]}
    if obj.data.shape_keys and obj.data.shape_keys.animation_data:
        payload['drivers']=[{'path':driver.data_path,'index':driver.array_index,'expression':driver.driver.expression,
            'variables':[(variable.name,variable.type,[getattr(target.id,'type',None) for target in variable.targets]) for variable in driver.driver.variables]} for driver in obj.data.shape_keys.animation_data.drivers]
    return hashlib.sha256(json.dumps(payload).encode()).hexdigest()


def motion_signature_for(actions):
    data={name:[(curve.data_path,curve.array_index,[(list(point.co),list(point.handle_left),list(point.handle_right),point.interpolation) for point in curve.keyframe_points]) for curve in action_curves(action)] for name,action in zip(['walk','run'],actions)}
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--study-dir',type=Path,required=True);p.add_argument('--probe',action='store_true')
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);folder=a.study_dir
    blend=folder/'outfit.blend';glb=folder/'outfit.glb';assembly=json.loads((folder/'assembly-report.json').read_text())
    gate_helpers={str(path.resolve()):digest(path) for path in sorted(Path(__file__).parent.glob('*.py'))}
    report={'gate_helper_hashes':gate_helpers,'stage':'isolated female fitting candidate; not accepted','blend':str(blend),'blend_sha256':digest(blend),'glb':str(glb),'glb_sha256':digest(glb),'verifier_sha256':digest(__file__),'profile':'diagnostic probe' if a.probe else 'complete sampled fit/export','status':'running','failures':[]}
    def check(condition,label,details=None):
        if not condition: report['failures'].append({'gate':label,'details':details})
    try:
        bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()));arm=bpy.data.objects['Armature_Catalog'];reset(arm)
        body=bpy.data.objects['body_underlayer_female'];head=bpy.data.objects['H02_head'];hair=bpy.data.objects['H02_hair']
        recipe=assembly.get('recipe',list(DEFAULT_RECIPE));top=next((id for id in recipe if id.startswith('T')),None)
        garments={id:bpy.data.objects[NAMES[id]] for id in recipe};bodies=[body,head,hair]
        check(digest(assembly['foundation'])==assembly['foundation_sha256'],'fixed_foundation_file_unchanged')
        check(digest(Path(__file__).with_name('build_catalog_female_outfit_study.py'))==assembly['builder_sha256'],'saved_builder_current')
        for name,expected in assembly.get('component_helpers',{}).items():check(digest(Path(__file__).with_name(name))==expected,'saved_component_helper_current',name)
        check(fixed_signatures(arm)==assembly['fixed_foundation'],'fixed_geometry_topology_skin_rig_actions_unchanged')
        attribute=body.data.attributes['female_original_vertex_index'];check(all(v.value==i for i,v in enumerate(attribute.data)),'body_original_vertex_indices')
        masks=[m for m in body.modifiers if m.type=='MASK']
        for id,row in assembly['pieces'].items():
            check(digest(row['source'])==row['source_sha256'],'canonical_male_piece_unchanged',id)
            for v in garments[id].data.vertices:
                check(len(v.groups)<=4 and abs(sum(w.weight for w in v.groups)-1)<1e-6,'garment_skin_normalized',id)
        independent=[]
        for id,row in assembly['pieces'].items():
            source=Path(row['source_blend']);check(digest(source)==row['source_blend_sha256'],'independent_piece_source_current',id)
            before=set(bpy.data.objects);before_actions=set(bpy.data.actions)
            required=[NAMES[id],'body_underlayer_female','H02_head','H02_hair','Armature_Catalog']
            with bpy.data.libraries.load(str(source.resolve()),link=False) as (library,data):
                assert all(name in library.objects for name in required)
                data.objects=required;data.actions=['walk','run']
            piece,source_body,source_head,source_hair,source_rig=data.objects
            equivalent=fitting_mesh_signature(piece)==fitting_mesh_signature(garments[id])
            check(equivalent,'independent_master_assembled_mesh_equivalence',id)
            check(rig_signature(source_rig)==assembly['fixed_foundation']['rig'] and motion_signature_for(data.actions)==assembly['fixed_foundation']['actions'],'independent_master_rig_actions_preserved',id)
            for name,obj in [('body_underlayer_female',source_body),('H02_head',source_head),('H02_hair',source_hair)]:
                signature={'positions':positions_signature(obj),'topology':topology_signature(obj),'skin':skin_signature(obj,source_rig)}
                check(signature==assembly['fixed_foundation']['meshes'][name],'independent_master_fixed_mesh_preserved',{'piece':id,'mesh':name})
            check(head_surface_signature(source_head)==assembly['fixed_foundation']['head_UV_material_image'] and head_surface_signature(source_hair)==assembly['fixed_foundation']['hair_material'],'independent_master_head_hair_material_UV_preserved',id)
            group=source_body.vertex_groups['covered_'+id]
            covered=[v.index for v in source_body.data.vertices if any(w.group==group.index and w.weight>.5 for w in v.groups)]
            check(covered==row['covered_female_indices'],'independent_master_mask_indices_current',id)
            source_mask=next(m for m in source_body.modifiers if m.type=='MASK' and m.vertex_group==group.name)
            check(source_mask.invert_vertex_group and source_mask.show_viewport and source_mask.show_render,'independent_master_mask_active',id)
            armature_modifiers=[m for m in piece.modifiers if m.type=='ARMATURE']
            check(len(armature_modifiers)==1 and all(m.object==source_rig and m.show_viewport and m.show_render for m in armature_modifiers) and len(piece.modifiers)==1 and piece.parent==source_rig,'independent_master_active_skin_binding',id)
            if piece.data.shape_keys and piece.data.shape_keys.animation_data:
                check(all(target.id==source_rig for driver in piece.data.shape_keys.animation_data.drivers for variable in driver.driver.variables for target in variable.targets if target.id and getattr(target.id,'type',None)=='ARMATURE'),'independent_master_driver_binding',id)
            independent.append({'piece':id,'source':str(source),'sha256':digest(source),'mesh_geometry_skin_keys_roles_equivalent':equivalent,'sweep_policy':'Verified exact master/evaluated-assembly equivalence; activate only this master coverage during independent sweep.'})
            for obj in list(bpy.data.objects):
                if obj not in before:bpy.data.objects.remove(obj,do_unlink=True)
            for action in list(bpy.data.actions):
                if action not in before_actions:bpy.data.actions.remove(action)
        dependencies = [folder/'assembly-report.json', Path(assembly['foundation']), Path(__file__).with_name('build_catalog_female_outfit_study.py'), Path(__file__).with_name('catalog_gltf_gait_pose.py')]
        dependencies += [Path(__file__).with_name(name) for name in assembly.get('component_helpers',{})]
        dependencies += [Path(row[key]) for row in assembly['pieces'].values() for key in ['source','source_blend']]
        dependencies += [folder/name for name in ['body.glb','garments.glb']]
        gaits = {motion:Path('assets/avatar/catalog-a/foundation/catalog-body-'+motion+'.glb') for motion in ['walk','run']}
        dependencies += list(gaits.values())+[Path(assembly['foundation']).parent/'sample-face.png']
        report['dependency_hashes'] = {str(path.resolve()):digest(path) for path in dependencies}
        report['dependency_hashes'].update(gate_helpers)
        report['independent_source_equivalence']=independent
        topology_rows=[];closure_components=[]
        for id,role,expected in [(id,role,expected) for id,role,expected in [('T02',2,1),('T04',2,1),('F01',4,4)] if id in garments]:
            obj=garments[id];attribute=obj.data.attributes['female_detail_role']
            groups=[ids for ids in components(obj) if ids and all(attribute.data[i].value==role for i in ids)]
            check(len(groups)==expected,'controlled_component_count',{'piece':id,'role':role,'components':len(groups),'expected':expected})
            for index,ids in enumerate(groups):
                selected=set(ids);faces=[tuple(face.vertices) for face in obj.data.polygons if all(i in selected for i in face.vertices)]
                incidence={}
                for face in faces:
                    for i,left in enumerate(face):
                        edge=tuple(sorted((left,face[(i+1)%len(face)])));incidence[edge]=incidence.get(edge,0)+1
                degenerate=sum(face.area<=1e-12 for face in obj.data.polygons if all(i in selected for i in face.vertices))
                wrong_weights=sum(any((obj.vertex_groups[group.group].name.startswith('Right') if obj.data.vertices[i].co.x>0 else obj.vertex_groups[group.group].name.startswith('Left')) and group.weight>1e-7 for group in obj.data.vertices[i].groups) for i in ids) if id=='F01' else 0
                row={'piece':id,'role':role,'component':index,'vertices':len(ids),'faces':len(faces),'nonmanifold_edges':sum(count!=2 for count in incidence.values()),'degenerate_faces':degenerate,'opposite_side_weight_vertices':wrong_weights}
                topology_rows.append(row);check(row['nonmanifold_edges']==0 and degenerate==0 and wrong_weights==0,'controlled_component_topology',row)
                if id=='F01':closure_components.append(faces)
        report['controlled_component_topology']=topology_rows
        driver_ids = []
        side_keys = []
        for id, obj in garments.items():
            if obj.data.shape_keys:
                keys = obj.data.shape_keys.key_blocks
                for key in keys:
                    suffix = key.name.rsplit('knee_clearance_',1)[-1]
                    if suffix not in ['Left','Right']: continue
                    sign = 1 if suffix == 'Left' else -1
                    moved = sum((point.co-basis.co).length > 1e-7 for point,basis in zip(key.data,keys['Basis'].data) if basis.co.x*sign < -.04)
                    side_keys.append({'piece':id,'key':key.name,'opposite_vertices_moved':moved})
                    check(moved == 0,'bilateral_corrective_isolation',side_keys[-1])
                if obj.data.shape_keys.animation_data:
                    for driver in obj.data.shape_keys.animation_data.drivers:
                        for variable in driver.driver.variables:
                            for target in variable.targets:
                                if target.id and getattr(target.id,'type',None)=='ARMATURE':
                                    driver_ids.append({'piece':id,'target':target.id.name,'fixed_armature':target.id==arm})
                                    check(target.id==arm,'driver_uses_fixed_female_armature',driver_ids[-1])
        report['corrective_sides']={'keys':side_keys,'drivers':driver_ids,'scope':'No targets is an explicit not-applicable result, not corrective fitting proof.'}
        # Opening anatomy is measured on actual removed faces, including those
        # deleted when only one incident vertex belongs to the active mask.
        report['opening_anatomy']={}
        for shoe in [id for id in garments if id in FOOTWEAR]:
            group=body.vertex_groups['covered_'+shoe];ids={v.index for v in body.data.vertices if any(w.group==group.index and w.weight>.5 for w in v.groups)}
            removed=[f for f in body.data.polygons if any(i in ids for i in f.vertices)]
            opening=assembly.get('footwear_openings_z',{}).get(shoe,assembly['footwear_opening_z'])
            cutoff=opening-assembly['footwear_safety_margin_m']
            above=[f.index for f in removed if max(body.data.vertices[i].co.z for i in f.vertices)>=cutoff]
            report['opening_anatomy'][shoe]={'removed_faces':len(removed),'covered_vertices':len(ids),'opening_z':opening,'safety_margin_m':assembly['footwear_safety_margin_m'],'maximum_removed_face_z':max((body.data.vertices[i].co.z for f in removed for i in f.vertices),default=None)}
            check(bool(removed) and not above,shoe+'_face_safe_opening',report['opening_anatomy'][shoe])
        opening_limits=dict(assembly.get('opening_limits',{'T02_neck_z':1.405,'T02_forearm_end':.96,'B01_waist_z':.978,'B01_ankle_z':.139}))
        # Older reports name the hoodie limits; newer ones use generic top limits.
        opening_limits.setdefault('top_neck_z',opening_limits.get('T02_neck_z'));opening_limits.setdefault('top_forearm_end',opening_limits.get('T02_forearm_end'))
        other_openings={}
        for id in [id for id in garments if id in LONG_TOPS+SHORT_TOPS+FULL_BOTTOMS]:
            group=body.vertex_groups['covered_'+id];covered={v.index for v in body.data.vertices if any(w.group==group.index and w.weight>.5 for w in v.groups)}
            removed=[face for face in body.data.polygons if any(i in covered for i in face.vertices)];violations=[]
            for face in removed:
                for i in face.vertices:
                    point=body.data.vertices[i].co
                    if id in FULL_BOTTOMS:
                        if not opening_limits['B01_ankle_z']<point.z<opening_limits['B01_waist_z']:violations.append(face.index);break
                    else:
                        if abs(point.x)<.14 and point.z>=opening_limits['top_neck_z']:violations.append(face.index);break
                        for prefix,sign in [('Left',1),('Right',-1)]:
                            if id in SHORT_TOPS:continue  # Tee sleeves: see the visibility check below.
                            if point.x*sign<=.23:continue
                            elbow=arm.data.bones[prefix+'ForeArm'].head_local;wrist=arm.data.bones[prefix+'Hand'].head_local;axis=wrist-elbow
                            if (point-elbow).dot(axis)/axis.length_squared>=opening_limits['top_forearm_end']:violations.append(face.index);break
            other_openings[id]={'removed_faces':len(removed),'violations':len(set(violations)),'limits':opening_limits,'scope':'Actual removed incident faces preserve declared neck/wrist or waistband/ankle boundaries.'}
            check(bool(removed) and not violations,'opening_anatomy_'+id,other_openings[id])
        report['top_bottom_opening_anatomy']=other_openings
        # Coverage holes as a viewer sees them: removed body faces visible from 24 standard
        # camera positions at rest. Gated on the combined outfit; per-piece is reported.
        points=[body.matrix_world@v.co for v in body.data.vertices];faces=[tuple(f.vertices) for f in body.data.polygons]
        covered_by={id:{v.index for v in body.data.vertices if any(w.group==body.vertex_groups['covered_'+id].index and w.weight>.5 for w in v.groups)} for id in garments}
        trees={id:BVHTree.FromPolygons(*world_mesh(obj)) for id,obj in garments.items()}
        exposed,removed=visible_hidden_faces(points,faces,set().union(*covered_by.values()),list(trees.values()))
        # A user-accepted exemption is reported separately, never silently dropped.
        accepted=[]
        for row in assembly.get('accepted_visibility_exemptions',[]):
            group=body.vertex_groups.get(row['region'])
            if group is None:check(False,'accepted_exemption_group_present',row['region']);continue
            contact={v.index for v in body.data.vertices if any(w.group==group.index and w.weight>.5 for w in v.groups)}
            accepted+=[i for i in exposed if any(v in contact for v in faces[i])];exposed=[i for i in exposed if not any(v in contact for v in faces[i])]
        visibility={'combined':{'removed_faces':removed,'visible_faces':len(exposed),'accepted_contact_faces':len(accepted),'sample':exposed[:12]}}
        for id in garments:
            piece,piece_removed=visible_hidden_faces(points,faces,covered_by[id],[trees[id]])
            visibility[id]={'removed_faces':piece_removed,'visible_faces':len(piece),'sample':piece[:12]}
        report['hidden_face_visibility']={**visibility,'cameras':'8 directions at 3 m, heights 0.9/1.2/1.5/2.2 m; rest pose','scope':'Combined outfit gated; per-piece reported.'}
        check(not exposed,'hidden_faces_not_visible',visibility['combined'])
        fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base
        for pose_scope in (['native'] if a.probe else ['native','actual_runtime']):
            reset(arm)
            pose_adapter=RuntimeGaitPose(glb,gaits,arm) if pose_scope=='actual_runtime' else None
            scope_report=report if pose_scope=='native' else {'pose_evaluation':'raw-gltf-SLERP-equivalent-pose','gait_hashes':{motion:digest(path) for motion,path in gaits.items()},'helper_sha256':digest(Path(__file__).with_name('catalog_gltf_gait_pose.py'))}
            samples=[]
            if a.probe:samples=[('rest',0),('walk',13),('run',7.25),('run',8)]
            else:
                for motion in ['walk','run']:
                    start,end=bpy.data.actions[motion].frame_range
                    samples += [(motion,frame) for frame in sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})]
            sweeps={name:[] for name in [*recipe,'combined']}
            leg_fold={NAMES[row['piece']] for row in assembly.get('accepted_contact_classes',[]) if row['class']=='leg-fold'}
            for case in sweeps:
                for m in masks:m.show_viewport=case=='combined' or m.vertex_group=='covered_'+case
                active=list(garments.values()) if case=='combined' else [garments[case]]
                bpy.context.view_layer.update()
                fold_bones={obj.name:face_dominant_bones(obj,arm) for obj in [*bodies,*active]} if leg_fold else {}
                for motion,frame in samples:
                    reset(arm)
                    if motion!='rest':
                        action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                    bpy.context.scene.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
                    if pose_adapter:pose_adapter.apply(motion,frame,fps)
                    obstacles={obj.name:bvh(obj)[0] for obj in bodies};trees={obj.name:bvh(obj)[0] for obj in active}
                    accepted_pairs={}
                    def kept(pairs,garment,other,garment_index):
                        # User-accepted leg-fold (2026-10-08): shorts against lower-leg, foot or shoe faces.
                        if garment not in leg_fold:return pairs
                        keep=[pair for pair in pairs if not LEG_FOLD(fold_bones[other][pair[1-garment_index]])]
                        if len(keep)<len(pairs):accepted_pairs[garment+'/'+other]=accepted_pairs.get(garment+'/'+other,0)+len(pairs)-len(keep)
                        return keep
                    counts={obj.name:{name:len(kept(tree.overlap(trees[obj.name]),obj.name,name,1)) for name,tree in obstacles.items()} for obj in active}
                    layers={}
                    for i,left in enumerate(active):
                        for right in active[i+1:]:
                            pairs=kept(trees[left.name].overlap(trees[right.name]),left.name,right.name,0)
                            layers[left.name+'/'+right.name]=len(kept(pairs,right.name,left.name,1))
                    sweeps[case].append({'motion':motion,'frame':frame,'body_head_hair_pairs':counts,'layer_pairs':layers,'accepted_pairs':accepted_pairs})
                maximum=max(sum(v for counts in row['body_head_hair_pairs'].values() for v in counts.values())+sum(row['layer_pairs'].values()) for row in sweeps[case])
                check(maximum==0,pose_scope+'_dense_fit_'+case,{'samples':len(samples),'maximum_pairs':maximum})
            scope_report['motion_fit']=sweeps
            if not a.probe:
                worst=max(sweeps[top],key=lambda row:row['body_head_hair_pairs'][NAMES[top]]['H02_hair'])
                reset(arm);action=bpy.data.actions[worst['motion']];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                bpy.context.scene.frame_set(math.floor(worst['frame']),subframe=worst['frame']%1)
                if pose_adapter:pose_adapter.apply(worst['motion'],worst['frame'],fps)
                for modifier in masks:modifier.show_viewport=False
                bpy.context.view_layer.update();tree=bvh(body)[0];hair_points,_=world_mesh(hair)
                measured=[(tree.find_nearest(point)[3],i,point) for i,point in enumerate(hair_points)]
                distance,index,point=min(measured,key=lambda row:row[0])
                nearest,normal,_,_=tree.find_nearest(point)
                scope_report['fixed_hair_body_gap']={'motion':worst['motion'],'frame':worst['frame'],'top':top,'top_hair_pairs':worst['body_head_hair_pairs'][NAMES[top]]['H02_hair'],'hair_vertex_sample_min_distance_m':distance,'hair_original_vertex':index,'hair_world_xyz':list(point),'body_nearest_xyz':list(nearest),'body_surface_normal':list(normal),'scope':'All hair vertices to unmasked body surface at the worst sampled hoodie/hair pose; vertex sampling is a bound on available clearance, not a complete triangle minimum.'}
            
            for m in masks:m.show_viewport=True
            detail_rows=[]; closure_pair_rows=[]; free_baseline={}
            detail_samples=[('rest',0), *samples] if not a.probe else [('rest',0)]
            for motion,frame in detail_samples:
                reset(arm)
                if motion != 'rest':
                    action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
                bpy.context.scene.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
                if pose_adapter:pose_adapter.apply(motion,frame,fps)
                shoe_points=world_mesh(garments['F01'])[0] if 'F01' in garments else [];closure_trees=[BVHTree.FromPolygons(shoe_points,faces) for faces in closure_components]
                closure_pairs={str(i)+'/'+str(j):len(left.overlap(right)) for i,left in enumerate(closure_trees) for j,right in enumerate(closure_trees) if j>i}
                closure_pair_rows.append({'motion':motion,'frame':frame,'component_pairs':closure_pairs})
                for id,obj in garments.items():
                    points,_=world_mesh(obj);roles=obj.data.attributes['female_detail_role'];anchors=obj.data.attributes['female_hood_anchor']
                    cloth=[tuple(face.vertices) for face in obj.data.polygons if all(roles.data[i].value==0 for i in face.vertices)]
                    tree=BVHTree.FromPolygons(points,cloth)
                    for role in sorted({value.value for value in roles.data} - {0}):
                        indices=[i for i,value in enumerate(roles.data) if value.value==role]
                        sewn=[i for i in indices if role!=2 or anchors.data[i].value]
                        free=[i for i in indices if role==2 and not anchors.data[i].value]
                        maximum=max(tree.find_nearest(points[i])[3] for i in sewn)
                        free_distance=max((tree.find_nearest(points[i])[3] for i in free),default=0)
                        key=id+':'+str(role)
                        if motion=='rest':free_baseline[key]=free_distance
                        faces=[tuple(face.vertices) for face in obj.data.polygons if all(roles.data[i].value==role for i in face.vertices)]
                        own_pairs=len(tree.overlap(BVHTree.FromPolygons(points,faces)))
                        row={'piece':id,'role':role,'motion':motion,'frame':frame,'sewn_max_distance_m':maximum,'free_max_distance_m':free_distance,'free_extension_growth_m':free_distance-free_baseline[key],'own_shell_pairs':own_pairs}
                        detail_rows.append(row)
            scope_report['detail_attachments']={'checks':detail_rows,'closure_component_pairs':closure_pair_rows,'anchor_limit_m':.012,'free_growth_limit_m':.003,'own_shell_scope':'Measured all roles; strict zero for hoodie pocket/hood and sneaker closure, trousers seam embedding reported separately.'}
            # Attachment distance and free-extension growth gate. Detail-to-own-shell pairs are a
            # diagnostic, as for every garment since 2026-10-08 (no passing piece clears them; the
            # male T04 pocket corner has the same 35 pairs): report the worst, don't fail on it.
            failed=[row for row in detail_rows if row['sewn_max_distance_m']>=.012 or row['free_extension_growth_m']>=.003]
            check(not failed,pose_scope+'_detail_attachment',failed[:12])
            scope_report['detail_own_shell_diagnostic']={'max_pairs':max((row['own_shell_pairs'] for row in detail_rows),default=0),'worst':[row for row in sorted(detail_rows,key=lambda r:-r['own_shell_pairs'])[:5] if row['own_shell_pairs']]}
            check(not any(value for row in closure_pair_rows for value in row['component_pairs'].values()),pose_scope+'_closure_component_pair_clearance',closure_pair_rows[:4])

            if pose_scope=='actual_runtime':report['actual_runtime_fit']=scope_report
        reset(arm)
        inverse_head=(arm.matrix_world@arm.data.bones['Head'].matrix_local).inverted()
        rigid_reference={obj:world_mesh(obj)[0] for obj in [head,hair]}
        gestures=[]
        for label,axis,angle in [('rest',(0,0,1),0),('turn-left',(0,0,1),.6),('turn-right',(0,0,1),-.6),('nod',(1,0,0),.4),('look-up',(1,0,0),-.3),('tilt',(0,1,0),.25)]:
            reset(arm);bone=arm.pose.bones['Head'];matrix=bone.matrix.copy();pose=(Quaternion(axis,angle).to_matrix()@matrix.to_3x3()).to_4x4();pose.translation=matrix.translation;bone.matrix=pose;bpy.context.view_layer.update()
            counts={obj.name:{obstacle.name:len(bvh(obj)[0].overlap(bvh(obstacle)[0])) for obstacle in garments.values()} for obj in bodies}
            transform=arm.matrix_world@bone.matrix@inverse_head
            attachment={obj.name:max((point-transform@original).length for point,original in zip(world_mesh(obj)[0],reference)) for obj,reference in rigid_reference.items()}
            check(all(error<.00002 for error in attachment.values()),'rigid_head_hair_attachment',attachment)
            gestures.append({'pose':label,'body_head_hair_garment_pairs':counts,'rigid_attachment_error_m':attachment})
        report['head_gestures']=gestures
        check(not any(value for row in gestures for counts in row['body_head_hair_garment_pairs'].values() for value in counts.values()),'six_head_gesture_fit',gestures)
        if not a.probe:
            reset(arm)
            source_corners=uv_corner_rows(head,head.data.uv_layers['canonical_face_uv'])
            model,binary=read_glb(glb);mat_id=next(i for i,m in enumerate(model['materials']) if m['name']=='face_surface')
            mat=model['materials'][mat_id];image=model['images'][model['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
            view=model['bufferViews'][image['bufferView']];offset=view.get('byteOffset',0);image_hash=hashlib.sha256(binary[offset:offset+view['byteLength']]).hexdigest()
            fixture=Path(assembly['foundation']).parent/'sample-face.png'
            check(image_hash==digest(fixture),'embedded_canonical_face_texture')
            primitives=[p for mesh in model['meshes'] for p in mesh['primitives'] if p.get('material')==mat_id]
            check(bool(primitives) and all('TEXCOORD_0' in p['attributes'] for p in primitives),'face_TEXCOORD_0')
            before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(glb.resolve()))
            imported=[o for o in bpy.data.objects if o not in before];rig=next(o for o in imported if o.type=='ARMATURE');rig.animation_data_create();reset(rig)
            sources=[body,head,hair,*garments.values()]
            mapping={source:next(o for o in imported if o.type=='MESH' and o.name.startswith('outfit_masked_body' if source==body else source.name)) for source in sources}
            exported_head=mapping[head];layer=exported_head.data.uv_layers.active
            corners=uv_corner_rows(exported_head,layer);uv=uv_corner_identity(source_corners,corners);check(uv['passed'],'canonical_face_corner_identity',uv)
            j=next(i for i,(pos,value) in enumerate(corners) if (pos-corners[0][0]).length>.05 and (value-corners[0][1]).length>.1)
            left=layer.data[0].uv.copy();right=layer.data[j].uv.copy()
            try:
                layer.data[0].uv=right;layer.data[j].uv=left;permuted=uv_corner_rows(exported_head,layer)
                negative=uv_corner_identity(source_corners,permuted)
                unchanged=sorted(tuple(value) for _,value in corners)==sorted(tuple(value) for _,value in permuted)
                check(unchanged and not negative['passed'],'negative_UV_swap_rejected',negative)
            finally:layer.data[0].uv=left;layer.data[j].uv=right
            body_path=folder/'body.glb';body_model,body_bin=read_glb(body_path)
            body_mat_id=next(i for i,mat in enumerate(body_model['materials']) if mat['name']=='face_surface')
            body_mat=body_model['materials'][body_mat_id];body_image=body_model['images'][body_model['textures'][body_mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
            view=body_model['bufferViews'][body_image['bufferView']];offset=view.get('byteOffset',0)
            body_image_hash=hashlib.sha256(body_bin[offset:offset+view['byteLength']]).hexdigest()
            body_primitives=[primitive for mesh in body_model['meshes'] for primitive in mesh['primitives'] if primitive.get('material')==body_mat_id]
            check(body_image_hash==digest(fixture) and bool(body_primitives) and all('TEXCOORD_0' in primitive['attributes'] for primitive in body_primitives),'body_GLB_canonical_face_texture_and_TEXCOORD_0')
            before_body=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(body_path.resolve()))
            imported_body=[obj for obj in bpy.data.objects if obj not in before_body]
            body_head=next(obj for obj in imported_body if obj.type=='MESH' and obj.name.startswith('H02_head'))
            body_uv=uv_corner_identity(source_corners,uv_corner_rows(body_head,body_head.data.uv_layers.active))
            check(body_uv['passed'],'body_GLB_canonical_face_corner_identity',body_uv)
            report['body_face_transport']={'glb':str(body_path),'glb_sha256':digest(body_path),'embedded_png_sha256':body_image_hash,'corner_identity':body_uv}
            report['face_transport']={'embedded_png_sha256' :image_hash,'source_png_sha256':digest(fixture),'corner_identity':uv,'negative_probe_rejected':not negative['passed'],'UV_multiset_unchanged':unchanged,'restored_passed':uv_corner_identity(source_corners,uv_corner_rows(exported_head,layer))['passed']}
            export=[];runtime_samples=[]
            for motion,frames in [('rest',[0]),('walk',[.8,1,6.25,13,19.5,25.6]),('run',[.8,1,5,7.25,8,9.5,12.75,15.25,16])]:
                reset(arm);reset(rig)
                if motion!='rest':
                    action=bpy.data.actions[motion]
                    for target in [arm,rig]:target.animation_data.action=action;target.animation_data.action_slot=action.slots[0]
                for frame in frames:
                    bpy.context.scene.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
                    correctives=drive_imported_correctives(mapping)
                    errors={source.name:roundtrip_error(source,target) for source,target in mapping.items()}
                    runtime_samples.append({'motion':motion,'frame':frame,'corrective_values':correctives,'meshes':{source.name:[list(points[i]) for i in range(0,len(points),max(1,len(points)//96))] for source,target in mapping.items() for points,_ in [world_mesh(target)]}})
                    export.append({'motion':motion,'frame':frame,'max_nearest_vertex_error_m':errors,'corrective_values':correctives})
            maximum=max(value for row in export for value in row['max_nearest_vertex_error_m'].values())
            native_maximum=maximum
            report['native_export_deformation']={'samples':len(export),'maximum_error_m':native_maximum,'threshold_m':.00003,'scope':'Saved Blender scalar quaternion action poses'}
            check(len(export)==16 and native_maximum<.00003,'16_pose_native_source_export_parity',native_maximum)
            reset(arm);reset(rig)
            source_pose=RuntimeGaitPose(glb,gaits,arm);export_pose=RuntimeGaitPose(glb,gaits,rig)
            export=[];runtime_samples=[]
            for motion,frames in [('rest',[0]),('walk',[.8,1,6.25,13,19.5,25.6]),('run',[.8,1,5,7.25,8,9.5,12.75,15.25,16])]:
                for frame in frames:
                    bpy.context.scene.frame_set(math.floor(frame),subframe=frame%1)
                    source_pose.apply(motion,frame,fps);bone_world=export_pose.apply(motion,frame,fps);bpy.context.view_layer.update()
                    correctives=drive_imported_correctives(mapping)
                    errors={source.name:roundtrip_error(source,target) for source,target in mapping.items()}
                    runtime_samples.append({'motion':motion,'frame':frame,'bone_world_gltf':bone_world,'corrective_values':correctives,'meshes':{source.name:[list(points[i]) for i in range(0,len(points),max(1,len(points)//96))] for source,target in mapping.items() for points,_ in [world_mesh(target)]}})
                    export.append({'motion':motion,'frame':frame,'max_nearest_vertex_error_m':errors,'corrective_values':correctives})
            maximum=max(value for row in export for value in row['max_nearest_vertex_error_m'].values())
            (folder/'runtime-samples.json').write_text(json.dumps({'blend_sha256':digest(blend),'glb_sha256':digest(glb),'frames_per_second':bpy.context.scene.render.fps/bpy.context.scene.render.fps_base,'sampling':'about96 deterministic rendered GLB rest-index vertices per mesh per pose','pose_evaluation':'raw-gltf-SLERP-equivalent-pose','gait_hashes':{motion:digest(path) for motion,path in gaits.items()},'pose_helper_sha256':digest(Path(__file__).with_name('catalog_gltf_gait_pose.py')),'checks':runtime_samples})+'\n')
            deformation={'blend' :str(blend),'blend_sha256':digest(blend),'glb':str(glb),'glb_sha256':digest(glb),'checks':export,'frames_per_second':bpy.context.scene.render.fps/bpy.context.scene.render.fps_base,'max_error_m':maximum,'threshold_m':.00003,'comparison':'bidirectional rendered vertices at equivalent raw glTF SLERP poses','pose_evaluation':'raw-gltf-SLERP-equivalent-pose','gait_hashes':{motion:digest(path) for motion,path in gaits.items()},'pose_helper_sha256':digest(Path(__file__).with_name('catalog_gltf_gait_pose.py')),'status':'passed' if maximum<.00003 else 'failed'}
            (folder/'export-deformation-report.json').write_text(json.dumps(deformation,indent=2)+'\n')
            report['export_deformation']={'samples':len(export),'maximum_error_m':maximum,'threshold_m':.00003}
            check(len(export)==16 and maximum<.00003,'16_pose_source_export_parity',maximum)
        check({str(path.resolve()):digest(path) for path in sorted(Path(__file__).parent.glob('*.py'))}==gate_helpers,'gate_helper_bytes_unchanged_during_execution')
        report['status']='passed' if not report['failures'] else 'failed'
    except Exception as error:report['status']='failed';report['failures'].append({'gate':'exception','details':repr(error)})
    name='initial-probe-report.json' if a.probe else 'fit-verification-report.json'
    (folder/name).write_text(json.dumps(report,indent=2)+'\n')
    print('FEMALE_OUTFIT_VERIFICATION',json.dumps({k:v for k,v in report.items() if k not in ['motion_fit','head_gestures']}))
    if report['status']!='passed':raise RuntimeError('Female outfit gates failed; source-bound report retained')

if __name__=='__main__':main()
