import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { CompaniesImportModule } from './companies-import.module';
import { CompanySeedService } from './company-seed.service';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CompaniesImportModule, { logger: false, abortOnError: false });
  try {
    const report = await app.get(CompanySeedService).importFile();
    console.info(`Companies: inserted=${report.inserted}, updated=${report.updated}, unchanged=${report.unchanged}`);
  } finally { await app.close(); }
}

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Company import failed');
  process.exitCode = 1;
});
