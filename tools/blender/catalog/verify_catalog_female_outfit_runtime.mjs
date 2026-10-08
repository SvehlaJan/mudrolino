import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {AnimationMixer, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const folder=process.argv.find(a=>a.startsWith('--study-dir='))?.slice(12);
if(!folder)throw new Error('Usage: node verify_catalog_female_outfit_runtime.mjs --study-dir=path');
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reference=JSON.parse(fs.readFileSync(path.join(folder,'runtime-samples.json'),'utf8'));
const assembly=JSON.parse(fs.readFileSync(path.join(folder,'assembly-report.json'),'utf8'));
const deformation=JSON.parse(fs.readFileSync(path.join(folder,'export-deformation-report.json'),'utf8'));
const glb=path.join(folder,'outfit.glb'),blend=path.join(folder,'outfit.blend');
if(digest(glb)!==reference.glb_sha256||digest(blend)!==reference.blend_sha256)throw new Error('Stale Blender runtime samples');
if(deformation.status!=='passed'||deformation.blend_sha256!==digest(blend)||deformation.glb_sha256!==digest(glb))throw new Error('Stale or failed source/export deformation proof');
// Node skin-math probe does not decode/render textures. Browser proof must do
// that separately; the Blender gate checks the actual embedded PNG hash/UVs.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
async function load(p){const b=fs.readFileSync(p);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const model=await load(glb);
const clips={walk:await load('assets/avatar/catalog-a/foundation/catalog-body-walk.glb'),run:await load('assets/avatar/catalog-a/foundation/catalog-body-run.glb')};
const poseHelper='tools/blender/catalog/catalog_gltf_gait_pose.py';
if(reference.pose_evaluation!=='raw-gltf-SLERP-equivalent-pose'||reference.pose_helper_sha256!==digest(poseHelper)||deformation.pose_evaluation!==reference.pose_evaluation||deformation.pose_helper_sha256!==reference.pose_helper_sha256)throw new Error('Current equivalent raw-glTF source/export and sample poses are required');
for(const motion of ['walk','run'])if(reference.gait_hashes?.[motion]!==digest(`assets/avatar/catalog-a/foundation/catalog-body-${motion}.glb`)||deformation.gait_hashes?.[motion]!==reference.gait_hashes[motion])throw new Error('Stale equivalent-pose gait');
const raw=spawnSync('python3',[poseHelper,'--model',glb,'--walk','assets/avatar/catalog-a/foundation/catalog-body-walk.glb','--run','assets/avatar/catalog-a/foundation/catalog-body-run.glb','--samples',path.join(folder,'runtime-samples.json')],{encoding:'utf8',maxBuffer:16*1024*1024});
if(raw.status!==0)throw new Error(raw.stderr||'Raw glTF pose evaluator failed');
const independent=JSON.parse(raw.stdout);
const mixer=new AnimationMixer(model.scene),rows=[];
const cell=.0001,key=(x,y,z)=>`${x},${y},${z}`;
for(const [rowIndex,row] of reference.checks.entries()){
 mixer.stopAllAction();
 if(row.motion!=='rest'){mixer.clipAction(clips[row.motion].animations[0]).reset().play();mixer.setTime(row.frame/reference.frames_per_second);}
 model.scene.updateMatrixWorld(true);
 const rawWorld=independent[rowIndex].world;
 let bonePositionError=0,boneLinearError=0,boneCount=0;
 if(!row.bone_world_gltf||Object.keys(row.bone_world_gltf).length!==24)throw new Error('Incomplete independent equivalent-pose bone inventory');
 model.scene.traverse(o=>{
  if(!o.isBone||!row.bone_world_gltf[o.name])return;
  boneCount++;
  const expected=rawWorld[o.name],recorded=row.bone_world_gltf[o.name];
  if(!expected)throw new Error(`Missing independently evaluated bone ${o.name}`);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
   if(Math.abs(expected[i][j]-recorded[i][j])>1e-10)throw new Error(`Stale recorded equivalent bone matrix ${o.name}`);
   const difference=Math.abs(expected[i][j]-o.matrixWorld.elements[j*4+i]);
   if(i<3&&j===3)bonePositionError=Math.max(bonePositionError,difference);
   else if(i<3&&j<3)boneLinearError=Math.max(boneLinearError,difference);
  }
 });
 if(boneCount!==24||bonePositionError>=.00003||boneLinearError>=.000002)throw new Error(`Raw glTF/actual Three bone mismatch: ${boneCount}, ${bonePositionError}, ${boneLinearError}`);
 const groups={};
 // Corrective morphs take the values Blender's drivers produced for this pose (recorded
 // per sample); any other active morph is an error.
 model.scene.traverse(o=>{
  if(!o.isSkinnedMesh)return;o.skeleton.update();
  if(!o.morphTargetInfluences)return;
  const name=Object.keys(row.meshes).find(source=>{for(let node=o;node;node=node.parent)if(node.name.startsWith(source==='body_underlayer_female'?'outfit_masked_body':source))return true;return false;});
  const recorded=row.corrective_values?.[name]??{};
  o.morphTargetInfluences.fill(0);
  for(const [key,value]of Object.entries(recorded)){const index=o.morphTargetDictionary?.[key];if(index===undefined)throw new Error(`Missing corrective morph ${key} on ${o.name}`);o.morphTargetInfluences[index]=value;}
 });
 model.scene.traverse(o=>{
  if(!o.isSkinnedMesh)return;
  const name=Object.keys(row.meshes).find(source=>{for(let node=o;node;node=node.parent)if(node.name.startsWith(source==='body_underlayer_female'?'outfit_masked_body':source))return true;return false;});
  if(!name)throw new Error(`No Blender source mapping for ${o.name}`);
  const grid=groups[name]??=new Map(),v=new Vector3();
  for(let i=0;i<o.geometry.attributes.position.count;i++){
   o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);
   const k=key(Math.floor(v.x/cell),Math.floor(v.y/cell),Math.floor(v.z/cell));
   const values=grid.get(k)??[];values.push(v.clone());grid.set(k,values);
  }
 });
 let maximum=0,unmatched=0,samples=0;
 for(const [name,points]of Object.entries(row.meshes)){
  const grid=groups[name];if(!grid)throw new Error(`Missing posed mesh ${name}`);
  for(const point of points){
   samples++;const v=new Vector3(point[0],point[2],-point[1]),indices=[v.x,v.y,v.z].map(x=>Math.floor(x/cell));let minimum=Infinity;
   for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const candidate of grid.get(key(indices[0]+x,indices[1]+y,indices[2]+z))??[])minimum=Math.min(minimum,v.distanceTo(candidate));
   if(!Number.isFinite(minimum))unmatched++;else maximum=Math.max(maximum,minimum);
  }
 }
 rows.push({motion:row.motion,frame:row.frame,samples,unmatched,max_imported_vertex_error_m:maximum,bone_count:boneCount,max_raw_gltf_three_bone_translation_error_m:bonePositionError,max_raw_gltf_three_bone_linear_matrix_error:boneLinearError});
}
const maximum=Math.max(...rows.map(r=>r.max_imported_vertex_error_m)),unmatched=rows.reduce((n,r)=>n+r.unmatched,0);
const combined=maximum+deformation.max_error_m;
const report={status:unmatched===0&&rows.length===16&&combined<.00003?'passed':'failed',blend,blend_sha256:digest(blend),glb,glb_sha256:digest(glb),runtime_verifier_sha256:digest(new URL(import.meta.url)),foundation_sha256:assembly.foundation_sha256,runtime_samples_sha256:digest(path.join(folder,'runtime-samples.json')),deformation_report_sha256:digest(path.join(folder,'export-deformation-report.json')),sampling:reference.sampling,axis_conversion:'Blender Z-up (x,y,z) to glTF Y-up (x,z,-y)',pose_evaluation:reference.pose_evaluation,pose_helper_sha256:digest(poseHelper),bone_translation_threshold_m:.00003,bone_linear_matrix_threshold:.000002,texture_scope:'Node skin math only; synthetic bitmap handle. Actual texture transport and browser rendering are separate gates.',checks:rows,max_three_import_error_m:maximum,source_export_error_m:deformation.max_error_m,combined_error_bound_m:combined,threshold_m:.00003,unmatched_samples:unmatched,gait_hashes:{walk:digest('assets/avatar/catalog-a/foundation/catalog-body-walk.glb'),run:digest('assets/avatar/catalog-a/foundation/catalog-body-run.glb')}};
fs.writeFileSync(path.join(folder,'runtime-deformation-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,samples:rows.length,unmatched,combined_error_bound_m:combined}));
if(report.status!=='passed')process.exitCode=1;
