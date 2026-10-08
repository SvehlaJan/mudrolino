"""Read-only audit of corrective provenance at B04's previously tolerated centre strip."""
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
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--report', type=Path, required=True)
    a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
    assert not a.report.exists()
    tools = local_dependencies(Path(__file__).parent, [Path(__file__).name])
    tools.update(snapshot_files(Path('tools/avatar')/n for n in ('blender_cli.py','blender_queue.py')))
    assert digest(SOURCE) == SOURCE_SHA
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
    obj = bpy.data.objects['B04_ivory_trousers']; keys = obj.data.shape_keys.key_blocks
    rows = []
    for v in obj.data.vertices:
        if abs(v.co.x) >= .04 or not .78 <= v.co.z <= .95:
            continue
        left = keys['knee_clearance_Left'].data[v.index].co - keys['Basis'].data[v.index].co
        right = keys['knee_clearance_Right'].data[v.index].co - keys['Basis'].data[v.index].co
        if max(left.length, right.length) < 1e-7:
            continue
        rows.append({'vertex': v.index, 'point': list(v.co), 'left_delta_m': list(left), 'right_delta_m': list(right),
            'left_right_delta_difference_m': (left-right).length,
            'skin': {obj.vertex_groups[w.group].name: w.weight for w in v.groups}})
    assert_snapshot(tools); assert digest(SOURCE) == SOURCE_SHA
    a.report.parent.mkdir(parents=True, exist_ok=True)
    report = {'status':'read-only centre-strip audit; no repair proposed or source saved', 'source':str(SOURCE),
        'source_sha256':SOURCE_SHA,'source_unchanged':True,'tool_hashes':tools,'vertices':rows,
        'scope':'Exact source deltas/skin for abs(X)<40mm and Z=780..950mm. Equality is evidence of inherited coordinates, not alone proof that removing them clears motion.'}
    a.report.write_text(json.dumps(report,indent=2)+'\n')
    print('B04_CENTRE_KEYS',json.dumps({'samples':len(rows),'left_positive_inherited_equal':sum(r['point'][0]>0 and r['left_right_delta_difference_m']<1e-7 for r in rows),'right_negative_inherited_equal':sum(r['point'][0]<0 and r['left_right_delta_difference_m']<1e-7 for r in rows)}))


if __name__ == '__main__': main()
