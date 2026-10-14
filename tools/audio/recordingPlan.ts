import type { LocaleContent } from '../../src/shared/types';

/** One clip still to record, with the text the speaker reads aloud. */
export interface PendingClip {
  /** Relative to public/audio, e.g. `cs/words/jahoda.mp3`. */
  path: string;
  locale: string;
  category: string;
  key: string;
  label: string;
}

export interface RecordingTake {
  /** File-name friendly, e.g. `cs-05-words`. */
  name: string;
  title: string;
  clips: PendingClip[];
}

// Short, similar items first; long syllable lists last, when the speaker is warmed up.
const CATEGORY_ORDER = ['letters', 'numbers', 'phrases', 'praise', 'words', 'syllables'];

const CATEGORY_TITLES: Record<string, string> = {
  letters: 'Písmená / Písmena',
  numbers: 'Čísla',
  phrases: 'Frázy / Fráze',
  praise: 'Pochvaly',
  words: 'Slová / Slova',
  syllables: 'Slabiky',
};

/** The text to read for a clip, taken from the locale content that plays it. */
export function labelFor(content: LocaleContent, category: string, key: string): string | null {
  switch (category) {
    case 'letters': return content.letterItems.find(item => item.audioKey === key)?.symbol ?? null;
    case 'numbers': {
      const number = content.numberItems.find(item => item.audioKey === key);
      return number ? String(number.value) : null;
    }
    case 'syllables': return content.syllableItems.find(item => item.audioKey === key)?.symbol ?? null;
    case 'words': return content.wordItems.find(item => item.audioKey === key)?.word ?? null;
    case 'praise': return content.praiseEntries.find(item => item.audioKey === key)?.text ?? null;
    case 'phrases': return Object.values(content.audioPhrases).find(item => item.audioKey === key)?.text ?? null;
    default: return null;
  }
}

/** Resolves pending paths to readable clips; paths the content no longer plays are returned separately. */
export function describePending(
  paths: string[],
  contentFor: (locale: string) => LocaleContent,
): { clips: PendingClip[]; unknown: string[] } {
  const clips: PendingClip[] = [];
  const unknown: string[] = [];
  for (const path of paths) {
    const match = /^([a-z]{2,3})\/([a-z-]+)\/(.+)\.mp3$/.exec(path);
    const label = match ? labelFor(contentFor(match[1]), match[2], match[3]) : null;
    if (!match || label === null) {
      unknown.push(path);
      continue;
    }
    clips.push({ path, locale: match[1], category: match[2], key: match[3], label });
  }
  return { clips, unknown };
}

/**
 * Splits one locale's pending clips into takes of at most `maxPerTake`, one
 * category per take. Short takes keep one missed pause from shifting every
 * later file.
 */
export function planTakes(locale: string, clips: PendingClip[], maxPerTake = 25): RecordingTake[] {
  const takes: RecordingTake[] = [];
  const categories = [...new Set(clips.filter(clip => clip.locale === locale).map(clip => clip.category))]
    .sort((a, b) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99));
  for (const category of categories) {
    const inCategory = clips.filter(clip => clip.locale === locale && clip.category === category);
    const parts = Math.ceil(inCategory.length / maxPerTake);
    for (let part = 0; part < parts; part += 1) {
      const number = String(takes.length + 1).padStart(2, '0');
      const suffix = parts > 1 ? `-${part + 1}` : '';
      takes.push({
        name: `${locale}-${number}-${category}${suffix}`,
        title: `${CATEGORY_TITLES[category] ?? category}${parts > 1 ? ` (${part + 1}/${parts})` : ''}`,
        clips: inCategory.slice(part * maxPerTake, (part + 1) * maxPerTake),
      });
    }
  }
  return takes;
}

/** Tab-separated `path<TAB>label` lines, the format process_recording.py reads. */
export function toSessionFile(take: RecordingTake): string {
  return take.clips.map(clip => `${clip.path}\t${clip.label}`).join('\n') + '\n';
}
