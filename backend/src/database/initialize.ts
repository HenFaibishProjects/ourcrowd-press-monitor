import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

async function initialize(): Promise<void> {
  const database = new DataSource(databaseOptions());
  try {
    await database.initialize();
    console.info(`Database initialized: ${database.options.database}`);
  } finally {
    if (database.isInitialized) await database.destroy();
  }
}

void initialize().catch((error: unknown) => {
  console.error('Database initialization failed', error);
  process.exitCode = 1;
});
