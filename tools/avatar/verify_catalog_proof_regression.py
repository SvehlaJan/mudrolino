"""Exercise proof guards in an isolated report copy, preserving real evidence."""
import argparse,hashlib,json,subprocess,sys,tempfile
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--outfit',required=True)
p.add_argument('--report',type=Path,required=True);a=p.parse_args()
root=Path.cwd();catalog=root/'assets/avatar/catalog-a';outfit=catalog/'outfits'/a.outfit
summary=json.loads((outfit/'verification-summary.json').read_text())
digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
inputs=[outfit/'verification-summary.json',outfit/'export-deformation-report.json',outfit/'runtime-corrective-report.json']
assert summary['opening_coverage'] and summary['runtime_correctives']
coverage=catalog/summary['opening_coverage'][0]['path'];inputs.append(coverage)
before={str(path):digest(path) for path in inputs};checks=[]
with tempfile.TemporaryDirectory(prefix='catalog-proof-regression-') as temporary:
    shadow=Path(temporary);target=shadow/'assets/avatar/catalog-a';target.mkdir(parents=True)
    coverage_id=coverage.parent.name
    for path in catalog.iterdir():
        if path.name not in ['outfits',coverage_id]:(target/path.name).symlink_to(path,target_is_directory=path.is_dir())
    def clone(source,dest,copies):
        dest.mkdir()
        for path in source.iterdir():
            if path.name in copies:(dest/path.name).write_bytes(path.read_bytes())
            else:(dest/path.name).symlink_to(path,target_is_directory=path.is_dir())
    clone(coverage.parent,target/coverage_id,{coverage.name})
    (target/'outfits').mkdir()
    for path in (catalog/'outfits').iterdir():
        if path.name!=a.outfit:(target/'outfits'/path.name).symlink_to(path,target_is_directory=path.is_dir())
    copies={path.name for path in inputs if path.parent==outfit}
    clone(outfit,target/'outfits'/a.outfit,copies)
    (shadow/'artifacts').symlink_to(root/'artifacts',target_is_directory=True)
    args=[sys.executable,str(root/'tools/avatar/summarize_catalog_proof.py'),'--outfit='+a.outfit]
    args+=['--attachment='+x['path'] for x in summary['attachments']]
    args+=['--detail='+x['path'] for x in summary['stitched_details']]
    args+=['--coverage='+x['path'] for x in summary['opening_coverage']]
    args+=['--corrective=outfits/'+a.outfit+'/runtime-corrective-report.json']
    def check(name,message=None):
        result=subprocess.run(args,cwd=shadow,capture_output=True,text=True)
        if message:assert result.returncode!=0 and message in result.stderr,(name,result.stdout,result.stderr)
        else:assert result.returncode==0,(name,result.stdout,result.stderr)
        checks.append({'case':name,'expected_rejection':message,'exit_code':result.returncode,'status':'passed'})
        print(name,'PASS',flush=True)
    check('current reports accepted')
    for file,message in [('export-deformation-report.json','Missing deepest-kick export regression'),('runtime-corrective-report.json','Missing deepest-kick corrective regression')]:
        path=target/'outfits'/a.outfit/file;original=path.read_bytes();data=json.loads(original)
        case=next(x for x in data['checks'] if x['motion']=='run' and x['frame']==7.25)
        case['frame']=7.0
        path.write_text(json.dumps(data))
        check(file+' missing pose with unchanged sample count',message)
        path.write_bytes(original)
    path=target/summary['opening_coverage'][0]['path'];original=path.read_bytes();data=json.loads(original)
    data['status']='failed';data['removed_faces_above_boundary']=1
    path.write_text(json.dumps(data));check('unsafe opening report rejected','Opening anatomy removed')
    path.write_bytes(original);check('restored current reports accepted')
assert {str(path):digest(path) for path in inputs}==before,'Real proof inputs changed'
report={'status':'passed','outfit':a.outfit,'real_evidence_unchanged':True,'input_hashes':before,'checks':checks,
        'scope':'Proof collector report guards; full source-bound fitting/export/browser gates are separate evidence.'}
a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n')
print('PROOF_REGRESSION',json.dumps({'status':report['status'],'checks':len(checks),'real_evidence_unchanged':True}))
