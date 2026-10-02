import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseCollectionOptions } from './collection-options';
import { CollectionService } from './collection.service';
import { CollectionCliModule } from './collection-cli.module';

async function run(): Promise<void> {
  const options = parseCollectionOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(CollectionCliModule, { logger: ['log', 'warn', 'error'], abortOnError: false });
  try {
    const result = await app.get(CollectionService).collect(options);
    console.info(JSON.stringify(result, null, 2));
    if (result.aborted || result.errors.length) process.exitCode = 1;
  } finally { await app.close(); }
}
void run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Collection failed'); process.exitCode = 1; });
