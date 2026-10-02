import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CompaniesImportModule } from './companies-import.module';
import { CompanySeedService } from './company-seed.service';

const logger = new Logger('CompanyImport');

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CompaniesImportModule, {
    logger: ['log', 'warn', 'error'],
    abortOnError: false,
  });

  try {
    const report = await app.get(CompanySeedService).importFile();
    console.info(
      `Companies: inserted=${report.inserted}, updated=${report.updated}, unchanged=${report.unchanged}`,
    );
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  logger.error(
    `Company import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
  process.exitCode = 1;
});
