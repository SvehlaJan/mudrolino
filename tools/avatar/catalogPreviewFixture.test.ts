import path from 'node:path';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { resolveCatalogPreviewFixture, assertCatalogPreviewEvidence } from './catalogPreviewFixture.mjs';

const root = path.resolve('/private/tmp/avatar-fixture-test-repo');
describe('isolated catalog browser fixtures', () => {
  it('preserves canonical defaults', () => {
    const result = resolveCatalogPreviewFixture(root, []);
    expect(result.outfit).toBe('T01-B01-F01-A01');
    expect(result.previewUrl).toBe('http://127.0.0.1:3003');
    expect(result.replacements['/avatar/modular/male-base-plain.glb']).toBe(path.join(root, 'assets/avatar/catalog-a/outfits/T01-B01-F01-A01/body.glb'));
    expect(result.outputDir).toBe(path.join(root, 'artifacts/verification/avatar-catalog/outfits/T01-B01-F01-A01'));
  });
  it('uses an isolated revision and report directory without replacing canonical sources', () => {
    const result = resolveCatalogPreviewFixture(root, ['--outfit=T02-B02-F02-A01', '--outfit-dir=assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/outfit', '--output-dir=artifacts/verification/avatar-catalog/F02/repair-browser', '--preview-url=http://localhost:3005', '--production']);
    expect(result.production).toBe(true);
    expect(result.replacements['/avatar/garments/top_blue_tshirt_v1.glb']).toBe(path.join(root, 'assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/outfit/garments.glb'));
    expect(result.replacements['/avatar/modular/male-base-plain-walking.glb']).toBe(path.join(root, 'assets/avatar/catalog-a/foundation/catalog-body-walk.glb'));
    expect(result.outputDir).toBe(path.join(root, 'artifacts/verification/avatar-catalog/F02/repair-browser'));
    expect(result.previewUrl).toBe('http://localhost:3005');
  });
  it('accepts absolute paths inside the allowed repository trees', () => {
    const dir = path.join(root, 'assets/avatar/catalog-a/reviewed-outfit');
    const result = resolveCatalogPreviewFixture(root, [`--outfit-dir=${dir}`]);
    expect(result.replacements['/avatar/modular/male-base-plain.glb']).toBe(path.join(dir, 'body.glb'));
  });
  it('rejects source/report escapes and malformed outfit identifiers', () => {
    for (const args of [['--outfit-dir=../outside'], ['--outfit-dir=public/avatar'], ['--output-dir=src/avatar'], ['--output-dir=artifacts/verification/../../src'], ['--outfit=../../T02']]) {
      expect(() => resolveCatalogPreviewFixture(root, args)).toThrow();
    }
  });
  it('keeps local source substitution on a loopback preview', () => {
    for (const url of ['https://example.com', 'http://192.168.0.2:3003', 'http://localhost:3003/path', 'http://user:secret@localhost:3003']) {
      expect(() => resolveCatalogPreviewFixture(root, [`--preview-url=${url}`])).toThrow();
    }
  });
});


describe('candidate renderer evidence', () => {
  const base = {label:'desktop-walk',canvas:{width:500,height:600},renderSha256:'first',laterRenderSha256:'later',completedCandidateGets:['/avatar/modular/male-base-plain.glb','/avatar/garments/top_blue_tshirt_v1.glb','/avatar/modular/male-base-plain-walking.glb']};
  it('requires the candidate body and garment GETs plus the active gait clip', () => {
    expect(()=>assertCatalogPreviewEvidence(base,'walk')).not.toThrow();
    for(const omitted of base.completedCandidateGets) expect(()=>assertCatalogPreviewEvidence({...base,completedCandidateGets:base.completedCandidateGets.filter(url=>url!==omitted)},'walk')).toThrow(/GET/);
  });
  it('rejects frozen gait and empty canvases while permitting static rest', () => {
    expect(()=>assertCatalogPreviewEvidence({...base,laterRenderSha256:'first'},'walk')).toThrow(/motion/);
    expect(()=>assertCatalogPreviewEvidence({...base,laterRenderSha256:'first'},'idle')).not.toThrow();
    expect(()=>assertCatalogPreviewEvidence({...base,canvas:{width:0,height:600}},'walk')).toThrow(/canvas/);
  });
  it('rejects symlink source and report escapes', () => {
    const repository=mkdtempSync(path.join(tmpdir(),'catalog-fixture-links-'));
    const outside=mkdtempSync(path.join(tmpdir(),'catalog-fixture-outside-'));
    try {
      mkdirSync(path.join(repository,'assets/avatar'),{recursive:true});
      mkdirSync(path.join(repository,'artifacts/verification'),{recursive:true});
      symlinkSync(outside,path.join(repository,'assets/avatar/escape'));
      symlinkSync(outside,path.join(repository,'artifacts/verification/escape'));
      expect(()=>resolveCatalogPreviewFixture(repository,['--outfit-dir=assets/avatar/escape'])).toThrow(/under/);
      expect(()=>resolveCatalogPreviewFixture(repository,['--output-dir=artifacts/verification/escape/new-report'])).toThrow(/under/);
    }finally{rmSync(repository,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
  });
});
