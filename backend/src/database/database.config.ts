import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Mention } from '../mentions/mention.entity';
import { InitialSchema1790856000000 } from './migrations/1790856000000-initial-schema';

// Resolve against the repository, independently of npm's workspace working directory.
const projectRoot = resolve(__dirname, '../../..');

export function databaseOptions(path = process.env['DATABASE_PATH'] ?? 'data/press-monitor.db'): DataSourceOptions {
  if (!path.trim()) throw new Error('DATABASE_PATH must not be empty');
  const database = path === ':memory:' ? path : resolve(projectRoot, path);
  if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
  return {
    type: 'better-sqlite3',
    database,
    entities: [Company, Mention],
    migrations: [InitialSchema1790856000000],
    synchronize: false,
    migrationsRun: true,
    migrationsTransactionMode: 'all',
    logging: false,
  };
}
