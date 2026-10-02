import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InternalServerErrorException } from '@nestjs/common';
import { testDatabaseOptions } from './test-database';

test('production DB name is rejected', () => {
  const original = process.env.TEST_DB_DATABASE;
  process.env.TEST_DB_DATABASE = 'ourcrowd_press_monitor';
  try {
    assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
  } finally {
    process.env.TEST_DB_DATABASE = original;
  }
});

test('missing test DB name is rejected', () => {
  const original = process.env.TEST_DB_DATABASE;
  process.env.TEST_DB_DATABASE = '';
  try {
    assert.throws(() => testDatabaseOptions(), InternalServerErrorException);
  } finally {
    process.env.TEST_DB_DATABASE = original;
  }
});

test('valid _test database is accepted', () => {
  const original = process.env.TEST_DB_DATABASE;
  process.env.TEST_DB_DATABASE = 'custom_db_test';
  try {
    const options = testDatabaseOptions();
    assert.equal(options.database, 'custom_db_test');
    assert.equal(options.dropSchema, true);
    assert.equal(options.synchronize, true);
  } finally {
    process.env.TEST_DB_DATABASE = original;
  }
});
