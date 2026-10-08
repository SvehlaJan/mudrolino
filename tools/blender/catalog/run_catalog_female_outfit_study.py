"""Sequential isolated capsule proof. Wrap once in tools/avatar/blender_queue.py."""
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, sys
from pathlib import Path


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def write_report(path, report):
    temporary=Path(str(path)+'.tmp');temporary.write_text(json.dumps(report,indent=2)+'\n');temporary.replace(path)

def start_report(path, study, runner_hash, probe):
    report={'stage':'isolated candidate; acceptance remains separate','profile':'probe' if probe else 'complete native/export/material/Three.js skin math; browser separate','status':'running','source_blend':str(study/'outfit.blend'),'source_sha256':None,'outfit_glb_sha256':None,'runner_sha256':runner_hash,'gates':[]}
    write_report(path,report);return report

def finish_report(path, report):
    report['status']='passed' if report['gates'] and all(row.get('status')=='passed' for row in report['gates']) else 'failed'
    write_report(path,report)

def expected_dependencies(study):
    assembly_path=study/'assembly-report.json';assembly=json.loads(assembly_path.read_text())
    script_dir=Path('tools/blender/catalog')
    paths=[assembly_path,Path(assembly['foundation']),script_dir/'build_catalog_female_outfit_study.py',script_dir/'catalog_gltf_gait_pose.py']
    paths += [script_dir/name for name in assembly.get('component_helpers',{})]
    paths += [Path(row[key]) for row in assembly['pieces'].values() for key in ['source','source_blend']]
    paths += [study/name for name in ['body.glb','garments.glb']]
    paths += [Path('assets/avatar/catalog-a/foundation/catalog-body-'+motion+'.glb') for motion in ['walk','run']]
    paths += [Path(assembly['foundation']).parent/'sample-face.png']
    paths += sorted(script_dir.glob('*.py'))
    return {str(path.resolve()):digest(path) for path in paths}


def recipe_of(study):
    return json.loads((study/'assembly-report.json').read_text()).get('recipe',['T02','B01','F01'])

# Detail roles each piece contributes: hoodie pocket/hood, trouser seams, sneaker closures.
DETAIL_ROLES=[('T02',1),('T02',2),('B01',3),('F01',4)]

def validate_output(path, kind, study, target=None):
    try:
        data=json.loads(path.read_text());assert data['status']=='passed', 'Output proof did not pass'
        if kind=='material':
            assert data['sha256']==digest(target) and Path(data['target']).resolve()==target.resolve(), 'Material source mismatch'
            assert data['primitives'], 'No validated material primitives'
        elif kind=='exports':
            assert data['source_blend_sha256']==digest(study/'outfit.blend'), 'Export source mismatch'
            recipe=recipe_of(study)
            expected={str(folder/(name+'.glb')) for folder in [study,*[study/'pieces'/id for id in recipe]] for name in ['body','garments','outfit']}
            assert {row['target'] for row in data['checks']}==expected and len(data['checks'])==3*(1+len(recipe)), 'Incomplete export inventory'
            assert all(row['sha256']==digest(row['target']) and row['issues']['numErrors']==0 and row['issues']['numWarnings']==0 for row in data['checks']), 'Stale or invalid exported GLB'
        elif kind=='runtime':
            assert data['blend_sha256']==digest(study/'outfit.blend') and data['glb_sha256']==digest(study/'outfit.glb'), 'Runtime source mismatch'
            assert data['runtime_samples_sha256']==digest(study/'runtime-samples.json') and data['deformation_report_sha256']==digest(study/'export-deformation-report.json'), 'Runtime parity mismatch'
            assert len(data['checks'])==16 and data['unmatched_samples']==0 and data['combined_error_bound_m']<.00003, 'Invalid runtime error bound'
            assert data['gait_hashes']=={motion:digest('assets/avatar/catalog-a/foundation/catalog-body-'+motion+'.glb') for motion in ['walk','run']}, 'Runtime gait mismatch'
        else:raise ValueError('Unknown proof kind')
        return {'status':'passed','report':str(path),'report_sha256':digest(path)}
    except (OSError,ValueError,KeyError,AssertionError,TypeError) as error:return {'status':'failed','reason':str(error),'report':str(path)}


def validate_native(path, study, verifier, probe):
    try:
        data=json.loads(path.read_text())
        assert data['status']=='passed' and not data.get('failures'), 'Native proof did not pass'
        assert data['blend_sha256']==digest(study/'outfit.blend') and data['glb_sha256']==digest(study/'outfit.glb'), 'Native proof source mismatch'
        assert data['verifier_sha256']==digest(verifier), 'Native verifier mismatch'
        assert {str(Path(path).resolve()):value for path,value in data['dependency_hashes'].items()}=={str(Path(path).resolve()):value for path,value in expected_dependencies(study).items()}, 'Native dependency inventory mismatch'
        if not probe:
            assert data['profile']=='complete sampled fit/export', 'Wrong native profile'
            recipe=recipe_of(study);roles=[(piece,role) for piece,role in DETAIL_ROLES if piece in recipe]
            assert set(data['motion_fit'])=={*recipe,'combined'} and all(len(rows)==163 for rows in data['motion_fit'].values()), 'Wrong dense sample counts'
            assert len(data['head_gestures'])==6 and data['export_deformation']['samples']==16, 'Wrong head/export counts'
            actual=data['actual_runtime_fit']
            assert actual['pose_evaluation']=='raw-gltf-SLERP-equivalent-pose' and set(actual['motion_fit'])=={*recipe,'combined'} and all(len(rows)==163 for rows in actual['motion_fit'].values()), 'Wrong actual runtime fit samples'
            assert actual['helper_sha256']==digest('tools/blender/catalog/catalog_gltf_gait_pose.py') and actual['gait_hashes']=={motion:digest('assets/avatar/catalog-a/foundation/catalog-body-'+motion+'.glb') for motion in ['walk','run']}, 'Actual runtime dependency mismatch'
            actual_rows=actual['detail_attachments']['checks']
            assert all(sum(row['piece']==piece and row['role']==role for row in actual_rows)==164 for piece,role in roles), 'Wrong actual runtime detail sample counts'
            rows=data['detail_attachments']['checks']
            assert all(sum(row['piece']==piece and row['role']==role for row in rows)==164 for piece,role in roles), 'Wrong detail sample counts'
        return {'status':'passed','report':str(path),'report_sha256':digest(path)}
    except (OSError,ValueError,KeyError,AssertionError,TypeError) as error:
        return {'status':'failed','reason':str(error),'report':str(path)}

def validate_parity(study):
    try:
        deformation=study/'export-deformation-report.json';samples=study/'runtime-samples.json'
        data=json.loads(deformation.read_text());runtime=json.loads(samples.read_text())
        assert data['status']=='passed' and data['max_error_m']<.00003 and len(data['checks'])==16, 'Invalid export parity'
        for record in [data,runtime]:
            assert record['pose_evaluation']=='raw-gltf-SLERP-equivalent-pose' and record['pose_helper_sha256']==digest('tools/blender/catalog/catalog_gltf_gait_pose.py'), 'Wrong equivalent pose references'
            assert record['gait_hashes']=={motion:digest('assets/avatar/catalog-a/foundation/catalog-body-'+motion+'.glb') for motion in ['walk','run']}, 'Parity gait mismatch'
            assert record['blend_sha256']==digest(study/'outfit.blend') and record['glb_sha256']==digest(study/'outfit.glb'), 'Parity source mismatch'
            assert len(record['checks'])==16, 'Wrong runtime sample count'
        return {'status':'passed','deformation_report_sha256':digest(deformation),'runtime_samples_sha256':digest(samples)}
    except (OSError,ValueError,KeyError,AssertionError,TypeError) as error:return {'status':'failed','reason':str(error)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study-dir',type=Path,required=True);parser.add_argument('--report-dir',type=Path,required=True)
    parser.add_argument('--probe',action='store_true');parser.add_argument('--reuse-native',action='store_true')
    args=parser.parse_args()
    if not os.environ.get('TEO_LEARN_BLENDER_QUEUE_ACTIVE'):raise RuntimeError('Wrap the full runner once in tools/avatar/blender_queue.py')
    args.report_dir.mkdir(parents=True,exist_ok=True)
    report_path=args.report_dir/('probe-runner-report.json' if args.probe else 'runner-report.json')
    report=start_report(report_path,args.study_dir,digest(__file__),args.probe);rows=report['gates']
    def run(name,command,proof=None):
        log=args.report_dir/(name+'.log')
        with log.open('w') as stream:result=subprocess.run([str(value) for value in command],stdout=stream,stderr=subprocess.STDOUT,check=False)
        row={'gate':name,'command':[str(value) for value in command],'execution':'fresh','status':'passed' if result.returncode==0 else 'failed','exit_code':result.returncode,'log':str(log)}
        if proof:
            row.update(proof())
            if result.returncode!=0:row['status']='failed'
        rows.append(row);write_report(report_path,report);print(json.dumps(row),flush=True);return row
    verifier=Path('tools/blender/catalog/verify_catalog_female_outfit_study.py')
    native_path=args.study_dir/('initial-probe-report.json' if args.probe else 'fit-verification-report.json')
    try:
        report['source_sha256']=digest(args.study_dir/'outfit.blend');report['outfit_glb_sha256']=digest(args.study_dir/'outfit.glb');write_report(report_path,report)
        # A skipped runtime must never retain an older passed runtime result.
        (args.study_dir/'runtime-deformation-report.json').unlink(missing_ok=True)
        if args.reuse_native:
            native={'gate':'native-probe' if args.probe else 'native-complete','execution':'reused',**validate_native(native_path,args.study_dir,verifier,args.probe)};rows.append(native)
        else:
            for path in [native_path,args.study_dir/'export-deformation-report.json',args.study_dir/'runtime-samples.json']:path.unlink(missing_ok=True)
            command=['python3','tools/avatar/blender_cli.py',verifier,'--study-dir',args.study_dir]
            if args.probe:command.append('--probe')
            native=run('native-probe' if args.probe else 'native-complete',command)
            proof=validate_native(native_path,args.study_dir,verifier,args.probe)
            native.update(proof)
            if native['exit_code']!=0:native['status']='failed'
        write_report(report_path,report)
        if not args.probe:
            (args.study_dir/'export-validation.json').unlink(missing_ok=True)
            run('explicit-export-validation',['node','tools/blender/catalog/verify_catalog_female_outfit_exports.mjs','--study-dir='+str(args.study_dir)],lambda:validate_output(args.study_dir/'export-validation.json','exports',args.study_dir))
            for label,folder in [('combined',args.study_dir),*[(id,args.study_dir/'pieces'/id) for id in recipe_of(args.study_dir)]]:
                for name in ['body','garments','outfit']:
                    output=folder/(name+'-material-report.json');output.unlink(missing_ok=True)
                    run('material-'+label+'-'+name,['node','tools/blender/catalog/verify_exported_materials.mjs',folder/(name+'.glb'),output],lambda:validate_output(output,'material',args.study_dir,folder/(name+'.glb')))
            parity=validate_parity(args.study_dir)
            if native['status']=='passed' and parity['status']=='passed':
                runtime=run('actual-three-skinning',['node','tools/blender/catalog/verify_catalog_female_outfit_runtime.mjs','--study-dir='+str(args.study_dir)],lambda:validate_output(args.study_dir/'runtime-deformation-report.json','runtime',args.study_dir));runtime['parity_inputs']=parity
                if runtime['exit_code']!=0:runtime['status']='failed'
            else:rows.append({'gate':'actual-three-skinning','status':'skipped','reason':'No current successful native/export parity','parity':parity})
        finish_report(report_path,report)
    except BaseException as error:
        report['status']='interrupted' if isinstance(error,(KeyboardInterrupt,SystemExit)) else 'failed';report['exception']=repr(error);write_report(report_path,report);raise
    print(json.dumps({'status':report['status'],'gates':len(rows)}),flush=True)
    if report['status']!='passed':sys.exit(1)

if __name__=='__main__':main()
