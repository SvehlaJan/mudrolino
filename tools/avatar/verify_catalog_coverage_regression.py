"""Prove the opening gate accepts the current mask and rejects the old bug."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from blender_cli import script_command

p=argparse.ArgumentParser();p.add_argument('--id',required=True)
p.add_argument('--opening-z',type=float,required=True);p.add_argument('--margin',type=float,default=.004)
p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
source=Path('assets/avatar/catalog-a')/a.id/(a.id+'.blend')
assert source.is_file();a.output_dir.mkdir(parents=True,exist_ok=True)
digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
before=digest(source)
def run(name,script,args,expected):
    with (a.output_dir/(name+'.log')).open('w') as log:
        result=subprocess.run(script_command('tools/blender/catalog/'+script,args),stdout=log,stderr=subprocess.STDOUT)
    assert result.returncode==expected,(name,result.returncode,expected)
    print(name,'expected exit',result.returncode,flush=True)
safe=a.output_dir/'safe-mask-report.json';unsafe=a.output_dir/'unsafe-mask-report.json'
fixture=a.output_dir/'unsafe-mask.blend'
common=['--id',a.id,'--opening-z',a.opening_z,'--margin',a.margin]
run('safe-mask','verify_catalog_coverage.py',['--blend',source,*common,'--report',safe],0)
run('unsafe-fixture','build_unsafe_coverage_fixture.py',['--blend',source,'--id',a.id,'--limit-z',a.opening_z-a.margin,'--output',fixture],0)
run('unsafe-mask','verify_catalog_coverage.py',['--blend',fixture,*common,'--report',unsafe],1)
good=json.loads(safe.read_text());bad=json.loads(unsafe.read_text())
assert good['status']=='passed' and good['removed_faces_above_boundary']==0
assert bad['status']=='failed' and bad['removed_faces_above_boundary']>0
assert bad['maximum_removed_face_z']>a.opening_z
assert digest(source)==before,'Regression test changed the catalog master'
report={'status':'passed','source':str(source),'source_sha256':before,
        'safe_report':str(safe),'unsafe_report':str(unsafe),'fixture':str(fixture),
        'safe_violations':good['removed_faces_above_boundary'],
        'unsafe_violations':bad['removed_faces_above_boundary'],
        'unsafe_max_removed_z':bad['maximum_removed_face_z'],
        'master_unchanged':True,'scope':'Opening anatomy-mask regression; animated fit remains separately required.'}
(a.output_dir/'regression-summary.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
