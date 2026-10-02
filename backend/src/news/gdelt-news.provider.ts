import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseApiDate } from '../common/dates';
import { GdeltCache } from './gdelt-cache';
import { gdeltConfig, GdeltConfig } from './gdelt.config';
import { NewsArticle, NewsProvider, NewsSearchInput } from './news-provider';
import { normalizeArticleUrl } from './url-normalization';

const wait = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export function gdeltDate(date: Date): string {
  if (
    !(date instanceof Date) ||
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1 ||
    date.getUTCFullYear() > 9999
  ) {
    throw new BadRequestException('GDELT range requires valid dates with year 0001–9999');
  }

  return date.toISOString().slice(0, 19).replace(/[-:T]/g, '');
}

export function gdeltRequest(settings: GdeltConfig, searchInput: NewsSearchInput): URL {
  if (
    typeof searchInput.queryName !== 'string' ||
    !searchInput.queryName.trim() ||
    /["\r\n\\]/.test(searchInput.queryName)
  ) {
    throw new BadRequestException(
      'News search name must be non-blank, without quotes, backslashes or newlines',
    );
  }

  const from = gdeltDate(searchInput.from);
  const to = gdeltDate(searchInput.to);

  if (
    searchInput.from >= searchInput.to ||
    searchInput.to.getTime() - searchInput.from.getTime() < 900000
  ) {
    throw new BadRequestException(
      'GDELT range must span at least 15 minutes, from before exclusive to',
    );
  }

  const url = new URL(settings.baseUrl);

  for (const [key, value] of Object.entries({
    query: `"${searchInput.queryName.trim()}"`,
    mode: 'ArtList',
    format: 'json',
    sort: 'DateDesc',
    maxrecords: '250',
    startdatetime: from,
    enddatetime: to,
  })) {
    url.searchParams.set(key, value);
  }

  return url;
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate);
}

export function parseGdeltResponse(
  responseText: string,
  searchInput: Pick<NewsSearchInput, 'from' | 'to'>,
): {
  articles: NewsArticle[];
  invalidArticles: number;
  resultLimitReached: boolean;
} {
  let responseBody: unknown;

  try {
    responseBody = JSON.parse(responseText);
  } catch {
    throw new BadGatewayException(
      'GDELT returned non-JSON content; check the query, range and provider availability',
    );
  }

  if (!isRecord(responseBody) || !Array.isArray(responseBody['articles'])) {
    throw new BadGatewayException('GDELT response must contain an articles array');
  }

  const articles: NewsArticle[] = [];
  let invalidArticles = 0;

  for (const providerArticle of responseBody['articles']) {
    try {
      if (
        !isRecord(providerArticle) ||
        typeof providerArticle['title'] !== 'string' ||
        !providerArticle['title'].trim() ||
        typeof providerArticle['url'] !== 'string' ||
        typeof providerArticle['seendate'] !== 'string' ||
        !/^\d{8}T\d{6}Z$/.test(providerArticle['seendate'])
      ) {
        throw Error();
      }

      const seenDateText = providerArticle['seendate'];
      const publishedAt = parseApiDate(
        `${seenDateText.slice(0, 4)}-${seenDateText.slice(4, 6)}-${seenDateText.slice(6, 8)}T${seenDateText.slice(9, 11)}:${seenDateText.slice(11, 13)}:${seenDateText.slice(13, 15)}Z`,
      );
      const url = normalizeArticleUrl(providerArticle['url']);

      if (publishedAt < searchInput.from || publishedAt >= searchInput.to) {
        continue;
      }

      articles.push({
        title: providerArticle['title'].trim(),
        url,
        source: new URL(url).hostname,
        publishedAt,
        description: null,
      });
    } catch {
      invalidArticles++;
    }
  }

  return {
    articles,
    invalidArticles,
    resultLimitReached: responseBody['articles'].length >= 250,
  };
}

@Injectable()
export class GdeltNewsProvider implements NewsProvider {
  readonly settings: GdeltConfig;
  private readonly cache: GdeltCache;
  private lastRequestStarted = 0;
  private readonly logger = new Logger(GdeltNewsProvider.name);

  constructor(configService: ConfigService) {
    this.settings = gdeltConfig(configService);
    this.cache = new GdeltCache(this.settings.cachePath);
  }

  async search(searchInput: NewsSearchInput): Promise<NewsArticle[]> {
    const url = gdeltRequest(this.settings, searchInput).toString();
    const cacheMode = searchInput.cacheMode ?? 'cached';

    if (!['cached', 'refresh', 'live'].includes(cacheMode)) {
      throw new BadRequestException('Invalid news cache mode');
    }

    this.logger.debug(
      `Starting GDELT search for ${searchInput.companyName}, range ${searchInput.from.toISOString()} to ${searchInput.to.toISOString()} (exclusive end); mode=${cacheMode}`,
    );
    let responseText = cacheMode === 'cached' ? await this.cache.read(url) : null;
    const cacheStatus = cacheMode === 'live' ? 'bypassed' : responseText === null ? 'miss' : 'hit';
    const fromCache = responseText !== null;
    this.logger.log(
      `GDELT cache ${cacheMode === 'refresh' ? 'refresh' : cacheStatus} for ${searchInput.companyName}`,
    );

    if (responseText === null) {
      this.logger.log(
        `Fetching GDELT news for ${searchInput.companyName}, range ${searchInput.from.toISOString()} to ${searchInput.to.toISOString()} (exclusive end)`,
      );
      responseText = await this.fetchResponse(url, searchInput.companyName);
    }

    const parsedResponse = parseGdeltResponse(responseText, searchInput);

    if (!fromCache && cacheMode !== 'live') {
      try {
        await this.cache.write(
          {
            companyName: searchInput.companyName,
            query: `"${searchInput.queryName.trim()}"`,
            from: searchInput.from.toISOString(),
            to: searchInput.to.toISOString(),
            url,
          },
          responseText,
        );
      } catch {
        throw new BadGatewayException('Cannot write GDELT cache; check permissions or use --live');
      }
    }

    searchInput.onDiagnostics?.({
      query: `"${searchInput.queryName.trim()}"`,
      requestUrl: url,
      cache: cacheStatus,
      invalidArticles: parsedResponse.invalidArticles,
      resultLimitReached: parsedResponse.resultLimitReached,
    });
    this.logger.log(
      `GDELT search completed for ${searchInput.companyName}: ${parsedResponse.articles.length} articles returned (${fromCache ? 'cache hit' : 'fetched'})`,
    );

    if (parsedResponse.invalidArticles) {
      this.logger.warn(
        `GDELT skipped ${parsedResponse.invalidArticles} invalid articles for ${searchInput.companyName}`,
      );
    }

    if (parsedResponse.resultLimitReached) {
      this.logger.warn(
        `GDELT reached 250 results for ${searchInput.companyName}; this range may be incomplete`,
      );
    }

    return parsedResponse.articles;
  }

  private async fetchResponse(url: string, companyName: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      await wait(
        Math.max(0, this.settings.requestDelayMs - (Date.now() - this.lastRequestStarted)),
      );
      this.lastRequestStarted = Date.now();
      const abortController = new AbortController();
      const timeoutTimer = setTimeout(() => abortController.abort(), this.settings.timeoutMs);
      let retryDelayMs: number | null = null;

      try {
        this.logger.debug(
          `GDELT HTTP request for ${companyName}, attempt ${attempt + 1}/${this.settings.maxRetries + 1}`,
        );
        const response = await fetch(url, {
          signal: abortController.signal,
          redirect: 'error',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          if (
            (response.status === 429 || response.status >= 500) &&
            attempt < this.settings.maxRetries
          ) {
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfterMs =
              retryAfterHeader === null
                ? NaN
                : /^\d+$/.test(retryAfterHeader)
                  ? Number(retryAfterHeader) * 1000
                  : Date.parse(retryAfterHeader) - Date.now();

            if (Number.isFinite(retryAfterMs) && retryAfterMs > 60000) {
              throw new ServiceUnavailableException(
                'GDELT requested a retry delay over 60 seconds; retry this run later',
              );
            }

            retryDelayMs = Math.max(
              this.settings.requestDelayMs,
              Number.isFinite(retryAfterMs) ? Math.max(0, retryAfterMs) : 1000 * (attempt + 1),
            );
            this.logger.warn(
              `GDELT HTTP ${response.status} for ${companyName}; retry ${attempt + 1}/${this.settings.maxRetries} in ${retryDelayMs}ms`,
            );
            await response.body?.cancel();
          } else {
            throw new BadGatewayException(`GDELT returned HTTP ${response.status}`);
          }
        } else {
          return await response.text();
        }
      } catch (error: unknown) {
        if (abortController.signal.aborted) {
          throw new GatewayTimeoutException(`GDELT timed out after ${this.settings.timeoutMs}ms`);
        }

        if (error instanceof HttpException) {
          throw error;
        }

        throw new ServiceUnavailableException(
          'GDELT is unavailable; check the network and endpoint',
        );
      } finally {
        clearTimeout(timeoutTimer);
      }

      if (retryDelayMs !== null) {
        await wait(retryDelayMs);
      }
    }
  }
}
