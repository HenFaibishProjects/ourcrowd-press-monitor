import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InternalServerErrorException } from '@nestjs/common';
import { testDatabaseOptions } from './test-database';

test('production DB name is rejected', () => {
  process.env.TEST_DB_DATABASE = 'ourcrowd_press_monitor';
  assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
});

test('missing test DB name is rejected', () => {
  delete process.env.TEST_DB_DATABASE;
  assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
});

test('empty test DB name is rejected', () => {
  process.env.TEST_DB_DATABASE = '';
  assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
});

test('whitespace-only test DB name is rejected', () => {
  process.env.TEST_DB_DATABASE = '   ';
  assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
});

test('name without _test is rejected', () => {
  process.env.TEST_DB_DATABASE = 'custom_db';
  assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
});

test('valid _test database is accepted', () => {
  process.env.TEST_DB_DATABASE = ' custom_db_test ';
  const options = testDatabaseOptions();
  assert.equal(options.database, 'custom_db_test');
  assert.equal(options.dropSchema, true);
  assert.equal(options.synchronize, true);
});
