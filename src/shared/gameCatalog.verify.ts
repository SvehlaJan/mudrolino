import { GAME_CATEGORIES, GAME_DEFINITIONS } from './gameCatalog';
import { GAME_MODULE_IDS } from './gameModuleRegistry';
import { SETTING_IDS } from './settings/settingIds';

const ids = GAME_DEFINITIONS.map(game => game.id);
const paths = GAME_DEFINITIONS.map(game => game.path);
if (ids.length !== 11 || new Set(ids).size !== 11) throw new Error('Expected 11 unique game IDs');
if (new Set(paths).size !== paths.length) throw new Error('Game paths must be unique');
if (ids.slice().sort().join() !== GAME_MODULE_IDS.slice().sort().join()) {
  throw new Error('Catalog/module registry mismatch');
}
for (const game of GAME_DEFINITIONS) {
  if (!GAME_CATEGORIES.some(category => category.id === game.categoryId)) throw new Error(`Missing category: ${game.id}`);
  if (game.settings.some(id => !SETTING_IDS.includes(id))) throw new Error(`Unknown setting: ${game.id}`);
  if (JSON.stringify(game).includes('bg-')) throw new Error(`Raw Tailwind contract: ${game.id}`);
}
console.log('✓ game catalog invariants passed');
