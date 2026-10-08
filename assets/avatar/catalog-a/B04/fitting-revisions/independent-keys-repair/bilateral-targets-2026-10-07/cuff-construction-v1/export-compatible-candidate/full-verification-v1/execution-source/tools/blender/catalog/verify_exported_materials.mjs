import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import fs from 'node:fs';
import crypto from 'node:crypto';
const target=process.argv[2];
if(!target)throw new Error('Usage: node verify_exported_materials.mjs asset.glb [report.json]');
const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(target);
const results=[];
for(const mesh of document.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
 const material=primitive.getMaterial(),name=material?.getName();
 const color=primitive.getAttribute('COLOR_0')?.getArray();
 const result={mesh:mesh.getName(),material:name,colorComponents:color?.length??0};
 if(name==='A face and stubble'&&!color)throw new Error('Painted head lost COLOR_0');
 if(color){
  let min=Infinity,max=-Infinity;
  for(const value of color){min=Math.min(min,value);max=Math.max(max,value);}
  Object.assign(result,{min,max});
  if(name==='A face and stubble'){
   if(min===max)throw new Error('Painted head has lost its face/stubble variation');
  }else if(min!==1||max!==1)throw new Error(`Unpainted ${name} multiplies its material by non-white vertex colors`);
 }
 results.push(result);
}
const report={target,sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),status:'passed',primitives:results};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
