"""Reject bilateral correction keys that move the opposite side of the body."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy

def audit(path,tolerance):
    bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
    rows=[]
    for obj in bpy.data.objects:
        if obj.type!='MESH' or not obj.data.shape_keys:continue
        keys=obj.data.shape_keys.key_blocks
        basis=keys['Basis']
        for key in keys:
            side=key.name.rsplit('knee_clearance_',1)[-1]
            if side not in ('Left','Right'):continue
            sign=1 if side=='Left' else -1
            opposite=[i for i,v in enumerate(basis.data) if v.co.x*sign<-.04]
            distances=[(key.data[i].co-basis.data[i].co).length for i in opposite]
            moved=sum(d>tolerance for d in distances)
            active=sum((key.data[i].co-v.co).length>tolerance for i,v in enumerate(basis.data) if v.co.x*sign>.04)
            rows.append({'object':obj.name,'key':key.name,'opposite_vertices_moved':moved,'max_opposite_delta_m':max(distances,default=0),'intended_vertices_moved':active})
    return {'blend':str(path),'blend_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'keys':rows,'status':'passed' if all(r['opposite_vertices_moved']==0 for r in rows) else 'failed'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend',type=Path,action='append',required=True)
    parser.add_argument('--report',type=Path,required=True)
    parser.add_argument('--tolerance',type=float,default=1e-7)
    parser.add_argument('--require-clear',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert 0<args.tolerance<=1e-6
    results=[audit(path,args.tolerance) for path in args.blend]
    report={'tolerance_m':args.tolerance,'status':'passed' if all(r['status']=='passed' for r in results) else 'failed','checks':results}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,indent=2)+'\n')
    print('CORRECTIVE_SIDES',json.dumps(report))
    if args.require_clear:assert report['status']=='passed',report

if __name__=='__main__':main()
