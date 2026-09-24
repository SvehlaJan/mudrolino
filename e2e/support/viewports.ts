import { RELEASE_VIEWPORTS } from './releaseMatrix';

export const DESKTOP_VIEWPORT = RELEASE_VIEWPORTS.desktop;
export const MOBILE_VIEWPORT = RELEASE_VIEWPORTS.phonePortrait;

export { RELEASE_VIEWPORTS } from './releaseMatrix';
export const CANONICAL_VIEWPORTS = RELEASE_VIEWPORTS;

export type CanonicalViewportName = keyof typeof CANONICAL_VIEWPORTS;
