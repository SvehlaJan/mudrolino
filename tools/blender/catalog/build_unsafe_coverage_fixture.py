"""Build a separate regression fixture for the simple vertex-height mask bug."""
import argparse,sys
from pathlib import Path
import bpy

p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,required=True)
p.add_argument('--id',required=True);p.add_argument('--limit-z',type=float,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert a.blend.resolve()!=a.output.resolve()
bpy.ops.wm.open_mainfile(filepath=str(a.blend.resolve()))
bpy.context.preferences.filepaths.save_version=0
body=bpy.data.objects['body_underlayer_male'];group=body.vertex_groups['covered_'+a.id]
group.remove([v.index for v in body.data.vertices])
lower={'LeftLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'}
ids=[v.index for v in body.data.vertices if v.co.z<a.limit_z
     and sum(w.weight for w in v.groups if body.vertex_groups[w.group].name in lower)>.5]
group.add(ids,1,'REPLACE')
a.output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(a.output.resolve()))
print('UNSAFE_COVERAGE_FIXTURE',len(ids),str(a.output))
