"""Inventory every B04 corrective coordinate without a centre or height exclusion."""
import argparse
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_catalog_b04_pockets import SOURCE, SOURCE_SHA
from b04_tool_inventory import local_dependencies, snapshot_files, assert_snapshot
from repair_catalog_b04_corrective_sides import digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not args.report.exists()
    assert digest(SOURCE) == SOURCE_SHA
    tools = local_dependencies(Path(__file__).parent, [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj = bpy.data.objects['B04_ivory_trousers']; keys = obj.data.shape_keys.key_blocks
    points = {name: [list(p.co) for p in keys[name].data] for name in ('Basis','knee_clearance_Left','knee_clearance_Right')}
    opposite, intended = [], []
    for i, v in enumerate(keys['Basis'].data):
        left = keys['knee_clearance_Left'].data[i].co-v.co
        right = keys['knee_clearance_Right'].data[i].co-v.co
        for side, sign, delta in [('Left',1,left),('Right',-1,right)]:
            if delta.length <= 1e-7:
                continue
            row = {'vertex':i,'key':side,'point':list(v.co),'delta_m':list(delta),
                'delta_length_m':delta.length,'left_right_difference_m':(left-right).length}
            if v.co.x*sign < 0:
                opposite.append(row)
            elif v.co.x*sign > 0:
                intended.append(row)
            else:
                raise AssertionError(('Nonzero correction on exact centre axis',row))
    assert_snapshot(tools); assert digest(SOURCE) == SOURCE_SHA
    args.report.parent.mkdir(parents=True,exist_ok=True)
    report = {'status':'read-only complete coordinate inventory', 'source':str(SOURCE),'source_sha256':SOURCE_SHA,
        'source_unchanged':True,'tool_hashes':tools,'points':points,'opposite':opposite,'intended':intended,
        'tolerance_m':1e-7,'vertex_count':len(obj.data.vertices),
        'scope':'Every vertex of the saved garment, both knee keys, signed world X without a 40mm centre exclusion or Z crop. Rig/body/key values unchanged.'}
    args.report.write_text(json.dumps(report,indent=2)+'\n')
    print('B04_COMPLETE_KEY_INVENTORY',json.dumps({'opposite':{s:sum(r['key']==s for r in opposite) for s in ('Left','Right')},
        'intended':{s:sum(r['key']==s for r in intended) for s in ('Left','Right')},'max_removed_m':max((r['delta_length_m'] for r in opposite),default=0),
        'all_opposite_equal_left':all(r['key']=='Right' and r['left_right_difference_m']<1e-7 for r in opposite)}))


if __name__ == '__main__': main()
