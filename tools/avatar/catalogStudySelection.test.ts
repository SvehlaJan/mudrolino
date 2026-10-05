import { describe, expect, it } from 'vitest';
import { selectCatalogStudyIds } from './catalogStudySelection.mjs';

const progress = { model_studies: [{id:'female-foundation-h02-study'}, {id:'female-outfit-T02-B01-F01-study'}] };
describe('catalog study verification scope', () => {
  it('discovers every explicitly registered study by default', () => {
    expect(selectCatalogStudyIds(progress, [])).toEqual(['female-foundation-h02-study','female-outfit-T02-B01-F01-study']);
  });
  it('focuses a new model without rerunning unchanged studies and deduplicates requests', () => {
    expect(selectCatalogStudyIds(progress, ['female-outfit-T02-B01-F01-study','female-outfit-T02-B01-F01-study'])).toEqual(['female-outfit-T02-B01-F01-study']);
  });
  it('rejects missing registrations and unsafe report path components', () => {
    expect(() => selectCatalogStudyIds(progress, ['unregistered'])).toThrow(/registered/);
    expect(() => selectCatalogStudyIds({model_studies:[{id:'../escape'}]}, [])).toThrow(/ID/);
  });
  it('rejects duplicate registrations rather than silently omitting a study', () => {
    expect(() => selectCatalogStudyIds({model_studies:[{id:'duplicate'},{id:'duplicate'}]}, [])).toThrow(/Duplicate/);
  });
  it('rejects an empty inventory instead of reporting zero cases as a pass', () => {
    expect(() => selectCatalogStudyIds({model_studies:[]}, [])).toThrow(/No/);
  });
});
