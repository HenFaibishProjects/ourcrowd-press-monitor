import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isValidApiDate, parseApiDate } from '../common/dates';
import { companyNameKey } from '../companies/company-seed';
import { NewsArticle, NewsProvider, NewsSearchInput } from './news-provider';

interface FixtureArticle extends NewsArticle {
  company: string;
}

function parseFixtureArticle(record: unknown, index: number): FixtureArticle {
  const location = `News fixture record ${index + 1}`;

  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    throw new InternalServerErrorException(`${location} must be an object`);
  }

  const fields = record as Record<string, unknown>;

  for (const field of ['company', 'title', 'url', 'source'] as const) {
    if (typeof fields[field] !== 'string' || !fields[field].trim()) {
      throw new InternalServerErrorException(`${location}: ${field} must be a non-blank string`);
    }
  }

  let url: URL;

  try {
    url = new URL(fields['url'] as string);
  } catch {
    throw new InternalServerErrorException(`${location}: url must be an absolute HTTP(S) URL`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new InternalServerErrorException(`${location}: url must use HTTP(S) without credentials`);
  }

  if (!isValidApiDate(fields['publishedAt'])) {
    throw new InternalServerErrorException(
      `${location}: publishedAt must be a valid YYYY-MM-DD date or ISO timestamp with timezone`,
    );
  }

  if (
    fields['description'] !== undefined &&
    fields['description'] !== null &&
    typeof fields['description'] !== 'string'
  ) {
    throw new InternalServerErrorException(`${location}: description must be a string or null`);
  }

  return {
    company: fields['company'] as string,
    title: fields['title'] as string,
    url: fields['url'] as string,
    source: fields['source'] as string,
    publishedAt: parseApiDate(fields['publishedAt']),
    description: (fields['description'] as string | null | undefined) ?? null,
  };
}

@Injectable()
export class FileNewsProvider implements NewsProvider {
  private readonly logger = new Logger(FileNewsProvider.name);
  private readonly fixturePath: string;

  constructor(configService: ConfigService) {
    const fixturePath =
      configService.get<string>('NEWS_FIXTURE_PATH') ?? 'data/fixtures/demo-news.json';

    if (!fixturePath.trim()) {
      throw new InternalServerErrorException('NEWS_FIXTURE_PATH must not be blank');
    }

    this.fixturePath = resolve(__dirname, '../../..', fixturePath);
  }

  async search(searchInput: NewsSearchInput): Promise<NewsArticle[]> {
    let fixtureJson: string;

    try {
      fixtureJson = await readFile(this.fixturePath, 'utf8');
    } catch {
      throw new InternalServerErrorException(
        `Cannot read news fixture: ${this.fixturePath}. Create a JSON article array; see data/fixtures/README.md`,
      );
    }

    let fixtureContent: unknown;

    try {
      fixtureContent = JSON.parse(fixtureJson);
    } catch {
      throw new InternalServerErrorException(
        `News fixture contains invalid JSON: ${this.fixturePath}`,
      );
    }

    if (!Array.isArray(fixtureContent)) {
      throw new InternalServerErrorException(
        `News fixture must be a JSON array: ${this.fixturePath}`,
      );
    }

    // Validate the entire file before selecting, so invalid records never hide behind a filter.
    const fixtureArticles = fixtureContent.map(parseFixtureArticle);
    const selectedArticles = fixtureArticles
      .filter(
        (article) =>
          companyNameKey(article.company) === companyNameKey(searchInput.companyName) &&
          article.publishedAt >= searchInput.from &&
          article.publishedAt < searchInput.to,
      )
      .map(({ company, ...article }) => article);

    this.logger.log(
      `Selected ${selectedArticles.length} fixture articles for ${searchInput.companyName}, range ${searchInput.from.toISOString()} to ${searchInput.to.toISOString()} (exclusive end)`,
    );

    return selectedArticles;
  }
}
