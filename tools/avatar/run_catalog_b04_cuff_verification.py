"""Run fresh source-bound cuff detail/outfit/export/runtime gates in one queue."""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
sys.path.insert(0,str(Path('tools/blender/catalog').resolve()))
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from f02_ankle_measurement import schedule
from b04_cuff_verification_plan import REVISION, RECIPES, verification_plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args(); output = args.output
    steps = verification_plan(REVISION,output)
    assert os.environ.get('TEO_LEARN_BLENDER_QUEUE_ACTIVE'), 'Wrap the runner once through the shared queue'
    assert not output.exists(), 'Preserve previous proof'
    proofs = {name:json.loads((REVISION/name).read_text()) for name in ('pre-save-screen-report.json','preservation-report.json','export-report.json')}
    screen,preservation,exports = proofs.values()
    assert screen['status'] == preservation['status'] == 'passed' and screen['source_saved']
    expected = [(mode,row['motion'],row['frame']) for mode in ('native','runtime-equivalent') for row in schedule()]
    assert [(row['mode'],row['motion'],row['frame']) for row in screen['checks']] == expected
    assert all(row['visible_body_pairs'] == row['nonincident_cuff_self_pairs'] == 0 and row['shoe_layer_pairs'] == {'F01':0,'F03':0} for row in screen['checks'])
    for proof in proofs.values():
        assert_snapshot(proof['tool_hashes'])
        for field in ('protected_hashes','input_hashes','output_hashes'):
            if field in proof: assert_snapshot(proof[field])
    native_seeds = sorted({step['script'] for step in steps if step['kind'] == 'blender'})
    tools = local_dependencies(Path('tools/blender/catalog'),native_seeds)
    tools.update(snapshot_files([Path(__file__),Path('tools/avatar/b04_cuff_verification_plan.py'),
        Path('tools/avatar/blender_cli.py'),Path('tools/avatar/blender_queue.py'),
        Path('tools/avatar/verify_catalog_correctives.ts'),Path('src/avatar/garmentCorrectives.ts'),
        Path('tools/avatar/validate_gltf.js'),Path('tools/blender/catalog/verify_exported_materials.mjs'),Path('package-lock.json')]))
    # The reused pose inventory is itself a local helper dependency.
    tools.update(local_dependencies(Path('tools/blender/catalog'),['f02_ankle_measurement.py','b04_tool_inventory.py']))
    source_paths = [REVISION/name for name in ('B04.blend','B04.glb','body-B04.glb',*proofs)]
    source_paths += [Path('assets/avatar/catalog-a')/piece/(piece+'.blend') for piece in ('T01','F01','T04','F03')]
    source_paths += [Path('assets/avatar/catalog-a/foundation')/name for name in ('catalog-body.blend','catalog-body-walk.glb','catalog-body-run.glb')]
    source_paths += [Path('assets/avatar/catalog-a/B04')/name for name in ('B04.blend','B04.glb','body-B04.glb')]
    sources = snapshot_files(source_paths)
    assert screen['candidate_sha256'] == preservation['candidate_sha256'] == exports['source_sha256'] == sources[str(REVISION/'B04.blend')]
    output.mkdir(); (output/'independent').mkdir()
    staged = output/'staged-catalog'; staged.mkdir()
    for piece in ('T01','B04','F01','T04','F03'):
        source = REVISION if piece == 'B04' else Path('assets/avatar/catalog-a')/piece
        (staged/piece).symlink_to(os.path.relpath(source.resolve(),staged.resolve()),target_is_directory=True)
    records = [{'gate':'initial-328-pose-cuff-screen','status':'reused','report':str(REVISION/'pre-save-screen-report.json')},
        {'gate':'reopened-source-preservation','status':'reused','report':str(REVISION/'preservation-report.json')}]
    def write(complete=False):
        assert_snapshot(tools); assert_snapshot(sources)
        passed = all(row['status'] in ('passed','reused') for row in records)
        result = {'status':('passed' if complete else 'running') if passed else 'failed','complete':complete,
            'scope':'Fresh independent/body/detail and two cap-free outfit/export/actual-Three corrective gates. Current head and shoe geometry only; browser/art/budget/final compatibility remain separate.',
            'recipes':{name:list(pieces) for name,pieces,_ in RECIPES},'checks':records,'tool_hashes':tools,'source_hashes':sources}
        (output/'gate-report.json').write_text(json.dumps(result,indent=2)+'\n')
    write()
    for step in steps:
        assert_snapshot(tools); assert_snapshot(sources)
        if step['kind'] == 'blender': command = [sys.executable,'tools/avatar/blender_cli.py','tools/blender/catalog/'+step['script'],*step['args']]
        elif step['kind'] == 'tsx': command = ['node','--import','tsx',step['script'],*step['args']]
        else: command = ['node',step['script'],*step['args']]
        print('START',step['name'],flush=True); started = time.monotonic(); log = output/(step['name']+'-native-execution.txt')
        with log.open('w') as stream: process = subprocess.run(command,stdout=stream,stderr=subprocess.STDOUT)
        records.append({'gate':step['name'],'status':'passed' if process.returncode == 0 else 'failed',
            'exit_code':process.returncode,'command':command,'elapsed_s':round(time.monotonic()-started,3),'log':str(log)})
        write(); print(records[-1]['status'].upper(),step['name'],flush=True)
        if process.returncode != 0: write(complete=True); return 1
    write(complete=True); return 0


if __name__ == '__main__': sys.exit(main())
