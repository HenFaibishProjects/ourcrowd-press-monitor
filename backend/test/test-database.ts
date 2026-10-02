import 'dotenv/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { databaseOptions } from '../src/database/database.config';
import { InternalServerErrorException } from '@nestjs/common';

export function testDatabaseOptions(): PostgresConnectionOptions {
  // We can load from environment if available, or fallback to default TEST_DB_* env vars
  const dbName = process.env.TEST_DB_DATABASE || 'ourcrowd_press_monitor_test';
  
  if (!dbName || dbName === 'ourcrowd_press_monitor' || !dbName.includes('_test')) {
    throw new InternalServerErrorException(
      `TEST DATABASE ISOLATION FAILED: The provided database name "${dbName}" is not a valid test database. Test database must contain "_test" and must not be the production/development database.`,
    );
  }

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
