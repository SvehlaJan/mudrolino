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

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function getParentRouteKind(pathname: string): ParentRouteKind {
  const normalized = normalizePath(pathname);
  if (normalized === '/settings') return 'dashboard';
  if (normalized === '/settings/games') return 'games';
  if (/^\/settings\/games\/[^/]+$/.test(normalized)) return 'game-detail';
  if (normalized === '/settings/app') return 'app';
  if (normalized === '/settings/help') return 'help';
  if (normalized === '/content') return 'content';
  if (normalized === '/recordings') return 'recordings-legacy';
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
