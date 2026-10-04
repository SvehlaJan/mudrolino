import {chromium} from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {resolveCatalogPreviewFixture,assertCatalogPreviewEvidence} from './catalogPreviewFixture.mjs';
const root=process.cwd();
const {outfit,production,previewUrl,outputDir:dir,replacements}=resolveCatalogPreviewFixture(root,process.argv.slice(2));
const buildIdentity=production?JSON.parse(fs.readFileSync('dist/build-identity.json','utf8')):null;
if(production){const served=await (await fetch(`${previewUrl}/build-identity.json`)).json();if(JSON.stringify(served)!==JSON.stringify(buildIdentity)||served.mode!=='production')throw new Error('Preview build identity does not match dist');}
fs.mkdirSync(dir,{recursive:true});
const manifest=Object.fromEntries(Object.entries(replacements).map(([url,path])=>[url,{path,sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')}]))
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle']});
const results=[];
try{
for(const [label,animation,width,height] of [['desktop-rest','idle',1280,900],['desktop-walk','walk',1280,900],['desktop-run','run',1280,900],['mobile-run','run',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[],failed=[],loaded=[];let phase='active';const pending=new Set(),completedCandidateGets=new Set();
 page.on('request',r=>{if(r.method()==='GET')pending.add(r)});page.on('requestfinished',r=>{pending.delete(r);const pathname=new URL(r.url()).pathname;if(r.method()==='GET'&&replacements[pathname])completedCandidateGets.add(pathname)});
 await page.route('**/avatar/**/*.glb',async route=>{const p=new URL(route.request().url()).pathname; if(replacements[p]){loaded.push(p);if(route.request().method()==='HEAD'){await route.fulfill({status:200,headers:{'content-type':'model/gltf-binary','content-length':String(fs.statSync(replacements[p]).size)}});return;}await route.fulfill({path:replacements[p],contentType:'model/gltf-binary'});}else await route.continue();});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>{pending.delete(r);failed.push({url:r.url(),method:r.method(),reason:r.failure()?.errorText,phase});});page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`)});
 const url=`${previewUrl}/avatar-preview?agent=1&top=top_blue_tshirt_v1&shoes=shoes_none&accessory=accessory_none&animation=${animation}`;
 await page.goto(url);await page.waitForLoadState('networkidle',{timeout:60000});const canvas=page.locator('canvas');await canvas.waitFor({timeout:60000});await page.waitForFunction(()=>{try{return Boolean(JSON.parse(document.querySelector('[data-testid=avatar-debug-json]')?.textContent??'').bones?.Head);}catch{return false;}},{timeout:60000});
 await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
 const shot=await canvas.screenshot();await sharp(shot).resize({width:320}).toFile(`${dir}/browser-${label}-review.png`);
 await page.waitForTimeout(350);const later=await canvas.screenshot();await page.waitForLoadState('networkidle',{timeout:60000});
 const result={label,animation,url,viewport:{width,height},canvas:await canvas.evaluate(c=>({width:c.width,height:c.height})),renderSha256:crypto.createHash('sha256').update(shot).digest('hex'),laterRenderSha256:crypto.createHash('sha256').update(later).digest('hex'),scene:await (await page.waitForFunction(()=>{try{const data=JSON.parse(document.querySelector('[data-testid=avatar-debug-json]')?.textContent??'');return data.bones?.Head?data:false;}catch{return false;}},{timeout:60000})).jsonValue(),loaded,errors,failed};await page.waitForLoadState('networkidle',{timeout:60000});result.pendingGetsBeforeClose=[...pending].map(r=>r.url());result.completedCandidateGets=[...completedCandidateGets];result.evidenceErrors=[];try{assertCatalogPreviewEvidence(result,animation)}catch(error){result.evidenceErrors.push(error.message)}results.push(result);console.log(JSON.stringify({label,errors,failed,loaded,canvas:result.canvas,scene:result.scene}));phase='teardown';await page.close();
}
}finally{await browser.close();fs.writeFileSync(`${dir}/browser-report.json`,JSON.stringify({verificationProfile:production?'production-candidate':'development-candidate',buildIdentity,manifest,results},null,2));}
if(results.some(r=>r.errors.length||r.evidenceErrors.length||r.failed.some(f=>typeof f==='string'||f.method!=='HEAD'||f.reason!=='net::ERR_ABORTED')))process.exitCode=1;
