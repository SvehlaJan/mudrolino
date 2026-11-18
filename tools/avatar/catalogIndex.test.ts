import { expect, it } from 'vitest';
import { hydrateCatalogIndex } from './catalogIndex';

it('keeps an empty curated index portable without authoring assets', () => {
  expect(hydrateCatalogIndex({schemaVersion:1,items:[]},[],()=>null,path=>path,path=>path,()=>[])).toEqual([]);
});
it('rejects a curated reference that has no local source', () => {
  const index={schemaVersion:1,items:[{id:'T02',label:'Hoodie',collection:'wardrobe',category:'tops',description:'Candidate',relatedIds:[],references:[{id:'front',label:'Front',path:'assets/avatar/catalog/missing.png'}],variants:[]}]};
  expect(()=>hydrateCatalogIndex(index,[],()=>null,path=>path,path=>path,()=>[])).toThrow(/missing|unsafe/);
});
