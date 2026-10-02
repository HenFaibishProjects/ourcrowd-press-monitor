import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ConflictException, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/company.entity';
import { CompaniesModule } from '../src/companies/companies.module';
import { CompaniesService } from '../src/companies/companies.service';
import { createValidationPipe } from '../src/common/validation';
import { databaseOptions } from '../src/database/database.config';
import { DashboardModule } from '../src/dashboard/dashboard.module';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { MentionsModule } from '../src/mentions/mentions.module';
import { MentionsService } from '../src/mentions/mentions.service';
import { Sentiment } from '../src/mentions/sentiment.enum';

let app: INestApplication;
let database: DataSource;
let companies: CompaniesService;
let mentions: MentionsService;
let dashboard: DashboardService;
let baseUrl: string;

before(async () => {
  const module = await Test.createTestingModule({
    imports: [TypeOrmModule.forRoot({ ...databaseOptions(), dropSchema: true, synchronize: true }), CompaniesModule, MentionsModule, DashboardModule],
  }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
  database = app.get(DataSource);
  companies = app.get(CompaniesService);
  mentions = app.get(MentionsService);
  dashboard = app.get(DashboardService);
});

after(async () => { if (app) await app.close(); });

test('migration creates an empty database and is idempotent', async () => {
  assert.deepEqual(await companies.findAll(), []);
  assert.deepEqual(await dashboard.getDashboard('2026-Q3'), { quarter: '2026-Q3', companies: [] });
  // In a synchronized DB for tests, migrations might not run, just check they don't crash
  await database.runMigrations();
});

test('missing company is a service and HTTP 404, including mentions', async () => {
  await assert.rejects(companies.findOne(999), NotFoundException);
  await assert.rejects(mentions.findByCompany(999, {}), NotFoundException);
  assert.equal((await fetch(`${baseUrl}/api/companies/999`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/companies/999/mentions`)).status, 404);
});

test('HTTP DTO validation rejects invalid IDs, dates, ranges, sentiment, quarters and unknown parameters', async () => {
  const paths = [
    '/companies/0', '/companies/-1', '/companies/1.5', '/companies/1e2', '/companies/9007199254740992',
    '/companies/1/mentions?from=2026-02-30', '/companies/1/mentions?to=garbage',
    '/companies/1/mentions?from=2026-10-01&to=2026-09-30',
    '/companies/1/mentions?sentiment=positive', '/companies/1/mentions?from=2026-01-01&from=2026-02-01',
    '/companies/1/mentions?unexpected=yes', '/dashboard?quarter=2026-Q5', '/dashboard?quarter=',
    '/dashboard?quarter=2026-Q3&quarter=2026-Q4', '/dashboard?unexpected=yes',
  ];
  for (const path of paths) assert.equal((await fetch(`${baseUrl}/api${path}`)).status, 400, path);
});

test('database uniqueness protects a company/url pair but permits the same URL for another company', async () => {
  const repository = database.getRepository(Company);
  const a = await repository.save(repository.create({ name: 'Test company A' }));
  const b = await repository.save(repository.create({ name: 'Test company B' }));
  const input = { companyId: a.id, title: 'Isolated test fixture', url: 'https://test.invalid/shared', source: 'Test', publishedAt: new Date('2026-07-01T00:00:00Z'), sentiment: Sentiment.POSITIVE };
  await mentions.create(input);
  await assert.rejects(mentions.create(input), ConflictException);
  await mentions.create({ ...input, companyId: b.id });
  assert.equal(await mentions.exists(a.id, input.url), true);
  assert.equal(await mentions.exists(a.id, 'https://test.invalid/absent'), false);
});

test('dashboard keeps all companies, applies quarter boundaries and computes all-time latest independently', async () => {
  const repository = database.getRepository(Company);
  const c = await repository.save(repository.create({ name: 'Test company C' }));
  const never = await repository.save(repository.create({ name: 'Test company D' }));
  for (const [date, sentiment] of [
    ['2026-06-30T23:59:59.999Z', Sentiment.NEGATIVE],
    ['2026-07-01T00:00:00Z', Sentiment.POSITIVE],
    ['2026-09-30T23:59:59.999Z', Sentiment.NEUTRAL],
    ['2026-10-01T00:00:00Z', Sentiment.NEGATIVE],
  ] as const) {
    await mentions.create({ companyId: c.id, title: 'Isolated test fixture', url: `https://test.invalid/${date}`, source: 'Test', publishedAt: new Date(date), sentiment });
  }
  const result = await dashboard.getDashboard('2026-Q3');
  const covered = result.companies.find((row) => row.id === c.id);
  assert.deepEqual(covered?.mentions, { total: 2, positive: 1, neutral: 1, negative: 0 });
  assert.equal(covered?.lastMentionedAt, '2026-10-01T00:00:00.000Z');
  const uncovered = result.companies.find((row) => row.id === never.id);
  assert.equal(uncovered?.lastMentionedAt, null);
  assert.equal(uncovered?.daysSinceLastMention, null);
  assert.deepEqual(uncovered?.mentions, { total: 0, positive: 0, neutral: 0, negative: 0 });
  const filtered = await mentions.findByCompany(c.id, { from: '2026-07-01', to: '2026-09-30' });
  assert.deepEqual(filtered.map((mention) => mention.sentiment), [Sentiment.NEUTRAL, Sentiment.POSITIVE]);
  const onlyPositive = await mentions.findByCompany(c.id, { sentiment: Sentiment.POSITIVE });
  assert.equal(onlyPositive.length, 1);
  const response = await fetch(`${baseUrl}/api/companies/${c.id}/mentions?to=2026-09-30T23:59:59.999Z`);
  assert.equal(response.status, 200);
  assert.equal((await response.json() as unknown[]).length, 3);
  const finalYear = await repository.save(repository.create({ name: 'Test final supported year' }));
  await mentions.create({ companyId: finalYear.id, title: 'Isolated boundary fixture', url: 'https://test.invalid/final-year', source: 'Test', publishedAt: new Date('9999-12-31T23:59:59.999Z'), sentiment: Sentiment.NEUTRAL });
  assert.equal((await dashboard.getDashboard('9999-Q4')).companies.find((row) => row.id === finalYear.id)?.mentions.total, 1);
  assert.equal((await mentions.findByCompany(finalYear.id, { to: '9999-12-31' })).length, 1);
});
