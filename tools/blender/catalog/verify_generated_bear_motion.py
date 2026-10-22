"""Compare native generated-bear poses with actual Three.js sampled vertices."""
import argparse
from array import array
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

sys.path.insert(0,str(Path(__file__).resolve().parent))
from bear_companion_common import digest, write_json
from build_catalog_t01 import world_mesh


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend',required=True,type=Path)
    parser.add_argument('--glb',required=True,type=Path)
    parser.add_argument('--samples',required=True,type=Path)
    parser.add_argument('--report',required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    samples=json.loads(args.samples.read_text())
    binary=args.samples.parent/'positions.bin'
    if samples['status']!='passed' or samples['glb_sha256']!=digest(args.glb):
        raise ValueError('Runtime samples must pass and bind the intended GLB')
    if samples['positions_sha256']!=digest(binary):
        raise ValueError('Runtime vertex payload checksum mismatch')
    if len(samples['meshes'])!=1 or samples['frame_count']!=169:
        raise ValueError('Expected one fused bear surface and all169 poses')
    bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
    mesh=bpy.data.objects['Bear_fixed_outfit']
    scene=bpy.context.scene
    correspondence=None
    reverse_correspondence=None
    frames=[]
    with binary.open('rb') as payload:
        for row in samples['frames']:
            frame=row['frame']
            scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame))
            bpy.context.view_layer.update()
            native,faces=world_mesh(mesh)
            values=array('f')
            values.frombytes(payload.read(samples['stride']*4))
            if len(values)!=samples['stride']:
                raise ValueError('Truncated sampled geometry')
            runtime=[Vector(values[i:i+3]) for i in range(0,len(values),3)]
            if correspondence is None:
                tree=KDTree(len(native))
                used=sorted({index for face in faces for index in face})
                for index in used:
                    tree.insert(native[index],index)
                tree.balance()
                correspondence=[tree.find(point)[1] for point in runtime]
                reverse_tree=KDTree(len(runtime))
                for index,point in enumerate(runtime):
                    reverse_tree.insert(point,index)
                reverse_tree.balance()
                reverse_correspondence=[(index,reverse_tree.find(native[index])[1]) for index in used]
            maximum=max((point-native[index]).length for point,index in zip(runtime,correspondence))
            maximum=max(maximum,max((native[index]-runtime[other]).length
                                    for index,other in reverse_correspondence))
            frames.append({'frame':frame,'maximum_vertex_error_m':maximum,
                           'native_floor_m':min(p.z for p in native),'runtime_floor_m':row['floor']})
    worst=max(row['maximum_vertex_error_m'] for row in frames)
    floor=min(min(row['native_floor_m'],row['runtime_floor_m']) for row in frames)
    passed=worst<=.00003 and floor>=-.007
    report={'status':'passed' if passed else 'failed',
            'scope':'Bidirectional fixed vertex correspondence established in first pose, then evaluated for all169 native/runtime poses; not separate-garment fit or wardrobe proof',
            'blend':str(args.blend),'blend_sha256':digest(args.blend),
            'glb':str(args.glb),'glb_sha256':digest(args.glb),
            'samples_sha256':digest(args.samples),'positions_sha256':digest(binary),
            'verifier_sha256':digest(Path(__file__)),'blender_version':bpy.app.version_string,
            'frame_count':len(frames),'maximum_vertex_error_m':worst,'tolerance_m':.00003,
            'minimum_floor_m':floor,'runtime_vertices':len(correspondence),'frames':frames}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    write_json(args.report,report)
    print(json.dumps({k:report[k] for k in ['status','frame_count','maximum_vertex_error_m','minimum_floor_m']}))
    if not passed:
        raise RuntimeError('Generated bear native/runtime parity failed')


if __name__=='__main__':
    main()
