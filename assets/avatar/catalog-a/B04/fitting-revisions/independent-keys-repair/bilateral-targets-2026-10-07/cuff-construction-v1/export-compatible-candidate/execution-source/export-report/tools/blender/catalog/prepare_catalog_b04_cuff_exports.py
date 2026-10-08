"""Export only the preserved isolated cuff source, without modifying its blend."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from inspect_catalog_b04_cuff import SOURCE
from build_catalog_t01 import reset, export
from repair_catalog_b04_corrective_sides import signature, normalized, digest
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision',type=Path,required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert args.revision.resolve().is_relative_to((SOURCE.parent/'cuff-construction-v1').resolve())
    candidate = args.revision/'B04.blend'
    proof = args.revision/'preservation-report.json'
    report = json.loads(proof.read_text())
    assert report['status'] == 'passed' and digest(candidate) == report['candidate_sha256']
    assert_snapshot(report['input_hashes']); assert_snapshot(report['tool_hashes'])
    tools = local_dependencies(Path('tools/blender/catalog'), [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/name for name in ('blender_cli.py','blender_queue.py')))
    protected = snapshot_files([candidate,proof,*map(Path,report['input_hashes'])])
    outputs = [args.revision/'B04.glb',args.revision/'body-B04.glb']
    assert not any(path.exists() for path in outputs), 'Preserve previous exports'
    bpy.ops.wm.open_mainfile(filepath=str(candidate.resolve()))
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    arm,obj,body = (bpy.data.objects[n] for n in ('Armature_Catalog','B04_ivory_trousers','body_underlayer_male'))
    reset(arm); before = normalized(signature())
    parts = [mesh for mesh in bpy.data.objects if mesh.type == 'MESH' and mesh not in (obj,body)]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    masked = bpy.data.objects.new('body_underlayer_male_B04',mesh)
    bpy.context.collection.objects.link(masked)
    assert [group.name for group in masked.vertex_groups] == [group.name for group in body.vertex_groups]
    masked.modifiers.new('Shared body skin','ARMATURE').object = arm; masked.parent = arm
    export(outputs[0],[arm,obj]); export(outputs[1],[arm,masked,*parts])
    bpy.data.objects.remove(masked,do_unlink=True); bpy.ops.outliner.orphans_purge(do_recursive=True)
    reset(arm); assert normalized(signature()) == before, 'Export changed active source fields'
    assert_snapshot(tools); assert_snapshot(protected)
    result = {'status':'exported; fidelity and fitting verification pending',
        'source':str(candidate),'source_sha256':digest(candidate),'blend_unchanged':True,
        'tool_hashes':tools,'input_hashes':protected,'output_hashes':snapshot_files(outputs),
        'scope':'Fresh explicit garment/body exports from the preserved isolated cuff source. No export-fidelity, outfit, runtime or art acceptance claim.'}
    (args.revision/'export-report.json').write_text(json.dumps(result,indent=2)+'\n')
    print('B04_CUFF_EXPORT',json.dumps(result),flush=True)


if __name__ == '__main__': main()
