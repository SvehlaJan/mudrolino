import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const helper = resolve('tools/blender/catalog/catalog_gltf_gait_pose.py');
function evaluate(code: string): unknown {
  const result = spawnSync('python3', ['-c', `import importlib.util,json,math,sys
spec=importlib.util.spec_from_file_location('gltf_gait',sys.argv[1])
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
${code}`, helper], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || String(result.error));
  return JSON.parse(result.stdout);
}
describe('independent glTF gait interpolation', () => {
  it('uses constant angular velocity SLERP at an asymmetric sample, unlike scalar NLERP', () => {
    const angle = Math.PI * 2 / 3;
    const value = evaluate(`print(json.dumps(m.quaternion_slerp([0,0,0,1],[0,0,math.sin(math.pi/3),math.cos(math.pi/3)],.25)))`) as number[];
    expect(value[2]).toBeCloseTo(Math.sin(angle / 8), 12);
    expect(value[3]).toBeCloseTo(Math.cos(angle / 8), 12);
  });
  it('takes the shortest arc when equivalent endpoint quaternions have opposite signs', () => {
    expect(evaluate('print(json.dumps(m.quaternion_slerp([0,0,0,1],[0,0,0,-1],.4)))')).toEqual([0, 0, 0, 1]);
  });
  it('clamps track boundaries and keeps STEP values until the next key', () => {
    expect(evaluate(`t=[1,2,3];v=[[0,0,0],[2,4,6],[4,8,12]]
print(json.dumps([m.interpolate_track(t,v,-1,'LINEAR'),m.interpolate_track(t,v,4,'LINEAR'),m.interpolate_track(t,v,1.5,'STEP'),m.interpolate_track(t,v,2,'STEP'),m.interpolate_track(t,v,1.5,'LINEAR')]))`)).toEqual([[0,0,0],[4,8,12],[0,0,0],[2,4,6],[1,2,3]]);
  });
  it.each([
    "m.interpolate_track([0,0],[[0,0,0],[1,1,1]],.2,'LINEAR')",
    "m.interpolate_track([0,1],[[0,0,0],[1,1,1]],.2,'CUBICSPLINE')",
    "m.interpolate_track([0,1],[[0,0,0],[1,float('nan'),1]],.2,'LINEAR')",
    "m.quaternion_slerp([0,0,0,0],[0,0,0,1],.5)",
  ])('fails unsupported or invalid animation data: %s', expression => {
    expect(() => evaluate(`${expression}\nprint('null')`)).toThrow();
  });
  it('propagates parent rotation and translation through a child world transform', () => {
    const value = evaluate(`parent=m.compose([3,0,0],[0,0,math.sin(math.pi/4),math.cos(math.pi/4)],[1,1,1])
child=m.compose([2,0,0],[0,0,0,1],[1,1,1]);world=m.multiply(parent,child)
print(json.dumps([world[0][3],world[1][3],world[2][3]]))`) as number[];
    expect(value[0]).toBeCloseTo(3, 12);
    expect(value[1]).toBeCloseTo(2, 12);
    expect(value[2]).toBe(0);
  });
});
