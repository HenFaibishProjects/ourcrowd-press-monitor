import { Module } from '@nestjs/common';
import { environmentModule } from '../config/environment';
import { CollectionModule } from '../collection/collection.module';
import { DailyCollectionService } from './daily-collection.service';

// Manual context shares the daily service but never registers cron timers.
@Module({
  imports: [environmentModule, CollectionModule],
  providers: [DailyCollectionService],
  exports: [DailyCollectionService],
})
export class DailyRunModule {}
