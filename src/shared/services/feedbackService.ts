export type FeedbackCategory = 'bug' | 'suggestion' | 'praise' | 'other';

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  screen: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Chyba v hre',
  suggestion: 'Nápad / návrh',
  praise: 'Pochvala',
  other: 'Iné',
};

function parseBrowser(ua: string): string {
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|OPR)\/[\d.]+/)?.[0] ?? 'Unknown browser';
  const os = ua.match(/\(([^)]+)\)/)?.[1].split(';')[0].trim() ?? 'Unknown OS';
  return `${browser} / ${os}`;
}

function collectMetadata(screen: string) {
  return {
    screen,
    browser: parseBrowser(navigator.userAgent),
    language: navigator.language,
    screen_size: `${window.innerWidth}×${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  };
}

export function hasFeedbackKey(): boolean {
  return Boolean(import.meta.env.VITE_WEB3FORMS_KEY);
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const key = import.meta.env.VITE_WEB3FORMS_KEY as string;
  const metadata = collectMetadata(payload.screen);

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: key,
      subject: `Spätná väzba: ${CATEGORY_LABELS[payload.category]}`,
      from_name: 'Hravé Učenie',
      category: CATEGORY_LABELS[payload.category],
      message: payload.message || '(žiadna správa)',
      ...metadata,
    }),
  });

  if (!res.ok) throw new Error(`Web3Forms responded with ${res.status}`);
}
