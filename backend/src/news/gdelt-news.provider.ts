import { BadGatewayException, BadRequestException, GatewayTimeoutException, HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseApiDate } from '../common/dates';
import { GdeltCache } from './gdelt-cache';
import { gdeltConfig, GdeltConfig } from './gdelt.config';
import { NewsArticle, NewsProvider, NewsSearchInput } from './news-provider';
import { normalizeArticleUrl } from './url-normalization';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export function gdeltDate(date: Date): string {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    throw new BadRequestException('GDELT range requires valid dates with year 0001–9999');
  }
  return date.toISOString().slice(0, 19).replace(/[-:T]/g, '');
}
export function gdeltRequest(settings: GdeltConfig, input: NewsSearchInput): URL {
  if (typeof input.queryName !== 'string' || !input.queryName.trim() || /["\r\n\\]/.test(input.queryName)) {
    throw new BadRequestException('News search name must be non-blank, without quotes, backslashes or newlines');
  }
  const from = gdeltDate(input.from); const to = gdeltDate(input.to);
  if (input.from >= input.to || input.to.getTime() - input.from.getTime() < 900000) {
    throw new BadRequestException('GDELT range must span at least 15 minutes, from before exclusive to');
  }
  const url = new URL(settings.baseUrl);
  for (const [key, value] of Object.entries({ query: `"${input.queryName.trim()}"`, mode: 'ArtList', format: 'json',
    sort: 'DateDesc', maxrecords: '250', startdatetime: from, enddatetime: to })) url.searchParams.set(key, value);
  return url;
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function parseGdeltResponse(raw: string, input: Pick<NewsSearchInput, 'from' | 'to'>): {
  articles: NewsArticle[]; invalidArticles: number; resultLimitReached: boolean;
} {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new BadGatewayException('GDELT returned non-JSON content; check the query, range and provider availability'); }
  if (!object(data) || !Array.isArray(data['articles'])) throw new BadGatewayException('GDELT response must contain an articles array');
  const articles: NewsArticle[] = []; let invalidArticles = 0;
  for (const row of data['articles']) {
    try {
      if (!object(row) || typeof row['title'] !== 'string' || !row['title'].trim() ||
          typeof row['url'] !== 'string' || typeof row['seendate'] !== 'string' ||
          !/^\d{8}T\d{6}Z$/.test(row['seendate'])) throw Error();
      const seen = row['seendate'];
      const publishedAt = parseApiDate(`${seen.slice(0, 4)}-${seen.slice(4, 6)}-${seen.slice(6, 8)}T${seen.slice(9, 11)}:${seen.slice(11, 13)}:${seen.slice(13, 15)}Z`);
      const url = normalizeArticleUrl(row['url']);
      if (publishedAt < input.from || publishedAt >= input.to) continue;
      articles.push({ title: row['title'].trim(), url, source: new URL(url).hostname, publishedAt, description: null });
    } catch { invalidArticles++; }
  }
  return { articles, invalidArticles, resultLimitReached: data['articles'].length >= 250 };
}

@Injectable()
export class GdeltNewsProvider implements NewsProvider {
  readonly settings: GdeltConfig;
  private readonly cache: GdeltCache;
  private lastRequestStarted = 0;
  private readonly logger = new Logger(GdeltNewsProvider.name);
  constructor(config: ConfigService) {
    this.settings = gdeltConfig(config); this.cache = new GdeltCache(this.settings.cachePath);
  }
  async search(input: NewsSearchInput): Promise<NewsArticle[]> {
    const url = gdeltRequest(this.settings, input).toString();
    const mode = input.cacheMode ?? 'cached';
    if (!['cached', 'refresh', 'live'].includes(mode)) throw new BadRequestException('Invalid news cache mode');
    let raw = mode === 'cached' ? await this.cache.read(url) : null;
    const cacheStatus = mode === 'live' ? 'bypassed' : raw === null ? 'miss' : 'hit';
    const fromCache = raw !== null;
    if (raw === null) raw = await this.fetchResponse(url);
    const parsed = parseGdeltResponse(raw, input);
    if (!fromCache && mode !== 'live') {
      try { await this.cache.write({ companyName: input.companyName, query: `"${input.queryName.trim()}"`,
        from: input.from.toISOString(), to: input.to.toISOString(), url }, raw); }
      catch { throw new BadGatewayException('Cannot write GDELT cache; check permissions or use --live'); }
    }
    input.onDiagnostics?.({ query: `"${input.queryName.trim()}"`, requestUrl: url, cache: cacheStatus,
      invalidArticles: parsed.invalidArticles, resultLimitReached: parsed.resultLimitReached });
    if (parsed.resultLimitReached) this.logger.warn(`GDELT reached 250 results for ${input.companyName}; this range may be incomplete`);
    return parsed.articles;
  }
  private async fetchResponse(url: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      await wait(Math.max(0, this.settings.requestDelayMs - (Date.now() - this.lastRequestStarted)));
      this.lastRequestStarted = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.settings.timeoutMs);
      let retryMs: number | null = null;
      try {
        const response = await fetch(url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
        if (!response.ok) {
          if ((response.status === 429 || response.status >= 500) && attempt < this.settings.maxRetries) {
            const value = response.headers.get('retry-after');
            const retryAfter = value === null ? NaN : /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now();
            if (Number.isFinite(retryAfter) && retryAfter > 60000) {
              throw new ServiceUnavailableException('GDELT requested a retry delay over 60 seconds; retry this run later');
            }
            retryMs = Math.max(this.settings.requestDelayMs, Number.isFinite(retryAfter) ? Math.max(0, retryAfter) : 1000 * (attempt + 1));
            await response.body?.cancel();
          } else throw new BadGatewayException(`GDELT returned HTTP ${response.status}`);
        } else return await response.text();
      } catch (error: unknown) {
        if (controller.signal.aborted) throw new GatewayTimeoutException(`GDELT timed out after ${this.settings.timeoutMs}ms`);
        if (error instanceof HttpException) throw error;
        throw new ServiceUnavailableException('GDELT is unavailable; check the network and endpoint');
      } finally { clearTimeout(timer); }
      if (retryMs !== null) await wait(retryMs);
    }
  }
}
