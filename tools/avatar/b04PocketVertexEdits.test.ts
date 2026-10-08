import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('clears weights only on eligible pocket vertices and leaves other vertices untouched', () => {
  const result = spawnSync('python3', ['-c', `
import sys,json
from types import SimpleNamespace as N
sys.path.insert(0,'tools/blender/catalog')
from b04_pocket_vertex_edits import apply_pocket_edits
class Group:
 def __init__(self): self.weights={0:.5,1:.5,2:.5};self.removals=0
 def remove(self,ids):
  self.removals+=1
  for i in ids:self.weights.pop(i,None)
 def add(self,ids,w,mode):
  for i in ids:self.weights[i]=w
class Keys(list):
 def __getitem__(self,index):return next(k for k in self if k.name==index) if isinstance(index,str) else super().__getitem__(index)
keys=Keys([N(name=n,data=[N(co=[0,0,0]) for _ in range(3)]) for n in ('Basis','Left','Right')])
obj=N(vertex_groups=[Group(),Group()],data=N(vertices=[N(co=[0,0,0]) for _ in range(3)],shape_keys=N(key_blocks=keys),update=lambda:None))
rows=[{'vertex':i,'point':[i,1,2],'keys':{n:[i,1,2] for n in ('Basis','Left','Right')},'weights':[[0,.75],[1,.25]]} for i in (0,2)]
apply_pocket_edits(obj,rows)
print(json.dumps({'weights':[g.weights for g in obj.vertex_groups],'removals':[g.removals for g in obj.vertex_groups],'points':[v.co for v in obj.data.vertices],'untouched_keys':[k.data[1].co for k in keys]}))
`], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    weights: [{ 0: .75, 1: .5, 2: .75 }, { 0: .25, 1: .5, 2: .25 }],
    removals: [1, 1], points: [[0, 1, 2], [0, 0, 0], [2, 1, 2]], untouched_keys: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  });
});
