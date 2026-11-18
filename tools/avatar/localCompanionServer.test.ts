import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import type { MinimalPluginContextWithoutEnvironment, ViteDevServer } from 'vite';
import { localCompanionPlugin } from './localCompanionServer';

const directories: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const dir of directories.splice(0)) rmSync(dir, {recursive:true,force:true}); });
const folder = () => { const dir=mkdtempSync(path.join(tmpdir(),'local-bear-')); directories.push(dir); return dir; };
function request(root:string) {
  let handler: RequestListener | undefined;
  const plugin=localCompanionPlugin();
  if(typeof plugin.configureServer!=='function') throw new Error('Missing middleware');
  plugin.configureServer.call({} as MinimalPluginContextWithoutEnvironment,{config:{root},middlewares:{use:(value:RequestListener)=>{handler=value;}}} as unknown as ViteDevServer);
  return new Promise<{status:number;body:string}>((resolve)=>{
    const response={statusCode:200,headersSent:false,setHeader(){},end(body?:Buffer|string){resolve({status:this.statusCode,body:body?.toString()??''});}};
    handler!({url:'/__avatar_fixture/bear-v1.glb',method:'GET'} as IncomingMessage,response as unknown as ServerResponse);
  });
}
it('reports a missing required local archive instead of a generic missing model',async()=>{
  const repo=folder(); mkdirSync(path.join(repo,'assets/avatar'),{recursive:true});
  writeFileSync(path.join(repo,'assets/avatar/local-archive.json'),JSON.stringify({schemaVersion:1,archiveId:'fixture',sourceCommit:'a'.repeat(40),roots:['assets/avatar/catalog-a']}));
  vi.stubEnv('MUDROLINO_ARCHIVE_ROOT',path.join(repo,'missing-archive'));
  const result=await request(repo);
  expect(result.status).toBe(503); expect(result.body).toMatch(/archive/i);
});
it('serves the approved linked model and rejects a hash mismatch',async()=>{
  const repo=folder(); const archive=folder(); const relative='assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb'; const bytes=Buffer.from('bear');
  mkdirSync(path.dirname(path.join(archive,'working',relative)),{recursive:true});writeFileSync(path.join(archive,'working',relative),bytes);
  mkdirSync(path.join(repo,'assets/avatar'),{recursive:true});symlinkSync(path.join(archive,'working/assets/avatar/catalog-a'),path.join(repo,'assets/avatar/catalog-a'));
  writeFileSync(path.join(repo,'assets/avatar/local-archive.json'),JSON.stringify({schemaVersion:1,archiveId:'fixture',sourceCommit:'a'.repeat(40),roots:['assets/avatar/catalog-a']}));
  writeFileSync(path.join(archive,'archive-manifest.json'),JSON.stringify({schemaVersion:1,archiveId:'fixture',sourceCommit:'a'.repeat(40),verified:true}));vi.stubEnv('MUDROLINO_ARCHIVE_ROOT',archive);
  writeFileSync(path.join(repo,'assets/avatar/asset-manifest.json'),JSON.stringify({files:{[relative]:{sha256:createHash('sha256').update(bytes).digest('hex')}}}));
  expect(await request(repo)).toEqual({status:200,body:'bear'});
  writeFileSync(path.join(archive,'working',relative),'changed'); expect((await request(repo)).status).toBe(409);
});
it('refuses a nested model symlink outside the approved authoring root',async()=>{
  const repo=folder(); const outside=folder(); const relative='assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb'; const bytes=Buffer.from('bear');
  mkdirSync(path.dirname(path.join(repo,relative)),{recursive:true});writeFileSync(path.join(outside,'model.glb'),bytes);symlinkSync(path.join(outside,'model.glb'),path.join(repo,relative));
  writeFileSync(path.join(repo,'assets/avatar/asset-manifest.json'),JSON.stringify({files:{[relative]:{sha256:createHash('sha256').update(bytes).digest('hex')}}}));
  expect((await request(repo)).status).toBe(404);
});
