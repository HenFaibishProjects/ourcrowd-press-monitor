import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database/database.config';
import { environmentModule } from './config/environment';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getRuntimeConfig } from './config/runtime.config';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { MentionsModule } from './mentions/mentions.module';
import { NewsModule } from './news/news.module';
import { SentimentModule } from './sentiment/sentiment.module';
import { CollectionModule } from './collection/collection.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    environmentModule,
    TypeOrmModule.forRootAsync({ imports: [ConfigModule], useFactory: () => databaseOptions() }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        if (!getRuntimeConfig().isProduction) return [];
        const frontendPath = join(__dirname, '../../frontend/dist/frontend/browser');
        if (!existsSync(join(frontendPath, 'index.html'))) {
          throw new Error('Angular production build is missing. Run npm run build from the root.');
        }
        return [{
          rootPath: frontendPath,
          exclude: ['/api', '/api/{*path}'],
          renderPath: /^(?!\/api(?:\/|$))(?!.*\.[^/]+$).*/,
        }];
      },
    }),
    HealthModule,
    CompaniesModule,
    MentionsModule,
    NewsModule,
    SentimentModule,
    CollectionModule,
    SchedulerModule,
    AlertsModule,
    DashboardModule,
  ],
})
export class AppModule {}
