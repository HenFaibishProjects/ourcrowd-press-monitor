import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';

config({ path: join(__dirname, '../../../../.env') });

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'ourcrowd',
  password: process.env.DB_PASSWORD || 'ourcrowd',
  database: process.env.DB_DATABASE || 'ourcrowd_press_monitor',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
};

export const AppDataSource = new DataSource(options);
