import { GAME_DEFINITIONS } from '../../src/shared/gameCatalog';
import { getUiCopy } from '../../src/shared/uiCopy';
import { isProtectedParentPath } from '../../src/shared/services/parentAccessLogic';
import {
  PROTECTED_GAME_SETTINGS_PATHS,
  PROTECTED_RELEASE_PATHS,
  RELEASE_GAME_CASES,
  RELEASE_VIEWPORTS,
} from './releaseMatrix';

const catalogIds = GAME_DEFINITIONS.map(game => game.id).sort();
const releaseIds = RELEASE_GAME_CASES.map(game => game.id).sort();
if (catalogIds.join('|') !== releaseIds.join('|')) throw new Error('release game matrix diverges from catalog');
if (RELEASE_GAME_CASES.length !== 11) throw new Error('release matrix must contain eleven games');
if (new Set(RELEASE_GAME_CASES.map(game => game.path)).size !== 11) throw new Error('game paths must be unique');
for (const release of RELEASE_GAME_CASES) {
  const catalog = GAME_DEFINITIONS.find(game => game.id === release.id);
  if (!catalog || catalog.path !== release.path) throw new Error(`catalog path mismatch: ${release.id}`);
  if (getUiCopy('sk', catalog.titleKey) !== release.title) throw new Error(`catalog title mismatch: ${release.id}`);
}

const requiredSizes = ['320x568', '360x640', '390x844', '667x375', '844x390', '768x1024', '1024x768', '1280x900', '1440x900', '1920x1080'];
const actualSizes = Object.values(RELEASE_VIEWPORTS).map(({ width, height }) => `${width}x${height}`);
for (const size of requiredSizes) if (!actualSizes.includes(size)) throw new Error(`missing viewport ${size}`);

const expectedDetailPaths = GAME_DEFINITIONS
  .filter(game => game.settings.length > 0)
  .map(game => `/settings/games/${game.id}`)
  .sort();
const actualDetailPaths = [...PROTECTED_GAME_SETTINGS_PATHS].sort();
if (expectedDetailPaths.join('|') !== actualDetailPaths.join('|')) {
  throw new Error('protected game-setting paths diverge from the catalog');
}
for (const path of PROTECTED_RELEASE_PATHS) {
  if (!isProtectedParentPath(path)) throw new Error(`release path is not protected: ${path}`);
}

console.log('✓ release matrix covers every game, protected detail path, and canonical viewport');
