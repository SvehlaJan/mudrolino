"""One bounded rest-panel separation hypothesis; no fitting acceptance implied."""
import json
import math
import sys


def plan_inseam(vertices):
    seen = set(); changes = []
    for vertex in vertices:
        i, point, layer, delta = (vertex[k] for k in ('index','point','layer','path_delta'))
        assert i not in seen, 'Duplicate source index'
        seen.add(i)
        assert layer in (0,1), 'Unknown fabric layer'
        assert len(point)==3 and all(math.isfinite(v) for v in [*point,delta])
        x,y,z = point
        # Shared seam paths have sub-5mm imbalance from existing asymmetry.
        # Retain them instead of declaring a lower-leg branch there.
        if not (.65<z<.775 and abs(x)<.04 and abs(delta)>=.005):continue
        sign = 1 if delta<0 else -1
        minimum = .004 if layer==0 else .0065
        oriented = x*sign
        if oriented>=minimum:continue
        amount = min(1,(z-.65)/.05)*min(1,(.775-z)/.02)
        after_x = sign*(minimum if amount==1 else oriented+(minimum-oriented)*amount)
        after = [after_x,y,z]
        changes.append({'index':i,'before':point,'after':after,'delta':[after_x-x,0,0],
            'layer':layer,'branch':'Left' if sign==1 else 'Right','path_delta_m':delta})
    return {'changes':changes,'boundary':{'z_m':[.65,.775],'abs_x_m':.04,'minimum_path_imbalance_m':.005,
        'outer_floor_m':.004,'inner_floor_m':.0065},'scope':'X-only fabric rest proposal. Translate every existing target by the same vertex delta; retain target deltas, skin, topology, body, cuffs and all details. Dense clearance still required.'}


if __name__=='__main__':print(json.dumps(plan_inseam(**json.load(sys.stdin))))
