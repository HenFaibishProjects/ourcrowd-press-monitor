import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DailyCollectionService } from '../src/scheduler/daily-collection.service';
import { DailySchedule } from '../src/scheduler/scheduler.module';
import { dailyConfig } from '../src/scheduler/daily.config';
import { CollectionService } from '../src/collection/collection.service';
import { CollectionResult } from '../src/collection/collection-result';
import { CollectionOptions } from '../src/collection/collection-options';
import { DataExportService } from '../src/export/data-export.service';
import { testDatabaseOptions } from './test-database';
import { Company } from '../src/companies/company.entity';
import { CompaniesRepository } from '../src/companies/companies.repository';
import { CompaniesService } from '../src/companies/companies.service';
import { MentionsRepository } from '../src/mentions/mentions.repository';
import { MentionsService } from '../src/mentions/mentions.service';
import { Mention } from '../src/mentions/mention.entity';
import { Sentiment } from '../src/mentions/sentiment.enum';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { DashboardRepository } from '../src/dashboard/dashboard.repository';

const now = new Date('2026-10-02T12:00:00Z');
const empty: CollectionResult = { companiesProcessed: 0, companiesFailed: 0, articlesFetched: 0, invalidArticlesSkipped: 0,
  duplicatesSkipped: 0, articlesEnriched: 0, enrichmentFailures: 0, classificationFailures: 0, irrelevantArticlesSkipped: 0, mentionsInserted: 0, resultLimitCompanies: [], aborted: false, errors: [] };

test('disabled scheduling registers no timer and never calls collection', async () => {
  let calls = 0;
  const daily = new DailyCollectionService({ collect: async () => { calls++; return empty; } } as unknown as CollectionService, new ConfigService());
  const registry = new SchedulerRegistry();
  new DailySchedule(daily, registry).onApplicationBootstrap();
  assert.equal(registry.getCronJobs().size, 0);
  await daily.scheduledTick(); assert.equal(calls, 0);
});

test('enabled scheduler registers configured cron/timezone; manual run uses same live all-company collection', async () => {
  let actual: CollectionOptions | undefined;
  const collection = { collect: async (options: CollectionOptions) => { actual = options; return empty; } };
  const daily = new DailyCollectionService(collection as CollectionService, new ConfigService({ DAILY_COLLECTION_ENABLED: 'true', DAILY_COLLECTION_TIMEZONE: 'UTC', DAILY_COLLECTION_LOOKBACK_HOURS: '24' }));
  const registry = new SchedulerRegistry();
  try {
    new DailySchedule(daily, registry).onApplicationBootstrap();
    assert.equal(registry.getCronJobs().size, 1);
    assert.equal(registry.getCronJob('daily-collection').cronTime.timeZone, 'UTC');
    await daily.runOnce(now);
    assert.deepEqual(actual, { from: new Date('2026-10-01T12:00:00Z'), to: now, cacheMode: 'live' });
  } finally { for (const name of registry.getCronJobs().keys()) registry.deleteCronJob(name); }
});

test('daily overlap guard skips new invocation and releases after success or failure', async () => {
  let resolve!: (value: CollectionResult) => void; let calls = 0;
  const daily = new DailyCollectionService({ collect: async () => { calls++; return new Promise<CollectionResult>((done) => { resolve = done; }); } } as unknown as CollectionService, new ConfigService());
  const first = daily.runOnce(now);
  assert.deepEqual(await daily.runOnce(now), { skipped: true }); assert.equal(calls, 1);
  resolve(empty); await first;
  const second = daily.runOnce(now); resolve(empty); await second; assert.equal(calls, 2);
  let failing = true;
  const fail = new DailyCollectionService({ collect: async () => { if (failing) throw new Error('failure'); return empty; } } as unknown as CollectionService, new ConfigService());
  await assert.rejects(fail.runOnce(now), /failure/); failing = false; assert.equal((await fail.runOnce(now)).skipped, false);
});

test('invalid scheduling configuration fails clearly', () => {
  for (const settings of [{ DAILY_COLLECTION_ENABLED: 'yes' }, { DAILY_COLLECTION_CRON: 'bad' },
    { DAILY_COLLECTION_TIMEZONE: 'Unknown/Zone' }, { DAILY_COLLECTION_LOOKBACK_HOURS: 0 }]) {
    assert.throws(() => dailyConfig(new ConfigService(settings)), InternalServerErrorException);
  }
});

test('export includes URLs/sentiments and unmentioned companies, stable for fixed DB/range/time', async () => {
  const database = new DataSource(testDatabaseOptions()); await database.initialize();
  const directory = await mkdtemp(join(tmpdir(), 'press-export-test-'));
  try {
    const [alpha, beta] = await database.getRepository(Company).save([{ name: 'Export Alpha' }, { name: 'Export Beta' }]);
    const companies = new CompaniesService(new CompaniesRepository(database.getRepository(Company), database));
    const mentions = new MentionsService(new MentionsRepository(database.getRepository(Mention)), companies);
    await mentions.create({ companyId: alpha!.id, title: 'Test fixture only', source: 'news.example', url: 'https://news.example/1', publishedAt: new Date('2026-09-20T12:00:00Z'), sentiment: Sentiment.NEGATIVE });
    const exporter = new DataExportService(mentions, new DashboardService(new DashboardRepository(database.getRepository(Company))));
    const first = await exporter.export('2026-Q3', now, directory);
    assert.equal(first.mentions, 1); assert.equal(first.companies, 2);
    const before = [await readFile(join(directory, 'mentions.json')), await readFile(join(directory, 'company-status.json'))];
    await exporter.export('2026-Q3', now, directory);
    assert.deepEqual(await readFile(join(directory, 'mentions.json')), before[0]);
    assert.deepEqual(await readFile(join(directory, 'company-status.json')), before[1]);
    const articles = JSON.parse(before[0]!.toString());
    assert.equal(articles[0].url, 'https://news.example/1'); assert.equal(articles[0].sentiment, 'NEGATIVE'); assert.equal(articles[0].company.name, 'Export Alpha');
    const status = JSON.parse(before[1]!.toString());
    assert.equal(status.companies[0].daysSinceLastMention, 12); assert.equal(status.companies[0].mentions.negative, 1);
    const unmentioned = status.companies.find((row: { id: number }) => row.id === beta!.id);
    assert.equal(unmentioned.lastMentionedAt, null); assert.equal(unmentioned.daysSinceLastMention, null); assert.equal(unmentioned.mentions.total, 0);
  } finally { await database.destroy(); await rm(directory, { recursive: true, force: true }); }
});

test('root CLI scripts preserve argument forwarding and explicit three-company/all scopes', async () => {
  const root = JSON.parse(await readFile(join(__dirname, '../../package.json'), 'utf8'));
  const backend = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'));
  assert.equal(root.scripts['news:dev'], 'npm run news -- --companies=SpaceX,BioCatch,ZutaCore');
  assert.equal(root.scripts['news:dev:refresh'], 'npm run news:dev -- --refresh');
  assert.equal(root.scripts['collect:dev'], 'npm run collect -- --companies=SpaceX,BioCatch,ZutaCore');
  assert.equal(root.scripts['collect:all'], 'npm run collect -- --all --live');
  for (const name of ['news', 'collect', 'daily:run', 'data:export']) {
    assert.equal(root.scripts[name], `npm run ${name} --workspace backend --`);
    const entry = backend.scripts[name].replace(/^ts-node /, '');
    assert((await readFile(join(__dirname, '..', entry), 'utf8')).length > 0);
  }
  for (const name of ['companies:prepare', 'companies', 'companies:setup', 'sentiment:test', 'typecheck', 'test', 'build', 'dev', 'start']) assert(root.scripts[name]);
});
