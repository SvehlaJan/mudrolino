"""Reconstruct only the proven paired lining normal fan at 2.5mm thickness."""
import json
import math
import sys


def plan_lining(pairs):
    outer={p['outer'] for p in pairs};inner={p['inner'] for p in pairs}
    assert len(outer)==len(inner)==len(pairs) and not outer&inner, 'Layer mapping must be one-to-one'
    changes=[];thickness=.0025
    for row in pairs:
        for key in ('rest_outer','rest_inner','outer_after','outer_normal_after'):
            assert len(row[key])==3 and all(math.isfinite(x) for x in row[key]), 'Finite xyz required'
        normal=row['outer_normal_after']
        assert abs(math.sqrt(sum(v*v for v in normal))-1)<1e-4, 'Unit outer normal required'
        if not row['affected_normal_fan']:continue
        new_inner=[row['outer_after'][a]-thickness*normal[a] for a in range(3)]
        for i,before,after,role in [(row['outer'],row['rest_outer'],row['outer_after'],'outer panel'),
            (row['inner'],row['rest_inner'],new_inner,'paired lining')]:
            delta=[after[a]-before[a] for a in range(3)]
            if math.sqrt(sum(v*v for v in delta))>1e-8:
                changes.append({'index':i,'before':before,'after':after,'delta':delta,'role':role,
                    'paired_outer':row['outer'],'paired_inner':row['inner']})
    return {'changes':sorted(changes,key=lambda c:c['index']),'thickness_m':thickness,
        'affected_inner_vertices':[p['inner'] for p in pairs if p['affected_normal_fan']],
        'scope':'Outer separation from the previous probe; local lining follows the proved paired outer normal fan. Translate existing target coordinates by the same vertex delta; retain skin and all other fields. Clearance still requires complete screening.'}


if __name__=='__main__':print(json.dumps(plan_lining(**json.load(sys.stdin))))
