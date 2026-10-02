import 'dotenv/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { databaseOptions } from '../src/database/database.config';
import { InternalServerErrorException } from '@nestjs/common';

export function getTestDbName(): string {
  const dbName = (process.env.TEST_DB_DATABASE || '').trim();

  if (!dbName) {
    throw new InternalServerErrorException(
      'TEST DATABASE ISOLATION FAILED: TEST_DB_DATABASE environment variable is required.',
    );
  }

  if (dbName === 'ourcrowd_press_monitor' || !dbName.includes('_test')) {
    throw new InternalServerErrorException(
      `TEST DATABASE ISOLATION FAILED: The provided database name "${dbName}" is not a valid test database. Test database must contain "_test" and must not be the production/development database.`,
    );
  }

  return dbName;
}

export function testDatabaseOptions(): PostgresConnectionOptions {
  const dbName = getTestDbName();

  const baseOptions = databaseOptions() as PostgresConnectionOptions;
  return {
    ...baseOptions,
    host: process.env.TEST_DB_HOST || baseOptions.host,
    port: process.env.TEST_DB_PORT ? parseInt(process.env.TEST_DB_PORT, 10) : baseOptions.port,
    username: process.env.TEST_DB_USERNAME || baseOptions.username,
    password: process.env.TEST_DB_PASSWORD || baseOptions.password,
    database: dbName,
    dropSchema: true,
    synchronize: true,
  };
}
