import 'reflect-metadata';
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileNewsProvider } from '../src/news/file-news.provider';
import { GdeltNewsProvider } from '../src/news/gdelt-news.provider';
import { NewsModule } from '../src/news/news.module';
import { NEWS_PROVIDER, NewsProvider, NewsSearchInput } from '../src/news/news-provider';
import { CollectionService } from '../src/collection/collection.service';
import { ArticleEnricher } from '../src/collection/article-enricher';
import { CompaniesService } from '../src/companies/companies.service';
import { CompanySearchService } from '../src/companies/company-search.service';
import { Company } from '../src/companies/company.entity';
import { MentionsService } from '../src/mentions/mentions.service';
import { Sentiment } from '../src/mentions/sentiment.enum';

// Synthetic unit-test inputs only; these are not real articles or runtime demo data.
const fixtureArticle = {
  company: 'Unit Test Company',
  title: 'Synthetic test title',
  url: 'https://unit-test.example/article',
  source: 'Unit test source',
  publishedAt: '2026-09-25T10:00:00.000Z',
  description: 'Synthetic context for a database-free unit check.',
};
const searchInput: NewsSearchInput = {
  companyName: fixtureArticle.company,
  queryName: fixtureArticle.company,
  from: new Date('2026-09-01T00:00:00.000Z'),
  to: new Date('2026-10-01T00:00:00.000Z'),
};

afterEach(() => mock.restoreAll());

async function withFixture(
  content: string,
  run: (provider: FileNewsProvider, fixturePath: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'file-news-unit-'));
  const fixturePath = join(directory, 'news.json');

  try {
    await writeFile(fixturePath, content);
    const provider = new FileNewsProvider(new ConfigService({ NEWS_FIXTURE_PATH: fixturePath }));
    await run(provider, fixturePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('file provider selects company and inclusive/exclusive dates without HTTP', async () => {
  const http = mock.method(globalThis, 'fetch', async () => {
    throw new Error('Outbound HTTP is forbidden in this unit check');
  });
  const records = [
    fixtureArticle,
    { ...fixtureArticle, publishedAt: searchInput.from.toISOString(), description: null },
    { ...fixtureArticle, publishedAt: searchInput.to.toISOString() },
    { ...fixtureArticle, company: 'Another Unit Test Company' },
  ];

  await withFixture(JSON.stringify(records), async (provider) => {
    const articles = await provider.search({ ...searchInput, companyName: ' unit test company ' });
    assert.deepEqual(
      articles,
      records.slice(0, 2).map(({ company, ...article }) => ({
        ...article,
        publishedAt: new Date(article.publishedAt),
      })),
    );
    assert.deepEqual(await provider.search({ ...searchInput, companyName: 'No match' }), []);
  });
  assert.equal(http.mock.callCount(), 0);
});

test('fixture validation fails clearly for invalid records, JSON and missing files', async () => {
  for (const invalidRecord of [
    null,
    { ...fixtureArticle, company: ' ' },
    { ...fixtureArticle, title: '' },
    { ...fixtureArticle, url: 'not a URL' },
    { ...fixtureArticle, source: ' ' },
    { ...fixtureArticle, publishedAt: '2026-02-30' },
    { ...fixtureArticle, description: 42 },
  ]) {
    await withFixture(JSON.stringify([fixtureArticle, invalidRecord]), async (provider) => {
      await assert.rejects(provider.search(searchInput), /News fixture record 2/);
    });
  }

  for (const content of ['not JSON', '{}']) {
    await withFixture(content, async (provider) => {
      await assert.rejects(provider.search(searchInput), InternalServerErrorException);
    });
  }

  await withFixture('[]', async (provider, fixturePath) => {
    assert.deepEqual(await provider.search(searchInput), []);
    await rm(fixturePath);
    await assert.rejects(provider.search(searchInput), /Cannot read news fixture/);
  });
});

test('NewsModule defaults to file without initializing GDELT and allows explicit gdelt', () => {
  const registrations = Reflect.getMetadata('providers', NewsModule) as Array<{
    provide: symbol;
    useFactory: (configService: ConfigService) => NewsProvider;
  }>;
  const registration = registrations.find((provider) => provider.provide === NEWS_PROVIDER)!;
  assert(
    registration.useFactory(new ConfigService({ GDELT_BASE_URL: 'invalid' })) instanceof
      FileNewsProvider,
  );
  assert(
    registration.useFactory(new ConfigService({ NEWS_PROVIDER: 'gdelt' })) instanceof
      GdeltNewsProvider,
  );
  assert.throws(
    () => registration.useFactory(new ConfigService({ NEWS_PROVIDER: 'unsupported' })),
    /NEWS_PROVIDER must be file or gdelt/,
  );
});

test('shared collection skips publisher enrichment for supplied context and keeps fallback otherwise', async () => {
  const http = mock.method(globalThis, 'fetch', async () => {
    throw new Error('No external service should run in this unit check');
  });

  for (const description of [fixtureArticle.description, null, '   ']) {
    await withFixture(
      JSON.stringify([{ ...fixtureArticle, description }]),
      async (newsProvider) => {
        const company = { id: 1, name: fixtureArticle.company } as Company;
        let enrichmentCalls = 0;
        let classificationCalls = 0;
        let alertCalls = 0;
        const collectionService = new CollectionService(
          { findOne: async () => company } as unknown as CompaniesService,
          {
            readMetadata: async () => [],
            select: async () => [company],
            queryName: () => company.name,
          } as unknown as CompanySearchService,
          {
            exists: async () => false,
            create: async (mention: object) => ({ ...mention, id: 1 }),
          } as unknown as MentionsService,
          newsProvider,
          {
            classify: async (input) => {
              classificationCalls++;
              assert.equal(input.title, fixtureArticle.title);
              assert.equal(input.description, description?.trim() || null);
              return { relevant: true, sentiment: Sentiment.NEUTRAL };
            },
          },
          {
            sendNewMentions: async () => {
              alertCalls++;
            },
          },
          {
            fetchAndEnrich: async () => {
              enrichmentCalls++;
              return null;
            },
          } as unknown as ArticleEnricher,
        );

        const report = await collectionService.collect({ ...searchInput, cacheMode: 'live' });
        assert.equal(enrichmentCalls, description?.trim() ? 0 : 1);
        assert.equal(classificationCalls, 1);
        assert.equal(report.mentionsInserted, 1);
        assert.equal(alertCalls, 1);
      },
    );
  }
  assert.equal(http.mock.callCount(), 0);
});

test('collection skips duplicate candidates before expensive processing and does not persist irrelevant classifications', async () => {
  const duplicateArticle = { ...fixtureArticle, url: 'https://unit-test.example/duplicate' };
  const irrelevantArticle = { ...fixtureArticle, url: 'https://unit-test.example/irrelevant' };

  await withFixture(
    JSON.stringify([fixtureArticle, duplicateArticle, irrelevantArticle]),
    async (newsProvider) => {
      const company = { id: 1, name: fixtureArticle.company } as Company;
      let enrichmentCalls = 0;
      let classificationCalls = 0;
      let persistenceCalls = 0;
      let alertCalls = 0;

      let isFirstClassify = true;

      const collectionService = new CollectionService(
        { findOne: async () => company } as unknown as CompaniesService,
        {
          readMetadata: async () => [],
          select: async () => [company],
          queryName: () => company.name,
        } as unknown as CompanySearchService,
        {
          exists: async (_companyId: number, url: string) => url === duplicateArticle.url,
          create: async (mention: object) => {
            persistenceCalls++;
            return { ...mention, id: 1 };
          },
        } as unknown as MentionsService,
        newsProvider,
        {
          classify: async () => {
            classificationCalls++;
            if (isFirstClassify) {
              isFirstClassify = false;
              return { relevant: true, sentiment: Sentiment.NEUTRAL };
            }
            return { relevant: false, sentiment: null };
          },
        },
        { sendNewMentions: async () => { alertCalls++; } },
        {
          fetchAndEnrich: async () => {
            enrichmentCalls++;
            return null;
          },
        } as unknown as ArticleEnricher,
      );

      const report = await collectionService.collect({ ...searchInput, cacheMode: 'live' });
      
      // fixtureArticle: enriched, classified(true), persisted
      // duplicateArticle: skipped before enrichment/classification
      // irrelevantArticle: enriched, classified(false), NOT persisted
      assert.equal(enrichmentCalls, 0); // They have a description, so no enrichment needed!
      assert.equal(classificationCalls, 2);
      assert.equal(persistenceCalls, 1);
      assert.equal(report.mentionsInserted, 1);
      assert.equal(alertCalls, 1);
    },
  );
});
