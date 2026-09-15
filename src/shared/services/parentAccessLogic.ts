import { GAME_DEFINITIONS } from '../gameCatalog';

export type ParentRouteKind =
  | 'dashboard'
  | 'games'
  | 'game-detail'
  | 'app'
  | 'help'
  | 'content'
  | 'recordings-legacy'
  | null;

export function getParentRouteKind(pathname: string): ParentRouteKind {
  if (pathname === '/settings') return 'dashboard';
  if (pathname === '/settings/games') return 'games';
  if (/^\/settings\/games\/[^/]+$/.test(pathname)) return 'game-detail';
  if (pathname === '/settings/app') return 'app';
  if (pathname === '/settings/help') return 'help';
  if (pathname === '/content') return 'content';
  if (pathname === '/recordings') return 'recordings-legacy';
  return null;
}

export function isProtectedParentPath(pathname: string): boolean {
  return getParentRouteKind(pathname) !== null;
}

export function sanitizeChildReturnPath(pathname: unknown): string {
  if (pathname === '/') return '/';
  if (typeof pathname !== 'string') return '/';
  return GAME_DEFINITIONS.some(game => game.path === pathname) ? pathname : '/';
}
