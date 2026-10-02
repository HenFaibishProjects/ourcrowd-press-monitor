import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { environmentModule } from '../config/environment';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

const logger = new Logger('DatabaseInitialization');

async function initialize(): Promise<void> {
  await environmentModule;
  const database = new DataSource(databaseOptions());

  try {
    logger.log('Initializing PostgreSQL database and applying pending migrations');
    await database.initialize();
    logger.log('PostgreSQL database initialization completed; pending migrations applied');
  } finally {
    if (database.isInitialized) {
      await database.destroy();
    }
  }
}

void initialize().catch((error: unknown) => {
  const code = (error as { code?: unknown } | null)?.code;
  const reason =
    typeof code === 'string' && /^[A-Z0-9_]{2,30}$/.test(code)
      ? code
      : error instanceof Error
        ? error.name
        : 'unknown error';
  logger.error(
    `PostgreSQL database initialization failed (${reason}); connection or migration setup could not complete`,
  );
  process.exitCode = 1;
});
