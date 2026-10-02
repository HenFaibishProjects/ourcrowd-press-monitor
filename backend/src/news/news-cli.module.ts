import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { environmentModule } from '../config/environment';
import { databaseOptions } from '../database/database.config';
import { CompaniesModule } from '../companies/companies.module';
import { NewsModule } from './news.module';

// No SentimentModule, CollectionModule or Mention-writing context.
@Module({
  imports: [
    environmentModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => databaseOptions(),
    }),
    CompaniesModule,
    NewsModule,
  ],
})
export class NewsCliModule {}
