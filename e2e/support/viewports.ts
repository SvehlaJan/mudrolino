export const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const CANONICAL_VIEWPORTS = {
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

export type CanonicalViewportName = keyof typeof CANONICAL_VIEWPORTS;
