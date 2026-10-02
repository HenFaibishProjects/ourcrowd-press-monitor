import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { MentionsModule } from '../mentions/mentions.module';
import { NewsModule } from '../news/news.module';
import { SentimentModule } from '../sentiment/sentiment.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CollectionService } from './collection.service';
@Module({ imports: [CompaniesModule, MentionsModule, NewsModule, SentimentModule, AlertsModule], providers: [CollectionService], exports: [CollectionService] })
export class CollectionModule {}
