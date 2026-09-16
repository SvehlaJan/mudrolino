import type { UserPraise, UserWord } from '../shared/types';

export interface ContentEnvelopeV2<T> { version: 2; items: T[]; }
export interface MigrationResult<T> { items: T[]; repaired: boolean; persistedDuringLoad: false; }
export const LAST_PLAYABLE_MESSAGE = 'Aspoň jedna položka musí zostať zapnutá.';

export function defaultWordId(locale: string, audioKey: string) { return `default:word:${locale}:${audioKey}`; }
export function defaultPraiseId(locale: string, audioKey: string) { return `default:praise:${locale}:${audioKey}`; }

type Managed = (UserWord | UserPraise) & { enabled?: boolean };
function parse(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') { try { const decoded: unknown = JSON.parse(raw); return parse(decoded); } catch { return []; } }
  if (raw && typeof raw === 'object' && (raw as { version?: unknown }).version === 2 && Array.isArray((raw as { items?: unknown }).items)) return (raw as { items: unknown[] }).items;
  return [];
}
function migrate<T extends Managed>(args: { raw: unknown; defaults: T[]; locale: string; seeded: boolean; defaultId: (locale: string, audioKey: string) => string }): MigrationResult<T> {
  const source = parse(args.raw) as T[];
  const defaults = new Map(args.defaults.map((item) => [item.audioKey, item]));
  const seenDefaultKeys = new Set<string>();
  const items: T[] = [];
  for (const item of source) {
    if (!item || typeof item !== 'object' || typeof item.audioKey !== 'string') continue;
    const defaultItem = defaults.get(item.audioKey);
    if (defaultItem && item.isDefault) {
      if (seenDefaultKeys.has(item.audioKey)) continue;
      seenDefaultKeys.add(item.audioKey);
      items.push({ ...defaultItem, ...item, id: args.defaultId(args.locale, item.audioKey), enabled: item.enabled ?? true } as T);
    } else {
      items.push({ ...item, enabled: item.enabled ?? true } as T);
    }
  }
  if (args.seeded) {
    for (const [audioKey, defaultItem] of defaults) {
      if (!seenDefaultKeys.has(audioKey)) items.push({ ...defaultItem, id: args.defaultId(args.locale, audioKey), enabled: false } as T);
    }
  }
  let repaired = false;
  if (!items.some((item) => item.enabled && item.status === 'ready')) {
    const firstDefault = items.find((item) => item.isDefault && item.status === 'ready');
    if (firstDefault) { firstDefault.enabled = true; repaired = true; }
  }
  return { items, repaired, persistedDuringLoad: false };
}
export function migrateWords(args: { raw: unknown; defaults: UserWord[]; locale: string; seeded: boolean }): MigrationResult<UserWord> { return migrate({ ...args, defaultId: defaultWordId }); }
export function migratePraises(args: { raw: unknown; defaults: UserPraise[]; locale: string; seeded: boolean }): MigrationResult<UserPraise> { return migrate({ ...args, defaultId: defaultPraiseId }); }
export function isPlayable(item: Pick<Managed, 'enabled' | 'status'>): boolean { return item.enabled === true && item.status === 'ready'; }
export function assertHasPlayable<T extends Pick<Managed, 'enabled' | 'status'>>(items: T[]): void { if (!items.some(isPlayable)) throw new Error(LAST_PLAYABLE_MESSAGE); }
export function canDisableOrDelete<T extends Pick<Managed, 'id' | 'enabled' | 'status'>>(items: T[], id: string): boolean { return !isPlayable(items.find((item) => item.id === id) ?? { enabled: false, status: 'draft' }) || items.filter(isPlayable).length > 1; }
export function assertCanDisableOrDelete<T extends Pick<Managed, 'id' | 'enabled' | 'status'>>(items: T[], id: string): void { if (!canDisableOrDelete(items, id)) throw new Error(LAST_PLAYABLE_MESSAGE); }
