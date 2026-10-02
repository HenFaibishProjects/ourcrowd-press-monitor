import { BadRequestException } from '@nestjs/common';

const TRACKING = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']);

export function normalizeArticleUrl(articleUrl: string): string {
  let url: URL;
  try { url = new URL(articleUrl.trim()); }
  catch { throw new BadRequestException('Article URL must be an absolute HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new BadRequestException('Article URL must use HTTP(S) without credentials');
  }
  url.hash = '';
  // Retain untouched query bytes (including ordering/encoding) for identity-bearing parameters.
  const query = url.search.slice(1).split('&').filter((part) => {
    const key = part.split('=', 1)[0]!;
    let decoded: string;
    try { decoded = decodeURIComponent(key.replace(/\+/g, ' ')); } catch { return true; }
    return !TRACKING.has(decoded.toLowerCase());
  }).join('&');
  url.search = query ? `?${query}` : '';
  return url.toString();
}
