"""Independent glTF gait TRS evaluation; temporary equivalent Blender poses.

Does not mutate saved actions or geometry. Quaternion LINEAR means shortest-arc
SLERP per glTF, rather than Blender scalar quaternion curve interpolation.
"""
from __future__ import annotations
import bisect
import hashlib
import json
import math
import struct
from pathlib import Path


def quaternion_slerp(left, right, fraction):
    if len(left) != 4 or len(right) != 4 or not 0 <= fraction <= 1:
        raise ValueError('Invalid quaternion interpolation input')
    if not all(math.isfinite(v) for v in [*left, *right, fraction]):
        raise ValueError('Nonfinite quaternion')
    if abs(sum(v*v for v in left)-1) > 1e-4 or abs(sum(v*v for v in right)-1) > 1e-4:
        raise ValueError('Quaternion must be normalized')
    if fraction == 0: return list(left)
    if fraction == 1: return list(right)
    dot = sum(a*b for a,b in zip(left,right))
    end = list(right)
    if dot < 0: dot = -dot; end = [-v for v in end]
    if 1-dot*dot <= 2.220446049250313e-16:
        result = [a+(b-a)*fraction for a,b in zip(left,end)]
        length = math.sqrt(sum(v*v for v in result))
        return [v/length for v in result]
    angle = math.acos(min(1,dot)); denominator = math.sin(angle)
    first = math.sin((1-fraction)*angle)/denominator
    second = math.sin(fraction*angle)/denominator
    return [a*first+b*second for a,b in zip(left,end)]


def interpolate_track(times, values, time, interpolation, rotation=False):
    if interpolation not in ('LINEAR','STEP'): raise ValueError('Unsupported interpolation '+interpolation)
    if not times or len(times) != len(values) or any(not math.isfinite(v) for v in times) or any(b <= a for a,b in zip(times,times[1:])):
        raise ValueError('Animation times must be finite and strictly increasing')
    width = 4 if rotation else 3
    if any(len(v) != width or any(not math.isfinite(x) for x in v) for v in values) or not math.isfinite(time):
        raise ValueError('Invalid animation values')
    if time <= times[0]: return list(values[0])
    if time >= times[-1]: return list(values[-1])
    index = bisect.bisect_right(times,time)-1
    if interpolation == 'STEP': return list(values[index])
    fraction = (time-times[index])/(times[index+1]-times[index])
    if rotation: return quaternion_slerp(values[index],values[index+1],fraction)
    return [a+(b-a)*fraction for a,b in zip(values[index],values[index+1])]


def multiply(left,right):
    return [[sum(left[i][k]*right[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def compose(translation,rotation,scale):
    x,y,z,w=rotation; sx,sy,sz=scale
    return [[(1-2*(y*y+z*z))*sx,2*(x*y-z*w)*sy,2*(x*z+y*w)*sz,translation[0]],
            [2*(x*y+z*w)*sx,(1-2*(x*x+z*z))*sy,2*(y*z-x*w)*sz,translation[1]],
            [2*(x*z-y*w)*sx,2*(y*z+x*w)*sy,(1-2*(x*x+y*y))*sz,translation[2]],
            [0,0,0,1]]


class RawGltf:
    def __init__(self,path):
        self.path=Path(path); payload=self.path.read_bytes();self.sha256=hashlib.sha256(payload).hexdigest()
        if len(payload)<20 or struct.unpack_from('<III',payload) != (0x46546c67,2,len(payload)): raise ValueError('Invalid GLB header')
        offset=12; chunks={}
        while offset<len(payload):
            length,kind=struct.unpack_from('<II',payload,offset);offset+=8
            if offset+length>len(payload) or kind in chunks: raise ValueError('Invalid GLB chunks')
            chunks[kind]=payload[offset:offset+length];offset+=length
        self.document=json.loads(chunks[0x4e4f534a]);self.binary=chunks.get(0x004e4942,b'')
        self.nodes=self.document['nodes'];self.names={}
        for i,node in enumerate(self.nodes):
            if node.get('name'):
                if node['name'] in self.names: raise ValueError('Duplicate glTF node name')
                self.names[node['name']]=i
        self.parents={}
        for i,node in enumerate(self.nodes):
            for child in node.get('children',[]):
                if child in self.parents: raise ValueError('Multiple glTF node parents')
                self.parents[child]=i

    def accessor(self,index):
        accessor=self.document['accessors'][index]
        if accessor.get('sparse') or accessor['componentType'] != 5126 or accessor.get('normalized'): raise ValueError('Unsupported animation accessor')
        widths={'SCALAR':1,'VEC3':3,'VEC4':4}
        if accessor['type'] not in widths: raise ValueError('Unsupported animation accessor width')
        width=widths[accessor['type']];view=self.document['bufferViews'][accessor['bufferView']]
        if view.get('buffer',0)!=0: raise ValueError('External animation buffer unsupported')
        start=view.get('byteOffset',0)+accessor.get('byteOffset',0);stride=view.get('byteStride',width*4)
        if stride<width*4 or accessor.get('byteOffset',0)+(accessor['count']-1)*stride+width*4>view['byteLength']: raise ValueError('Animation accessor bounds')
        return [list(struct.unpack_from('<'+'f'*width,self.binary,start+i*stride)) for i in range(accessor['count'])]

    def world(self, overrides=None):
        overrides=overrides or {}; result={}; visiting=set()
        def visit(index):
            if index in result:return result[index]
            if index in visiting:raise ValueError('Cyclic glTF nodes')
            visiting.add(index);node=self.nodes[index];change=overrides.get(node.get('name'),{})
            if 'matrix' in node:
                if change:raise ValueError('Animated matrix node unsupported')
                m=node['matrix'];local=[[m[j*4+i] for j in range(4)] for i in range(4)]
            else:local=compose(change.get('translation',node.get('translation',[0,0,0])),change.get('rotation',node.get('rotation',[0,0,0,1])),change.get('scale',node.get('scale',[1,1,1])))
            result[index]=multiply(visit(self.parents[index]),local) if index in self.parents else local
            visiting.remove(index);return result[index]
        for index in range(len(self.nodes)):visit(index)
        return {name:result[index] for name,index in self.names.items()}

    def channels(self,time,loop=True):
        animations=self.document.get('animations',[])
        if len(animations)!=1: raise ValueError('Expected exactly one gait animation')
        animation=animations[0];tracks=[];duration=0
        for channel in animation['channels']:
            target=channel['target'];node=self.nodes[target['node']];name=node.get('name');kind=target['path']
            if not name or kind not in ('rotation','translation','scale'):raise ValueError('Unsupported glTF animation target')
            sampler=animation['samplers'][channel['sampler']]
            times=[v[0] for v in self.accessor(sampler['input'])];values=self.accessor(sampler['output'])
            interpolation=sampler.get('interpolation','LINEAR');duration=max(duration,times[-1]);tracks.append((name,kind,times,values,interpolation))
        if not duration>0:raise ValueError('Invalid gait duration')
        if loop:time=time%duration
        output={}
        for name,kind,times,values,interpolation in tracks:
            target=output.setdefault(name,{})
            if kind in target:raise ValueError('Duplicate animation property')
            target[kind]=interpolate_track(times,values,time,interpolation,rotation=kind=='rotation')
        return output


class RuntimeGaitPose:
    """Capture reset native rig; apply glTF world deltas in parent-first order."""
    def __init__(self,model_glb,gaits,armature):
        from mathutils import Matrix
        self.model=RawGltf(model_glb);self.gaits={name:RawGltf(path) for name,path in gaits.items()};self.armature=armature
        self.rest=self.model.world();self.native_rest={bone.name:armature.matrix_world@bone.matrix.copy() for bone in armature.pose.bones}
        self.conversion=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
        self.order=sorted(armature.pose.bones,key=lambda bone:len(bone.parent_recursive))
        if any(bone.name not in self.rest for bone in self.order):raise ValueError('Missing glTF rig bones')
        self.inverse_rest={bone.name:Matrix(self.rest[bone.name]).inverted() for bone in self.order}
        self.hashes={'model':self.model.sha256,**{name:gait.sha256 for name,gait in self.gaits.items()}}

    def evaluated_world(self,motion,frame,fps):
        if not math.isfinite(frame) or not fps>0:raise ValueError('Invalid runtime frame/fps')
        if motion=='rest':return self.rest
        if motion not in self.gaits:raise ValueError('Unknown gait '+motion)
        return self.model.world(self.gaits[motion].channels(frame/fps))

    def apply(self,motion,frame,fps):
        import bpy
        from mathutils import Matrix
        world=self.evaluated_world(motion,frame,fps);arm=self.armature
        if arm.animation_data:arm.animation_data.action=None
        for bone in self.order:
            delta=self.conversion.inverted()@Matrix(world[bone.name])@self.inverse_rest[bone.name]@self.conversion
            bone.matrix=arm.matrix_world.inverted()@delta@self.native_rest[bone.name]
            bpy.context.view_layer.update()
        return {name:world[name] for name in self.native_rest}


def world_samples(model_glb,gaits,checks,fps):
    model=RawGltf(model_glb);clips={name:RawGltf(path) for name,path in gaits.items()}
    return [{'motion':row['motion'],'frame':row['frame'],'world':model.world({} if row['motion']=='rest' else clips[row['motion']].channels(row['frame']/fps))} for row in checks]


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model',required=True);parser.add_argument('--walk',required=True);parser.add_argument('--run',required=True);parser.add_argument('--samples',required=True)
    arguments=parser.parse_args();reference=json.loads(Path(arguments.samples).read_text())
    print(json.dumps(world_samples(arguments.model,{'walk':arguments.walk,'run':arguments.run},reference['checks'],reference['frames_per_second'])))
