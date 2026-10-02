import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/company.entity';
import { CompaniesRepository } from '../src/companies/companies.repository';
import { validateCompanySeed } from '../src/companies/company-seed';
import { CompanySeedService } from '../src/companies/company-seed.service';
import { databaseOptions } from '../src/database/database.config';

function seed(name: unknown, fields: Record<string, unknown> = {}) {
  return { name, rawName: name, domain: null, aliases: [], sector: null, ...fields };
}

function seedsJson(rows: Array<Record<string, unknown>>): string {
  return JSON.stringify(rows.map(({ name, ...fields }) => seed(name, fields)));
}

async function withImporter(run: (service: CompanySeedService, database: DataSource, path: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'press-seed-test-'));
  const database = new DataSource(databaseOptions(':memory:'));
  try {
    await database.initialize();
    const service = new CompanySeedService(new CompaniesRepository(database.getRepository(Company), database));
    await run(service, database, join(directory, 'companies.json'));
  } finally {
    if (database.isInitialized) await database.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}

test('seed importer trims values, supports missing domains, and is idempotent', async () => {
  await withImporter(async (service, database, path) => {
    await writeFile(path, seedsJson([{ name: ' Test Alpha ', rawName: ' Original Alpha ', aliases: [' Alias Alpha '], domain: ' ALPHA.TEST ', sector: ' Tech ' }, { name: ' Test Beta ' }]));
    assert.deepEqual(await service.importFile(path), { inserted: 2, updated: 0, unchanged: 0 });
    assert.deepEqual(await service.importFile(path), { inserted: 0, updated: 0, unchanged: 2 });
    const rows = await database.getRepository(Company).find({ order: { id: 'ASC' } });
    assert.equal(rows[0]?.name, 'Test Alpha');
    assert.equal(rows[0]?.domain, 'alpha.test');
    assert.equal(rows[0]?.sector, 'Tech');
    assert.equal(rows[1]?.domain, null);
    assert.equal(Object.hasOwn(rows[0]!, 'aliases'), false);
    assert.equal(Object.hasOwn(rows[0]!, 'rawName'), false);
    assert.deepEqual(database.getMetadata(Company).columns.map((column) => column.propertyName).sort(),
      ['createdAt', 'domain', 'id', 'name', 'sector', 'updatedAt']);
  });
});

test('imports enrich by name, rename by domain, apply explicit null fields, and never delete absent companies', async () => {
  await withImporter(async (service, database, path) => {
    await writeFile(path, seedsJson([{ name: 'Test Alpha', sector: 'Tech' }, { name: 'Test Beta' }]));
    await service.importFile(path);
    await writeFile(path, seedsJson([{ name: 'Test Alpha', domain: 'alpha.test' }]));
    assert.deepEqual(await service.importFile(path), { inserted: 0, updated: 1, unchanged: 0 });
    assert.equal((await database.getRepository(Company).findOneByOrFail({ name: 'Test Alpha' })).sector, null);
    await writeFile(path, seedsJson([{ name: 'Renamed Test Alpha', domain: 'alpha.test', sector: null }]));
    assert.deepEqual(await service.importFile(path), { inserted: 0, updated: 1, unchanged: 0 });
    assert.equal(await database.getRepository(Company).count(), 2);
    assert.equal((await database.getRepository(Company).findOneByOrFail({ domain: 'alpha.test' })).sector, null);
    await writeFile(path, seedsJson([{ name: 'Renamed Test Alpha', domain: null, sector: null }]));
    assert.deepEqual(await service.importFile(path), { inserted: 0, updated: 1, unchanged: 0 });
    assert.equal((await database.getRepository(Company).findOneByOrFail({ name: 'Renamed Test Alpha' })).domain, null);
  });
});

test('invalid seed structure, names, fields and duplicate identities are rejected', () => {
  for (const value of [null, {}, '[]', [null], [[]], [{ name: 'Old format' }], [seed(' ')], [seed(12)],
    [seed('Test', { domain: 12 })], [seed('Test', { sector: [] })], [seed('Test', { extra: true })],
    [seed('Test', { rawName: ' ' })], [seed('Test', { domain: 'https://test.example/path' })],
    [seed('Test', { aliases: 'Alias' })], [seed('Test', { aliases: [' '] })],
    [seed('Test', { aliases: ['Alias', ' alias '] })], [seed('Test', { aliases: [' TEST '] })],
    [seed('Test', { domain: '' })], [seed('Same'), seed(' same ')],
    [seed('A', { domain: 'same.test' }), seed('B', { domain: 'SAME.TEST' })]]) {
    assert.throws(() => validateCompanySeed(value), BadRequestException);
  }
});

test('missing file, malformed JSON and an invalid later row leave no companies behind', async () => {
  await withImporter(async (service, database, path) => {
    await assert.rejects(service.importFile(path), /Run npm run companies:prepare/);
    await writeFile(path, '{bad json');
    await assert.rejects(service.importFile(path), BadRequestException);
    await writeFile(path, seedsJson([{ name: 'Valid test fixture' }, { name: '' }]));
    await assert.rejects(service.importFile(path), BadRequestException);
    assert.equal(await database.getRepository(Company).count(), 0);
  });
});

test('ambiguous database identity and conflicting domains fail with transaction rollback', async () => {
  await withImporter(async (service, database, path) => {
    const repository = database.getRepository(Company);
    await repository.save([{ name: 'Test Alpha', domain: 'alpha.test' }, { name: 'Test Beta', domain: 'beta.test' }]);
    await writeFile(path, seedsJson([{ name: 'New test fixture' }, { name: 'Test Alpha', domain: 'beta.test' }]));
    await assert.rejects(service.importFile(path), ConflictException);
    assert.equal(await repository.count(), 2);
    await writeFile(path, seedsJson([{ name: 'Test Alpha', domain: 'changed.test' }]));
    await assert.rejects(service.importFile(path), ConflictException);
    await repository.save({ name: 'test alpha' });
    await writeFile(path, seedsJson([{ name: 'Test Alpha' }]));
    await assert.rejects(service.importFile(path), ConflictException);
  });
});

test('two alias rows cannot match the same company after a domain-based rename', async () => {
  await withImporter(async (service, database, path) => {
    const repository = database.getRepository(Company);
    await repository.save({ name: 'Old test name', domain: 'alias.test' });
    await writeFile(path, seedsJson([{ name: 'New test name', domain: 'alias.test' }, { name: 'Old test name' }]));
    await assert.rejects(service.importFile(path), ConflictException);
    assert.equal((await repository.find())[0]?.name, 'Old test name');
    assert.equal(await repository.count(), 1);
  });
});
