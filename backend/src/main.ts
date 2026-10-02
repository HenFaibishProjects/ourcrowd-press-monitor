import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createValidationPipe } from './common/validation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRuntimeConfig } from './config/runtime.config';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  logger.log('Starting Press Monitor backend; connecting to PostgreSQL and applying pending migrations');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();
  const port = getRuntimeConfig().port;
  await app.listen(port);
  logger.log(`Backend ready on port ${port}; PostgreSQL initialized and pending migrations applied`);
}

void bootstrap();
