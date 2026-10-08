"""Measure stitched detail distance from its cloth throughout both clips."""
import argparse,json,math,sys,hashlib
from pathlib import Path
import bpy
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset,world_mesh

def main():
    p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True);p.add_argument('--garment',required=True);p.add_argument('--surface-material',action='append',required=True);p.add_argument('--detail-material',action='append',required=True);p.add_argument('--threshold',type=float,default=.012);p.add_argument('--report',type=Path,required=True)
    p.add_argument('--anchor-attribute');p.add_argument('--free-extension-drift',type=float,default=.003)
    p.add_argument('--require-detail-clear',action='store_true')
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert a.free_extension_drift>=0
    bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()))
    arm=bpy.data.objects['Armature_Catalog'];obj=bpy.data.objects[a.garment];reset(arm)
    require_names=set(a.surface_material+a.detail_material)
    assert require_names<={m.name for m in obj.data.materials},require_names
    assert all(m.type=='ARMATURE' for m in obj.modifiers),'Topology-changing modifiers need evaluated role mapping'
    cloth=[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name in a.surface_material]
    detail_ids={name:sorted({i for p in obj.data.polygons if obj.data.materials[p.material_index].name==name for i in p.vertices}) for name in a.detail_material}
    detail_faces={name:[tuple(p.vertices) for p in obj.data.polygons if obj.data.materials[p.material_index].name==name] for name in a.detail_material}
    anchors={};free={};baseline={}
    if a.anchor_attribute:
        attribute=obj.data.attributes[a.anchor_attribute];assert attribute.domain=='POINT' and attribute.data_type=='BOOLEAN'
        anchors={name:[i for i in ids if attribute.data[i].value] for name,ids in detail_ids.items()}
        free={name:[i for i in ids if not attribute.data[i].value] for name,ids in detail_ids.items()}
        assert all(anchors.values()) and all(free.values()),'Each flexible detail needs attached ends and a free part'
    records=[]
    for motion in ['rest','walk','run']:
        reset(arm)
        if motion=='rest':frames=[0]
        else:
            action=bpy.data.actions[motion];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
            start,end=map(float,action.frame_range);frames=sorted({round(start,5),round(end,5)}|{i/4 for i in range(math.ceil(start*4),math.floor(end*4)+1)})
        for frame in frames:
            bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
            points,_=world_mesh(obj);tree=BVHTree.FromPolygons(points,cloth)
            distances={name:max(tree.find_nearest(points[i])[3] for i in ids) for name,ids in detail_ids.items()}
            worst={name:max(ids,key=lambda i:tree.find_nearest(points[i])[3]) for name,ids in detail_ids.items()}
            row={'motion':motion,'frame':frame,'max_cloth_distance_m':distances,'worst_detail_rest_xyz':{name:list(obj.data.vertices[i].co) for name,i in worst.items()}}
            if a.anchor_attribute:
                row['max_anchor_distance_m']={name:max(tree.find_nearest(points[i])[3] for i in ids) for name,ids in anchors.items()}
                row['max_free_distance_m']={name:max(tree.find_nearest(points[i])[3] for i in ids) for name,ids in free.items()}
                if motion=='rest':baseline=row['max_free_distance_m'].copy()
            if a.require_detail_clear:
                row['detail_shell_pairs']={name:len(tree.overlap(BVHTree.FromPolygons(points,faces))) for name,faces in detail_faces.items()}
            records.append(row)
    maximum=max(d for r in records for d in r['max_cloth_distance_m'].values())
    threshold=a.threshold;roles=None;passed=maximum<threshold
    if a.anchor_attribute:
        anchor_max=max(value for row in records for value in row['max_anchor_distance_m'].values())
        growth=max(value-baseline[name] for row in records for name,value in row['max_free_distance_m'].items())
        threshold=max(a.threshold,max(baseline.values())+a.free_extension_drift)
        passed=maximum<threshold and anchor_max<a.threshold and growth<a.free_extension_drift
        roles={'attribute':a.anchor_attribute,'anchor_threshold_m':a.threshold,'max_anchor_distance_m':anchor_max,
               'free_rest_extension_m':baseline,'free_extension_drift_m':a.free_extension_drift,'max_free_extension_growth_m':growth,
               'counts':{name:{'anchors':len(anchors[name]),'free':len(free[name])} for name in detail_ids},'samples':len(records)}
    shell_pairs=max((value for row in records for value in row.get('detail_shell_pairs',{}).values()),default=0)
    if a.require_detail_clear:passed=passed and shell_pairs==0
    report={'blend':str(a.blend),'blend_sha256':hashlib.sha256(a.blend.read_bytes()).hexdigest(),'garment':obj.name,'threshold_m':threshold,'samples':len(records),'max_cloth_distance_m':maximum,'status':'passed' if passed else 'failed','surface_materials':a.surface_material,'detail_materials':a.detail_material,'checks':records,
            'attachment_roles':roles,'require_detail_clear':a.require_detail_clear,'max_detail_shell_pairs':shell_pairs}
    a.report.write_text(json.dumps(report,indent=2)+'\n');print('DETAIL_FIT',json.dumps({k:v for k,v in report.items() if k!='checks'}));assert passed,{k:v for k,v in report.items() if k!='checks'}

if __name__=='__main__':main()
