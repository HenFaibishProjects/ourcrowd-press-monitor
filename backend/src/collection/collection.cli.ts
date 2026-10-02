import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseCollectionOptions } from './collection-options';
import { CollectionService } from './collection.service';
import { CollectionCliModule } from './collection-cli.module';

const logger = new Logger('CollectionCommand');

async function run(): Promise<void> {
  const options = parseCollectionOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(CollectionCliModule, {
    logger: ['log', 'warn', 'error'],
    abortOnError: false,
  });

  try {
    const collectionResult = await app.get(CollectionService).collect(options);
    console.info(JSON.stringify(collectionResult, null, 2));

    if (collectionResult.aborted || collectionResult.errors.length) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  logger.error(`Collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
