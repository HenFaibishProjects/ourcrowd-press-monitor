import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DailyRunModule } from './daily-run.module';
import { DailyCollectionService } from './daily-collection.service';
@Injectable()
export class DailySchedule implements OnApplicationBootstrap {
  constructor(private readonly daily: DailyCollectionService, private readonly registry: SchedulerRegistry) {}
  onApplicationBootstrap(): void {
    if (!this.daily.settings.enabled) return;
    const job = new CronJob(this.daily.settings.cron, () => this.daily.scheduledTick(), null, false, this.daily.settings.timezone);
    this.registry.addCronJob('daily-collection', job);
    job.start();
  }
}
@Module({ imports: [ScheduleModule.forRoot(), DailyRunModule], providers: [DailySchedule] })
export class SchedulerModule {}
