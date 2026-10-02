import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CollectionCliModule } from '../collection/collection-cli.module';
import { DailyRunModule } from './daily-run.module';
import { DailyCollectionService } from './daily-collection.service';
@Module({ imports: [CollectionCliModule, DailyRunModule] })
class DailyCliModule {}
const logger = new Logger('DailyCommand');

async function run(): Promise<void> {
  if (process.argv.length > 2) throw new Error('daily:run accepts no arguments; configure the lookback through .env');
  const app = await NestFactory.createApplicationContext(DailyCliModule, { logger: ['log', 'warn', 'error'], abortOnError: false });
  try {
    const report = await app.get(DailyCollectionService).runOnce();
    if (report.result?.aborted || report.result?.errors.length) process.exitCode = 1;
  } finally { await app.close(); }
}
void run().catch((error: unknown) => { logger.error(`Daily run failed: ${error instanceof Error ? error.message : 'Unknown error'}`); process.exitCode = 1; });
