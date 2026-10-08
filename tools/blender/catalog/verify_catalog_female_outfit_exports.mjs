import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import validator from 'gltf-validator';
const folder=process.argv.find(a=>a.startsWith('--study-dir='))?.slice(12);
if(!folder)throw new Error('Usage: node verify_catalog_female_outfit_exports.mjs --study-dir=path');
// The assembly report lists the recipe; older studies are the T02/B01/F01 capsule.
const recipe=JSON.parse(fs.readFileSync(path.join(folder,'assembly-report.json'),'utf8')).recipe??['T02','B01','F01'];
const files=['body.glb','garments.glb','outfit.glb',...recipe.flatMap(id=>['body','garments','outfit'].map(name=>`pieces/${id}/${name}.glb`))];
const reports=[];
for(const file of files){const target=path.join(folder,file),bytes=fs.readFileSync(target),result=await validator.validateBytes(new Uint8Array(bytes),{uri:target,format:'glb',maxIssues:100});reports.push({target,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,issues:result.issues});}
const report={status:reports.every(r=>r.issues.numErrors===0&&r.issues.numWarnings===0)?'passed':'failed',source_blend_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,'outfit.blend'))).digest('hex'),checks:reports};
fs.writeFileSync(path.join(folder,'export-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({target:r.target,errors:r.issues.numErrors,warnings:r.issues.numWarnings,infos:r.issues.numInfos}))));
if(report.status!=='passed')process.exitCode=1;
