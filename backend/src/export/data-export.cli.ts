import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { parseArgs } from 'node:util';
import { environmentModule } from '../config/environment';
import { databaseOptions } from '../database/database.config';
import { MentionsModule } from '../mentions/mentions.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { parseQuarter } from '../dashboard/quarter';
import { DataExportService } from './data-export.service';
@Module({ imports: [environmentModule, TypeOrmModule.forRootAsync({ imports: [ConfigModule], useFactory: () => databaseOptions() }), MentionsModule, DashboardModule], providers: [DataExportService] })
class ExportCliModule {}
const logger = new Logger('DataExport');

async function run(): Promise<void> {
  const { values } = parseArgs({ options: { quarter: { type: 'string' } }, strict: true, allowPositionals: false });
  const now = new Date();
  const current = parseQuarter(undefined, now);
  const quarter = values.quarter === undefined || values.quarter === 'previous' ? parseQuarter(undefined, new Date(current.start.getTime() - 1)).quarter :
    values.quarter === 'current' ? current.quarter : parseQuarter(values.quarter).quarter;
  const app = await NestFactory.createApplicationContext(ExportCliModule, { logger: ['log', 'warn', 'error'], abortOnError: false });
  try {
    const report = await app.get(DataExportService).export(quarter, now);
    console.info(JSON.stringify(report, null, 2));
    if (!report.mentions) logger.warn('Export contains no mentions. This is not a successful assignment dataset; run real collection and export again.');
  } finally { await app.close(); }
}
void run().catch((error: unknown) => { logger.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`); process.exitCode = 1; });
