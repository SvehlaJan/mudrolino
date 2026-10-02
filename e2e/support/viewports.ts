import { RELEASE_VIEWPORTS } from './releaseMatrix';

export const DESKTOP_VIEWPORT = RELEASE_VIEWPORTS.desktop;
export const MOBILE_VIEWPORT = RELEASE_VIEWPORTS.phonePortrait;

export { RELEASE_VIEWPORTS } from './releaseMatrix';
export const CANONICAL_VIEWPORTS = RELEASE_VIEWPORTS;

export type CanonicalViewportName = keyof typeof CANONICAL_VIEWPORTS;

/** Integration geometry covers the most constrained layouts and a desktop baseline. */
export const CI_VIEWPORT_SUBSET: CanonicalViewportName[] = ['narrowPhone', 'shortLandscape', 'desktop'];
export const INTEGRATION_VIEWPORTS = Object.fromEntries(
  CI_VIEWPORT_SUBSET.map(name => [name, CANONICAL_VIEWPORTS[name]]),
) as Pick<typeof CANONICAL_VIEWPORTS, 'narrowPhone' | 'shortLandscape' | 'desktop'>;
