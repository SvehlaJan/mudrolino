export type VerificationProfile = 'none' | 'edit' | 'integration' | 'release';
export interface Selection { profile: VerificationProfile; specs: string[]; reason: string }

const numeracyGeometry = ['numeracy-accessibility.spec.ts', 'numeracy-responsive.spec.ts'];
const areas: Array<[RegExp, string[]]> = [
  [/^src\/games\/counting\//, ['counting.spec.ts', ...numeracyGeometry]],
  [/^src\/games\/compare\//, ['compare-quantities.spec.ts', ...numeracyGeometry]],
  [/^src\/games\/addition\//, ['addition.spec.ts', ...numeracyGeometry]],
  [/^src\/games\/(alphabet|syllables|numbers|words)\//, ['find-it-games.spec.ts']],
  [/^src\/games\/assembly\//, ['literacy-assembly.spec.ts', 'literacy-layout.spec.ts', 'literacy-interactions.spec.ts', 'assembly-layout.spec.ts']],
  [/^src\/games\/first-letter\//, ['literacy-first-letter.spec.ts', 'literacy-layout.spec.ts', 'literacy-interactions.spec.ts']],
  [/^src\/games\/complete-letter\//, ['literacy-complete-letter.spec.ts', 'literacy-layout.spec.ts', 'literacy-interactions.spec.ts']],
  [/^src\/games\/complete-syllable\//, ['literacy-complete-syllable.spec.ts', 'literacy-layout.spec.ts', 'literacy-interactions.spec.ts']],
  [/^src\/(content|recordings)\//, ['custom-content.spec.ts', 'recordings.spec.ts', 'parent-access.spec.ts']],
  [/^src\/settings\//, ['parent-settings.spec.ts', 'parent-access.spec.ts']],
  [/^src\/feedback\//, ['feedback.spec.ts']],
];

// Shared runtime dependencies deliberately broaden coverage. Unmapped paths do too.
const broad = /^(src\/(App\.|main\.|shared\/|pwa\/)|e2e\/support\/|e2e\/playwright|package(?:-lock)?\.json$|(?:vite|vitest|tsconfig|eslint)\.|tools\/verification\/)/;
const documentation = /(?:^docs\/|\.md$|^\.claude\/|^\.agents\/|^\.cursor\/)/;

export function selectVerification(files: string[], override?: VerificationProfile): Selection {
  if (override) return { profile: override, specs: [], reason: 'manual profile' };
  const code = files.filter(file => !documentation.test(file));
  if (code.length === 0) return { profile: 'none', specs: [], reason: 'no changed code' };
  const specs = new Set<string>();
  for (const file of code) {
    if (broad.test(file)) return { profile: 'integration', specs: [], reason: `shared dependency: ${file}` };
    const area = areas.find(([pattern]) => pattern.test(file));
    if (!area) return { profile: 'integration', specs: [], reason: `unmapped dependency: ${file}` };
    area[1].forEach(spec => specs.add(spec));
  }
  return { profile: 'edit', specs: [...specs].sort(), reason: 'affected areas' };
}
