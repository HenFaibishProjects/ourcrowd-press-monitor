import { DataSourceOptions } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Mention } from '../mentions/mention.entity';
import { join } from 'node:path';

export function databaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'ourcrowd',
    password: process.env.DB_PASSWORD || 'ourcrowd',
    database: process.env.DB_DATABASE || 'ourcrowd_press_monitor',
    entities: [Company, Mention],
    migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    synchronize: false,
    migrationsRun: true,
    migrationsTransactionMode: 'all',
    logging: false,
  };
}
