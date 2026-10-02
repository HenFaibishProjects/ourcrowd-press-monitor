import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadGatewayException, BadRequestException, ConflictException, GatewayTimeoutException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../src/database/database.config';
import { Company } from '../src/companies/company.entity';
import { CompaniesRepository } from '../src/companies/companies.repository';
import { CompaniesService } from '../src/companies/companies.service';
import { CompanySearchService, DEVELOPMENT_COMPANIES } from '../src/companies/company-search.service';
import { StructuredCompanySeed } from '../src/companies/company-seed';
import { Mention } from '../src/mentions/mention.entity';
import { MentionsRepository } from '../src/mentions/mentions.repository';
import { MentionsService } from '../src/mentions/mentions.service';
import { Sentiment } from '../src/mentions/sentiment.enum';
import { NewsArticle } from '../src/news/news-provider';
import { CollectionService } from '../src/collection/collection.service';
import { CollectionOptions, collectionRange, parseCollectionOptions } from '../src/collection/collection-options';
import { NewMentionAlert } from '../src/alerts/alert-service';

const now = new Date('2026-10-02T00:00:00Z');
const options: CollectionOptions = { companies: ['Test Alpha', 'Test Beta'], from: new Date('2026-07-01T00:00:00Z'), to: new Date('2026-10-01T00:00:00Z'), cacheMode: 'cached' };
const article = (url = 'https://news.example/story'): NewsArticle => ({ title: 'Boundary fixture', url, source: 'news.example', publishedAt: new Date('2026-09-20T12:00:00Z'), description: null });
async function fixture(run: (context: {
  service: CollectionService; mentions: MentionsService; database: DataSource; scope: CompanySearchService;
  fetched: string[]; classified: string[]; alerts: NewMentionAlert[][];
  news: { search: (input: { companyName: string }) => Promise<NewsArticle[]> };
  classifier: { classify: (input: { companyName: string }) => Promise<Sentiment> };
  alert: { sendNewMentions: (mentions: NewMentionAlert[]) => Promise<void> };
}) => Promise<void>) {
  const database = new DataSource(databaseOptions(':memory:')); await database.initialize();
  try {
    await database.getRepository(Company).save([{ name: 'Test Alpha' }, { name: 'Test Beta' }]);
    const companies = new CompaniesService(new CompaniesRepository(database.getRepository(Company), database));
    const scope = new CompanySearchService(companies);
    scope.readMetadata = async () => [];
    const mentions = new MentionsService(new MentionsRepository(database.getRepository(Mention)), companies);
    const fetched: string[] = []; const classified: string[] = []; const alerts: NewMentionAlert[][] = [];
    const news = { search: async ({ companyName }: { companyName: string }) => { fetched.push(companyName); return [article()]; } };
    const classifier = { classify: async ({ companyName }: { companyName: string }) => { classified.push(companyName); return Sentiment.POSITIVE; } };
    const alert = { sendNewMentions: async (input: NewMentionAlert[]) => { assert.equal(await database.getRepository(Mention).count(), input.length); alerts.push(input); } };
    const service = new CollectionService(companies, scope, mentions, news, classifier, alert);
    await run({ service, mentions, database, scope, fetched, classified, alerts, news, classifier, alert });
  } finally { await database.destroy(); }
}

test('new articles persist per company, classification is sequential, and one alert follows persistence', async () => {
  await fixture(async ({ service, classified, alerts, database, classifier }) => {
    let active = 0; let maximum = 0;
    classifier.classify = async ({ companyName }) => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--; classified.push(companyName); return Sentiment.POSITIVE; };
    const result = await service.collect(options);
    assert.equal(result.companiesProcessed, 2); assert.equal(result.companiesFailed, 0); assert.equal(result.articlesFetched, 2);
    assert.equal(result.mentionsInserted, 2); assert.equal(result.duplicatesSkipped, 0); assert.equal(result.classificationFailures, 0);
    assert.equal(maximum, 1); assert.deepEqual(classified, ['Test Alpha', 'Test Beta']); assert.equal(alerts.length, 1); assert.equal(alerts[0]?.length, 2);
    assert.equal(await database.getRepository(Mention).count(), 2); assert.equal(result.aborted, false); assert.deepEqual(result.errors, []);
  });
});

test('provider and database URL duplicates are skipped before classification; unchanged run emits no alert', async () => {
  await fixture(async ({ service, news, classified, alerts }) => {
    news.search = async () => [article('https://NEWS.EXAMPLE/story?utm_source=x#part'), article('https://news.example/story')];
    const first = await service.collect({ ...options, companies: ['Test Alpha'] });
    assert.equal(first.mentionsInserted, 1); assert.equal(first.duplicatesSkipped, 1); assert.equal(classified.length, 1);
    const second = await service.collect({ ...options, companies: ['Test Alpha'] });
    assert.equal(second.mentionsInserted, 0); assert.equal(second.duplicatesSkipped, 2); assert.equal(classified.length, 1); assert.equal(alerts.length, 1);
  });
});

test('provider failure for one company leaves other companies independent', async () => {
  await fixture(async ({ service, news, classified }) => {
    news.search = async ({ companyName }) => { if (companyName === 'Test Alpha') throw new BadGatewayException('provider failure'); return [article()]; };
    const result = await service.collect(options);
    assert.equal(result.companiesProcessed, 2); assert.equal(result.companiesFailed, 1); assert.equal(result.mentionsInserted, 1);
    assert.deepEqual(classified, ['Test Beta']); assert.equal(result.errors[0]?.stage, 'provider'); assert.equal(result.aborted, false);
  });
});

test('unavailable classifier aborts early without neutral persistence or dozens of calls', async () => {
  await fixture(async ({ service, classifier, fetched, database, alerts }) => {
    let calls = 0; classifier.classify = async () => { calls++; throw new ServiceUnavailableException('Ollama offline'); };
    const result = await service.collect(options);
    assert.equal(calls, 1); assert.deepEqual(fetched, ['Test Alpha']); assert.equal(result.aborted, true);
    assert.equal(result.classificationFailures, 1); assert.equal(result.mentionsInserted, 0); assert.equal(await database.getRepository(Mention).count(), 0); assert.equal(alerts.length, 0);
  });
});

test('malformed model responses continue, two consecutive timeouts abort, partial inserts still alert', async () => {
  await fixture(async ({ service, classifier, news, alerts }) => {
    news.search = async () => [article('https://news.example/1'), article('https://news.example/2'), article('https://news.example/3'), article('https://news.example/4')];
    let calls = 0;
    classifier.classify = async () => { calls++; if (calls === 1) throw new BadGatewayException('malformed output'); if (calls >= 3) throw new GatewayTimeoutException('timeout'); return Sentiment.NEUTRAL; };
    const result = await service.collect(options);
    assert.equal(calls, 4); assert.equal(result.classificationFailures, 3); assert.equal(result.mentionsInserted, 1); assert.equal(result.aborted, true);
    assert.equal(alerts.length, 1); assert.equal(alerts[0]?.length, 1);
  });
});

test('invalid articles are skipped, unique-constraint races counted, alert failures cannot roll back', async () => {
  await fixture(async ({ service, news, mentions }) => {
    news.search = async () => [{ ...article(), title: '' }, article()];
    mentions.create = async () => { throw new ConflictException('race'); };
    const result = await service.collect({ ...options, companies: ['Test Alpha'] });
    assert.equal(result.invalidArticlesSkipped, 1); assert.equal(result.duplicatesSkipped, 1); assert.equal(result.mentionsInserted, 0);
  });
  await fixture(async ({ service, alert, database }) => {
    alert.sendNewMentions = async () => { throw new Error('delivery failed'); };
    const result = await service.collect(options); assert.equal(result.mentionsInserted, 2); assert.equal(result.errors[0]?.stage, 'alert');
    assert.equal(await database.getRepository(Mention).count(), 2);
  });
});

test('invalid global provider configuration aborts rather than trying every company', async () => {
  await fixture(async ({ service, news }) => {
    news.search = async () => { throw new InternalServerErrorException('invalid global settings'); };
    const result = await service.collect(options); assert.equal(result.aborted, true); assert.equal(result.companiesProcessed, 1);
  });
});

test('CLI scope/range parsing validates conflicts, explicit dates and previous-quarter rollover', () => {
  assert.deepEqual(parseCollectionOptions(['--companies=SpaceX,BioCatch,ZutaCore', '--quarter=previous'], now),
    { companies: [...DEVELOPMENT_COMPANIES], from: options.from, to: options.to, cacheMode: 'cached' });
  assert.equal(parseCollectionOptions(['--all', '--live'], now).companies, undefined);
  assert.equal(collectionRange({ quarter: 'previous' }, new Date('2026-01-02T00:00:00Z')).from.toISOString(), '2025-10-01T00:00:00.000Z');
  assert.equal(collectionRange({ quarter: 'current' }, now).to.toISOString(), now.toISOString());
  assert.equal(collectionRange({ from: '2026-09-01', to: '2026-09-30' }, now).to.toISOString(), '2026-10-01T00:00:00.000Z');
  for (const args of [[], ['--all', '--companies=A'], ['--companies='], ['--all', '--quarter=bad'], ['--all', '--quarter=2026-Q5'],
    ['--all', '--from=bad', '--to=2026-09-30'], ['--all', '--from=2026-09-01'], ['--all', '--from=2026-09-01', '--to=2026-09-30', '--quarter=previous'],
    ['--all', '--refresh', '--live'], ['--all', '--all'], ['--all', '--unknown'], ['--all', '--quarter=2027-Q1']]) {
    assert.throws(() => parseCollectionOptions(args, now), BadRequestException);
  }
});

test('search metadata uses only expanded acronym aliases and selects actual database companies', async () => {
  await fixture(async ({ scope, database }) => {
    assert.equal((await scope.select(['test alpha']))[0]?.name, 'Test Alpha');
    await assert.rejects(scope.select(['Missing']), BadRequestException);
    await assert.rejects(scope.select(['Test Alpha', 'test alpha']), BadRequestException);
    const metadata: StructuredCompanySeed[] = [
      { name: 'SSI', rawName: 'SSI (Safe Superintelligence)', domain: null, aliases: ['Safe Superintelligence'], sector: null },
      { name: 'Ludeo', rawName: 'Ludeo (formerly Edge)', domain: null, aliases: ['Edge'], sector: null },
      { name: 'ABC', rawName: 'ABC (formerly known as Old Business)', domain: null, aliases: ['Old Business'], sector: null },
    ];
    assert.equal(scope.queryName({ name: 'SSI', domain: null } as Company, metadata), 'Safe Superintelligence');
    assert.equal(scope.queryName({ name: 'Ludeo', domain: null } as Company, metadata), 'Ludeo');
    assert.equal(scope.queryName({ name: 'ABC', domain: null } as Company, metadata), 'ABC');
    assert.equal(scope.queryName({ name: 'SpaceX', domain: null } as Company, metadata), 'SpaceX');
    await database.getRepository(Company).clear(); await assert.rejects(scope.select(), /companies:setup/);
  });
});
