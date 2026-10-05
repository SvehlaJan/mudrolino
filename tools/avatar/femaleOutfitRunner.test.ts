import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runner = resolve('tools/blender/catalog/run_catalog_female_outfit_study.py');
const fixture = `import importlib.util,json,tempfile
from pathlib import Path
from types import SimpleNamespace
import os,sys
spec=importlib.util.spec_from_file_location('runner',__import__('sys').argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
mode=__import__('sys').argv[2]
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp); study=root/'study';study.mkdir(); report=root/'runner.json'
 (study/'outfit.blend').write_bytes(b'blend');(study/'outfit.glb').write_bytes(b'glb'); verifier=root/'verifier.py';verifier.write_text('proof')
 native=study/'fit-verification-report.json'
 for folder in [study,*[study/'pieces'/id for id in ['T02','B01','F01']]]:
  folder.mkdir(parents=True,exist_ok=True)
  for name in ['body','garments','outfit']:(folder/(name+'.glb')).write_bytes(name.encode())
 fixture=root/'fixed.blend';fixture.write_bytes(b'fixed');(root/'sample-face.png').write_bytes(b'png')
 assembly={'foundation':str(fixture),'pieces':{id:{'source':str(fixture),'source_blend':str(fixture)} for id in ['T02','B01','F01']}}
 (study/'assembly-report.json').write_text(json.dumps(assembly))
 gaits={motion:m.digest('assets/avatar/catalog-a/foundation/catalog-body-'+motion+'.glb') for motion in ['walk','run']}
 helper=m.digest('tools/blender/catalog/catalog_gltf_gait_pose.py')
 valid={'status':'passed','profile':'complete sampled fit/export','blend_sha256':m.digest(study/'outfit.blend'),'glb_sha256':m.digest(study/'outfit.glb'),'verifier_sha256':m.digest(verifier),'motion_fit':{key:[{}]*163 for key in ['T02','B01','F01','combined']},'head_gestures':[{}]*6,'detail_attachments':{'checks':[{'piece':piece,'role':role} for piece,role in [('T02',1),('T02',2),('B01',3),('F01',4)] for _ in range(164)]},'export_deformation':{'samples':16},'failures':[],'dependency_hashes':m.expected_dependencies(study),'actual_runtime_fit':{'pose_evaluation':'raw-gltf-SLERP-equivalent-pose','motion_fit':{key:[{}]*163 for key in ['T02','B01','F01','combined']},'helper_sha256':helper,'gait_hashes':gaits,'detail_attachments':{'checks':[{'piece':piece,'role':role} for piece,role in [('T02',1),('T02',2),('B01',3),('F01',4)] for _ in range(164)]}}}
 try:
  if mode=='missing': print(json.dumps(m.validate_native(native,study,verifier,False)))
  elif mode in ['valid','stale','failed','counts','dependency','helper']:
   if mode=='stale':valid['blend_sha256']='old'
   if mode=='failed':valid['status']='failed'
   if mode=='counts':valid['motion_fit']['T02']=[]
   if mode=='dependency':fixture.write_bytes(b'changed-fixed')
   if mode=='helper':valid['dependency_hashes'][str(Path('tools/blender/catalog/build_catalog_t01.py').resolve())]='old-helper'
   native.write_text(json.dumps(valid));print(json.dumps(m.validate_native(native,study,verifier,False)))
  elif mode in ['main-missing-startup','main-empty-exports','main-empty-material','main-empty-runtime']:
   # Drive main with commands that succeed. Missing JSON must still fail.
   report_dir=root/'reports';report_dir.mkdir();main_report=report_dir/'runner-report.json';main_report.write_text(json.dumps({'status':'passed'}))
   native.write_text(json.dumps(valid))
   parity={'status':'passed','max_error_m':.000001,'checks':[{}]*16,'blend_sha256':m.digest(study/'outfit.blend'),'glb_sha256':m.digest(study/'outfit.glb'),'pose_evaluation':'raw-gltf-SLERP-equivalent-pose','pose_helper_sha256':helper,'gait_hashes':gaits}
   (study/'export-deformation-report.json').write_text(json.dumps(parity));(study/'runtime-samples.json').write_text(json.dumps(parity))
   def fake_run(command,**kwargs):
    name=command[1]
    if name.endswith('verify_catalog_female_outfit_exports.mjs') and mode!='main-empty-exports':
     exports={'status':'passed','source_blend_sha256':m.digest(study/'outfit.blend'),'checks':[{'target':str(folder/(part+'.glb')),'sha256':m.digest(folder/(part+'.glb')),'issues':{'numErrors':0,'numWarnings':0}} for folder in [study,*[study/'pieces'/id for id in ['T02','B01','F01']]] for part in ['body','garments','outfit']]}
     (study/'export-validation.json').write_text(json.dumps(exports))
    if name.endswith('verify_exported_materials.mjs') and mode!='main-empty-material':
     Path(command[3]).write_text(json.dumps({'status':'passed','target':str(command[2]),'sha256':m.digest(command[2]),'primitives':[{}]}))
    if name.endswith('verify_catalog_female_outfit_runtime.mjs') and mode!='main-empty-runtime':
     output={**parity,'runtime_samples_sha256':m.digest(study/'runtime-samples.json'),'deformation_report_sha256':m.digest(study/'export-deformation-report.json'),'unmatched_samples':0,'combined_error_bound_m':.000002}
     (study/'runtime-deformation-report.json').write_text(json.dumps(output))
    return SimpleNamespace(returncode=0)
   m.subprocess.run=fake_run;os.environ['TEO_LEARN_BLENDER_QUEUE_ACTIVE']='1'
   sys.argv=['runner','--study-dir',str(study),'--report-dir',str(report_dir),'--reuse-native']
   if mode=='main-missing-startup':(study/'outfit.glb').unlink()
   try:m.main()
   except (SystemExit,OSError):pass
   print(json.dumps(json.loads(main_report.read_text())))
  elif mode=='interrupted':
   report.write_text(json.dumps({'status':'passed'}));state=m.start_report(report,study,'captured-runner-hash',False);print(json.dumps(json.loads(report.read_text())))
  elif mode=='skip':
   state=m.start_report(report,study,'captured-runner-hash',False);state['gates']=[{'gate':'native','status':'failed','exit_code':0},{'gate':'runtime','status':'skipped','reason':'no parity'}];m.finish_report(report,state);print(json.dumps(json.loads(report.read_text())))
 except Exception as error:print(json.dumps({'error':str(error)}))
`;
function run(mode: string) {
  const result = spawnSync('python3', ['-c', fixture, runner, mode], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split('\n').at(-1)!);
}
describe('female outfit gate report freshness', () => {
  it('accepts complete current source-bound native proof and binds report bytes', () => {
    expect(run('valid')).toMatchObject({ status: 'passed', report_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });
  it('rejects stale, failed and incomplete native proof despite a successful command', () => {
    for (const mode of ['stale', 'failed', 'counts', 'dependency', 'helper']) expect(run(mode)).toMatchObject({ status: 'failed' });
  });
  it('invalidates prior success when a required source is missing at main startup', () => {
    expect(run('main-missing-startup')).toMatchObject({ status: 'failed', source_sha256: expect.any(String), outfit_glb_sha256: null });
  });
  it('fails full main when export, material or runtime commands exit zero without current JSON', () => {
    for (const mode of ['main-empty-exports', 'main-empty-material', 'main-empty-runtime']) {
      const report = run(mode);
      expect(report.status).toBe('failed');
      expect(report.gates.some((gate: { status: string }) => gate.status === 'failed')).toBe(true);
    }
  });
  it('rejects missing native JSON despite exit zero', () => { expect(run('missing')).toMatchObject({ status: 'failed' }); });
  it('replaces prior success with running state before an interrupted command', () => {
    expect(run('interrupted')).toMatchObject({ status: 'running', runner_sha256: 'captured-runner-hash', gates: [] });
  });
  it('retains failed and skipped gates and cannot call exit zero a pass', () => {
    expect(run('skip')).toMatchObject({ status: 'failed', gates: [{ status: 'failed' }, { status: 'skipped' }] });
  });
});
