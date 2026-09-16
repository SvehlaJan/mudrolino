import type { UserWord } from '../shared/types';
import { canDisableOrDelete, migrateWords } from './contentState';

const defaults: UserWord[] = [
  { id: 'legacy-auto', word: 'Auto', syllables: 'au-to', emoji: '🚗', audioKey: 'auto', status: 'ready', enabled: true, isDefault: true, locale: 'sk', order: 0 },
  { id: 'legacy-dom', word: 'Dom', syllables: 'dom', emoji: '🏠', audioKey: 'dom', status: 'ready', enabled: true, isDefault: true, locale: 'sk', order: 1 },
];

const migrated = migrateWords({ raw: [defaults[0]], defaults, locale: 'sk', seeded: true });
const missing = migrated.items.find((item) => item.audioKey === 'dom');
if (!missing || missing.enabled) throw new Error('missing default must be disabled');
if (migrated.persistedDuringLoad) throw new Error('migration must not write during load');
if (migrated.items[0].id !== 'default:word:sk:auto') throw new Error('defaults need deterministic ids');
if (!migrated.repaired && !migrated.items.some((item) => item.enabled && item.status === 'ready')) throw new Error('migration must retain playable content');
if (canDisableOrDelete(migrated.items.filter((item) => item.enabled && item.status === 'ready').slice(0, 1), migrated.items[0].id)) throw new Error('last playable item must be protected');

const custom = { ...defaults[0], id: 'mine', isDefault: false, audioKey: 'custom-mine', order: 9, word: 'Moje' };
const withCustom = migrateWords({ raw: [custom, defaults[0], defaults[0]], defaults, locale: 'sk', seeded: true });
if (withCustom.items[0].id !== 'mine' || withCustom.items[0].audioKey !== 'custom-mine') throw new Error('custom content must preserve ids and audio keys');
if (migrateWords({ raw: '{bad json', defaults, locale: 'sk', seeded: true }).items.length !== defaults.length) throw new Error('corrupt JSON must recover defaults');
console.log('✓ content migration and availability passed');
