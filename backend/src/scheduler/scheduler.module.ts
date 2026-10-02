import { Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DailyRunModule } from './daily-run.module';
import { DailyCollectionService } from './daily-collection.service';
@Injectable()
export class DailySchedule implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailySchedule.name);
  constructor(private readonly daily: DailyCollectionService, private readonly registry: SchedulerRegistry) {}
  onApplicationBootstrap(): void {
    if (!this.daily.settings.enabled) {
      this.logger.log('Daily collection scheduler disabled; no automatic GDELT or Ollama requests');
      return;
    }
    const job = new CronJob(this.daily.settings.cron, () => this.daily.scheduledTick(), null, false, this.daily.settings.timezone);
    this.registry.addCronJob('daily-collection', job);
    job.start();
    this.logger.log(`Daily collection scheduler enabled: cron=${this.daily.settings.cron}, timezone=${this.daily.settings.timezone}, lookback=${this.daily.settings.lookbackHours} hours`);
  }
}
@Module({ imports: [ScheduleModule.forRoot(), DailyRunModule], providers: [DailySchedule] })
export class SchedulerModule {}
