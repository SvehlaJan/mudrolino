import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const extractor = resolve('tools/avatar/extract_catalog_female_foundation_proof.py');
const fixture = `import importlib.util,json,tempfile,hashlib,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('extractor',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
mode=sys.argv[2]
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp); study=root/'study';study.mkdir();history=root/'history'
 report=json.loads(Path('assets/avatar/catalog-a/female/foundation/studies/h02-envelope/foundation-verification-report.json').read_text())
 def file(name):
  path=study/name;path.write_bytes(name.encode());return path
 blend=file('female-foundation.blend');glb=file('female-foundation.glb');original=file('original.blend');image=file('sample-face.png');mask=file('canonical-face-mask.png')
 exports={name:m.digest(file(name)) if name!='female-foundation.glb' else m.digest(glb) for name in ['female-foundation.glb','H02.glb','hair-H02.glb']}
 layout={'mask':'canonical-face-mask.png','mask_sha256':m.digest(mask),'diagnostic_image':'sample-face.png','image_sha256':m.digest(image)}
 (study/'canonical-face-layout.json').write_text(json.dumps(layout))
 saved={'source':str(original),'source_sha256':m.digest(original),'builder_sha256':m.digest(m.BUILDER),'face_image_source':str(image),'face_image_sha256':m.digest(image),'exports':exports}
 (study/'study-report.json').write_text(json.dumps(saved))
 report.update(source_blend=str(blend),source_sha256=m.digest(blend),glb=str(glb),glb_sha256=m.digest(glb),verifier_sha256=m.digest(m.VERIFIER))
 report['face_transport'].update(canonical_layout_sha256=m.digest(study/'canonical-face-layout.json'),embedded_sha256=m.digest(image))
 if mode=='stale-source':blend.write_bytes(b'changed')
 if mode=='stale-export':glb.write_bytes(b'changed')
 if mode=='stale-original':original.write_bytes(b'changed')
 if mode=='stale-verifier':report['verifier_sha256']='old'
 if mode=='stale-builder':saved['builder_sha256']='old';(study/'study-report.json').write_text(json.dumps(saved))
 if mode=='stale-image':image.write_bytes(b'changed')
 if mode=='stale-mask':mask.write_bytes(b'changed')
 if mode=='stale-layout':(study/'canonical-face-layout.json').write_text('{}')
 if mode=='stale-head':(study/'H02.glb').write_bytes(b'changed')
 if mode=='failed':report['status']='failed'
 if mode=='failures':report['failures']=[{'gate':'real_failure'}]
 if mode=='incomplete-hair':report['hair_clearance']['checks'].pop()
 if mode=='missing-endpoint':report['hair_clearance']['checks'][0]['frame']=1.0
 if mode=='incomplete-export':report['export_deformation']['checks'].pop()
 if mode=='missing-deep-kick':report['export_deformation']['checks'][10]['frame']=8.0
 if mode=='negative-not-rejected':report['face_transport']['negative_uv_permutation_probe']['rejected']=False
 if mode=='missing-uv-errors':
  for row in report['face_transport']['reimport_uv_corner_identity'].values():
   if isinstance(row,dict):row.pop('maximum_uv_error',None)
 if mode=='wrong-face-contract':report['face_transport'].update(material='wrong',uv_layer='wrong')
 comprehensive=study/'foundation-verification-report.json';comprehensive.write_text(json.dumps(report))
 old={name:('historical '+name).encode() for name in m.REPORTS}
 for name,contents in old.items():(study/name).write_bytes(contents)
 before={str(path):m.digest(path) for path in study.iterdir()}
 if mode=='history-conflict':
  history.mkdir();(history/'face-transport-report.json').write_bytes(b'immutable earlier history')
 if mode in ['history-symlink','history-hardlink']:
  history.mkdir();target=history/'face-transport-report.json';source=study/'face-transport-report.json'
  if mode=='history-symlink':target.symlink_to(source)
  else:target.hardlink_to(source)
 try:
  result=m.extract_reports(study,history)
  current={name:json.loads((study/name).read_text()) for name in m.REPORTS}
  print(json.dumps({'result':result,'current':current,'history_unchanged':all((history/name).read_bytes()==data for name,data in old.items()),'source_unchanged':all(m.digest(Path(path))==hash for path,hash in before.items() if Path(path).name not in m.REPORTS)}))
 except Exception as error:
  print(json.dumps({'error':str(error),'unchanged':all(m.digest(Path(path))==hash for path,hash in before.items()),'history_exists':history.exists()}))
`;
function run(mode: string) {
  const result = spawnSync('python3', ['-c', fixture, extractor, mode], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout.trim().split('\n').at(-1)!);
}
describe('H02 focused evidence extraction', () => {
  it('derives scopes from current comprehensive bytes and preserves historical reports and source files', () => {
    const value = run('valid');
    expect(value).toMatchObject({ history_unchanged: true, source_unchanged: true });
    for (const report of Object.values(value.current)) {
      expect(report).toMatchObject({ status: 'passed', report_origin: 'derived from existing comprehensive Blender verification; no independent rerun', comprehensive_report_sha256: expect.stringMatching(/^[a-f0-9]{64}$/), dependency_hashes: expect.any(Object) });
    }
    expect(value.current['hair-clearance-report.json'].hair_clearance).toMatchObject({ motion_samples: 163, gesture_samples: 6, maximum_pairs: 0 });
    expect(value.current['export-deformation-report.json'].export_deformation).toMatchObject({ pose_count: 16 });
    expect(value.current['face-transport-report.json'].face_transport.negative_uv_permutation_probe.rejected).toBe(true);
  });
  it('rejects every stale bound file before changing current or historical evidence', () => {
    for (const mode of ['stale-source','stale-export','stale-original','stale-verifier','stale-builder','stale-image','stale-mask','stale-layout','stale-head']) expect(run(mode)).toMatchObject({ error: expect.any(String), unchanged: true, history_exists: false });
  });
  it('refuses to overwrite existing historical evidence', () => {
    expect(run('history-conflict')).toMatchObject({ error: expect.stringContaining('History already contains different bytes'), unchanged: true, history_exists: true });
  });
  it('rejects historical symlink and hardlink aliases before rewriting any evidence', () => {
    for (const mode of ['history-symlink', 'history-hardlink']) expect(run(mode)).toMatchObject({ error: expect.any(String), unchanged: true });
  });
  it('rejects incomplete UV errors or a different canonical face contract', () => {
    for (const mode of ['missing-uv-errors', 'wrong-face-contract']) expect(run(mode)).toMatchObject({ error: expect.any(String), unchanged: true, history_exists: false });
  });
  it('rejects failure, missing samples, duplicate endpoint/deep-kick poses and an ineffective UV probe', () => {
    for (const mode of ['failed','failures','incomplete-hair','missing-endpoint','incomplete-export','missing-deep-kick','negative-not-rejected']) expect(run(mode)).toMatchObject({ error: expect.any(String), unchanged: true, history_exists: false });
  });
});
