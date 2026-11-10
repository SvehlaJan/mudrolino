import { getParentRouteKind, isProtectedParentPath } from './parentAccessLogic';

const protectedPaths = [
  '/settings',
  '/settings/games',
  '/settings/games/ALPHABET',
  '/settings/app',
  '/settings/help',
  '/settings/worksheets',
  '/content',
  '/recordings',
];

for (const path of protectedPaths) {
  if (!isProtectedParentPath(path)) throw new Error(`${path} must be protected`);
}
for (const path of ['/', '/alphabet', '/assembly', '/ui-kit', '/avatar-preview']) {
  if (isProtectedParentPath(path)) throw new Error(`${path} must remain public`);
}
if (getParentRouteKind('/settings/games/ALPHABET') !== 'game-detail') {
  throw new Error('Game detail route was not classified');
}
if (!isProtectedParentPath('/settings/')) {
  throw new Error('/settings/ must be protected');
}
if (getParentRouteKind('/settings/') !== 'dashboard') {
  throw new Error('/settings/ must map to dashboard route kind');
}
console.log('✓ parent access route policy passed');
