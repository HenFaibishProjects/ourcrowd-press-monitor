import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { environmentModule } from '../config/environment';
import { databaseOptions } from '../database/database.config';
import { CompaniesModule } from './companies.module';

// CLI context only: migrations and company import, without HTTP or Ollama.
@Module({
  imports: [environmentModule, TypeOrmModule.forRootAsync({ imports: [ConfigModule], useFactory: () => databaseOptions() }), CompaniesModule],
})
export class CompaniesImportModule {}
