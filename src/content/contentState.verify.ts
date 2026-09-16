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
const v2 = { version: 2 as const, items: [{ ...defaults[0], id: 'wrong', word: 'corrupt', status: 'draft' as const, locale: 'other', enabled: false }] };
const once = migrateWords({ raw: v2, defaults, locale: 'sk', seeded: true });
const twice = migrateWords({ raw: { version: 2, items: once.items }, defaults, locale: 'sk', seeded: true });
if (JSON.stringify(once.items) !== JSON.stringify(twice.items)) throw new Error('v2 migration must be idempotent');
const canonical = once.items.find((item) => item.audioKey === 'auto')!;
if (canonical.word !== 'Auto' || canonical.status !== 'ready' || canonical.locale !== 'sk' || canonical.id !== 'default:word:sk:auto') throw new Error('canonical default fields must win over corrupt stored fields');
if (!once.items.find((item) => item.audioKey === 'dom' && !item.enabled)) throw new Error('removed default must remain restorable as disabled');
const duplicate = migrateWords({ raw: [defaults[0], { ...defaults[0], id: 'dup' }], defaults, locale: 'sk', seeded: true });
if (duplicate.items.filter((item) => item.audioKey === 'auto').length !== 1) throw new Error('duplicate defaults must collapse by audio key');
const repaired = migrateWords({ raw: { version: 2, items: defaults.map((item) => ({ ...item, enabled: false })) }, defaults, locale: 'sk', seeded: true });
if (!repaired.repaired || !repaired.items.some((item) => item.enabled && item.status === 'ready')) throw new Error('zero playable v2 data must repair only in memory');
console.log('✓ content migration and availability passed');
