import { GAME_DEFINITIONS } from '../../src/shared/gameCatalog';
import type { GameId } from '../../src/shared/types';

export const RELEASE_VIEWPORTS = {
  narrowPhone: { width: 320, height: 568 },
  smallPhone: { width: 360, height: 640 },
  phonePortrait: { width: 390, height: 844 },
  shortLandscape: { width: 667, height: 375 },
  phoneLandscape: { width: 844, height: 390 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1280, height: 900 },
  desktopLarge: { width: 1440, height: 900 },
  desktopWide: { width: 1920, height: 1080 },
} as const;

export interface ReleaseGameCase {
  id: GameId;
  path: string;
  title: string;
  category: 'literacy' | 'numeracy';
  answerPattern: 'grid' | 'sequence' | 'counting' | 'comparison' | 'addition';
}

export const RELEASE_GAME_CASES: readonly ReleaseGameCase[] = [
  { id: 'ALPHABET', path: '/alphabet', title: 'Abeceda', category: 'literacy', answerPattern: 'grid' },
  { id: 'SYLLABLES', path: '/syllables', title: 'Slabiky', category: 'literacy', answerPattern: 'grid' },
  { id: 'NUMBERS', path: '/numbers', title: 'Čísla', category: 'numeracy', answerPattern: 'grid' },
  { id: 'WORDS', path: '/words', title: 'Slová', category: 'literacy', answerPattern: 'grid' },
  { id: 'FIRST_LETTER', path: '/first-letter', title: 'Prvé písmenko', category: 'literacy', answerPattern: 'grid' },
  { id: 'ASSEMBLY', path: '/assembly', title: 'Skladaj', category: 'literacy', answerPattern: 'sequence' },
  { id: 'COMPLETE_SYLLABLE', path: '/complete-syllable', title: 'Doplň slabiku', category: 'literacy', answerPattern: 'grid' },
  { id: 'COMPLETE_LETTER', path: '/complete-letter', title: 'Doplň písmeno', category: 'literacy', answerPattern: 'sequence' },
  { id: 'COUNTING_ITEMS', path: '/counting', title: 'Spočítaj', category: 'numeracy', answerPattern: 'counting' },
  { id: 'COMPARE_QUANTITIES', path: '/compare', title: 'Viac alebo Menej', category: 'numeracy', answerPattern: 'comparison' },
  { id: 'ADDITION', path: '/addition', title: 'Sčítaj', category: 'numeracy', answerPattern: 'addition' },
] as const;

export const PROTECTED_GAME_SETTINGS_PATHS = GAME_DEFINITIONS
  .filter(game => game.settings.length > 0)
  .map(game => `/settings/games/${game.id}`);

export const PROTECTED_RELEASE_PATHS = [
  '/settings',
  '/settings/games',
  ...PROTECTED_GAME_SETTINGS_PATHS,
  '/settings/app',
  '/settings/help',
  '/content',
  '/recordings',
] as const;
