"""Audit new arm/torso contact across a generated fixed-outfit bear's dance.

Record intrinsic source contacts separately: fused anatomical features can touch.
This does not prove independent garment fit or future wardrobe compatibility.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0,str(Path(__file__).resolve().parent))
from bear_companion_common import digest,write_json
from build_catalog_t01 import world_mesh


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend',required=True,type=Path)
    parser.add_argument('--report',required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    mesh=bpy.data.objects['Bear_fixed_outfit']
    arm=next(obj for obj in bpy.data.objects if obj.type=='ARMATURE')
    action=arm.animation_data.action
    if not action or action.name!='celebrate':
        raise ValueError('Expected the saved celebrate action')
    points=[mesh.matrix_world@v.co for v in mesh.data.vertices]
    parents=list(range(len(points)))
    def root(index):
        while parents[index]!=index:
            parents[index]=parents[parents[index]]
            index=parents[index]
        return index
    tree=KDTree(len(points))
    for index,point in enumerate(points):tree.insert(point,index)
    tree.balance()
    for index,point in enumerate(points):
        for _,other,_ in tree.find_range(point,.00001):
            if other>index:parents[root(other)]=root(index)
    ids=[root(index) for index in range(len(points))]
    mesh.data.calc_loop_triangles()
    faces=[tuple(triangle.vertices) for triangle in mesh.data.loop_triangles]
    welded=[{ids[index] for index in face} for face in faces]
    roles=[]
    for face in faces:
        weights=Counter()
        for index in face:
            for group in mesh.data.vertices[index].groups:
                weights[mesh.vertex_groups[group.group].name]+=group.weight
        bone=weights.most_common(1)[0][0]
        roles.append('arm' if any(part in bone for part in ['Arm','Hand','Shoulder'])
                     else 'torso-leg' if any(part in bone for part in ['Spine','Hips','Leg']) else 'other')
    def contacts():
        current=world_mesh(mesh)[0]
        bvh=BVHTree.FromPolygons(current,faces,all_triangles=True)
        return {(a,b) for a,b in bvh.overlap(bvh) if a<b and not(welded[a]&welded[b])}
    arm.animation_data.action=None
    for bone in arm.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    baseline=contacts()
    arm.animation_data.action=action
    if action.slots:arm.animation_data.action_slot=action.slots[0]
    rows=[]
    for index in range(169):
        frame=index/4
        bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame))
        bpy.context.view_layer.update()
        current=contacts()
        added=current-baseline
        critical=[pair for pair in added if {roles[pair[0]],roles[pair[1]]}=={'arm','torso-leg'}]
        rows.append({'frame':frame,'nonadjacent_contacts':len(current),'new_pairs':len(added),
                     'new_arm_torso_leg_pairs':len(critical),'critical_examples':critical[:5]})
    worst=max(row['new_arm_torso_leg_pairs'] for row in rows)
    report={'status':'passed' if worst==0 else 'failed','profile':'generated-fixed-outfit-arm-clearance',
            'scope':'No new nonadjacent arm-versus-torso/leg triangle contacts relative to the source bind pose; all other contacts recorded, not declared absent. Not independent garment or wardrobe proof.',
            'blend':str(args.blend),'blend_sha256':digest(args.blend),
            'verifier_sha256':digest(Path(__file__)),'blender_version':bpy.app.version_string,
            'rest_weld_epsilon_m':.00001,'source_bind_contacts':len(baseline),
            'frame_count':len(rows),'maximum_new_arm_torso_leg_pairs':worst,
            'maximum_total_contacts':max(row['nonadjacent_contacts'] for row in rows),'frames':rows}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    write_json(args.report,report)
    print(json.dumps({k:report[k] for k in ['status','frame_count','source_bind_contacts','maximum_new_arm_torso_leg_pairs','maximum_total_contacts']}))
    if worst:raise RuntimeError('New arm-to-body contact remains')


if __name__=='__main__':main()
