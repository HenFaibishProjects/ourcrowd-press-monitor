import 'reflect-metadata';
import { createValidationPipe } from './common/validation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { runtimeConfig } from './config/runtime.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
