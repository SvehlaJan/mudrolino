import { LocalContentRepository } from './localContentRepository';
import { LAST_PLAYABLE_MESSAGE } from '../../content/contentState';

const data = new Map<string, string>();
let writes = 0;
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { writes += 1; data.set(key, value); },
  },
});

const repo = new LocalContentRepository('sk');
await repo.seed([], []);
const writesBeforeLoad = writes;
await repo.getWords();
if (writes !== writesBeforeLoad) throw new Error('loading migration must not write storage');
const words = await repo.getWords();
if (!words.some((word) => word.enabled && word.status === 'ready')) throw new Error('seeded defaults must be playable');
await repo.restoreAllDefaultWords();
const first = words[0];
await repo.setDefaultWordEnabled(first.id, false);
if ((await repo.getWords()).find((word) => word.id === first.id)?.enabled) throw new Error('disabled default must remain stored');
await repo.restoreAllDefaultWords();
if (!(await repo.getWords()).every((word) => !word.isDefault || word.enabled)) throw new Error('restore all must enable defaults');

data.set('hrave-ucenie-user-words-sk', JSON.stringify({ version: 2, items: [{ ...first, enabled: true }] }));
try { await repo.deleteWord(first.id); throw new Error('deleting last playable item should fail'); } catch (error) { if ((error as Error).message !== LAST_PLAYABLE_MESSAGE) throw error; }
try { await repo.updateWord(first.id, { status: 'draft' }); throw new Error('making the last playable word a draft should fail'); } catch (error) { if ((error as Error).message !== LAST_PLAYABLE_MESSAGE) throw error; }

const praises = await repo.getPraises();
data.set('hrave-ucenie-user-praises-sk', JSON.stringify({ version: 2, items: [{ ...praises.find((praise) => praise.enabled)!, enabled: true }] }));
const onlyPraise = (await repo.getPraises()).find((praise) => praise.enabled)!;
try { await repo.updatePraise(onlyPraise.id, { status: 'draft' }); throw new Error('making the last playable praise a draft should fail'); } catch (error) { if ((error as Error).message !== LAST_PLAYABLE_MESSAGE) throw error; }

await repo.restoreAllDefaultWords();
const beforeConcurrentAdds = (await repo.getWords()).length;
const secondRepo = new LocalContentRepository('sk');
await Promise.all([
  repo.addWord({ word: 'Prvé', syllables: 'pr-vé', emoji: '1️⃣', audioKey: 'custom-first', isDefault: false }),
  secondRepo.addWord({ word: 'Druhé', syllables: 'dru-hé', emoji: '2️⃣', audioKey: 'custom-second', isDefault: false }),
]);
if ((await repo.getWords()).length !== beforeConcurrentAdds + 2) throw new Error('concurrent repository writes must not lose entries');
await repo.restoreAllDefaultPraises();
const beforeConcurrentPraises = (await repo.getPraises()).length;
await Promise.all([
  repo.addPraise({ text: 'Prvá', emoji: '1️⃣', audioKey: 'custom-praise-first', isDefault: false }),
  secondRepo.addPraise({ text: 'Druhá', emoji: '2️⃣', audioKey: 'custom-praise-second', isDefault: false }),
]);
if ((await repo.getPraises()).length !== beforeConcurrentPraises + 2) throw new Error('concurrent praise writes must not lose entries');
console.log('✓ local content repository contracts passed');
