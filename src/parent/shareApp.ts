/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShareAppData {
  title: string;
  text: string;
  url: string;
}

/** What happened, so the screen can confirm a copy or show the link for manual copying. */
export type ShareAppResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

type ShareNavigator = Pick<Navigator, 'share' | 'clipboard'>;

/**
 * Opens the system share sheet with the app link. Browsers without it (most
 * desktops) get the link copied instead; a parent closing the share sheet is not
 * an error. Other share failures fall back to copying.
 */
export async function shareApp(data: ShareAppData, nav: Partial<ShareNavigator> = navigator): Promise<ShareAppResult> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    if (!nav.clipboard) return 'unavailable';
    await nav.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}
