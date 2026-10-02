import { Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DailyRunModule } from './daily-run.module';
import { DailyCollectionService } from './daily-collection.service';

@Injectable()
export class DailySchedule implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailySchedule.name);

  constructor(
    private readonly dailyCollectionService: DailyCollectionService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.dailyCollectionService.settings.enabled) {
      this.logger.log('Daily collection scheduler disabled; no automatic GDELT or Ollama requests');

      return;
    }

    const dailyCollectionJob = new CronJob(
      this.dailyCollectionService.settings.cron,
      () => this.dailyCollectionService.scheduledTick(),
      null,
      false,
      this.dailyCollectionService.settings.timezone,
    );
    this.schedulerRegistry.addCronJob('daily-collection', dailyCollectionJob);
    dailyCollectionJob.start();
    this.logger.log(
      `Daily collection scheduler enabled: cron=${this.dailyCollectionService.settings.cron}, timezone=${this.dailyCollectionService.settings.timezone}, lookback=${this.dailyCollectionService.settings.lookbackHours} hours`,
    );
  }
}

@Module({
  imports: [ScheduleModule.forRoot(), DailyRunModule],
  providers: [DailySchedule],
})
export class SchedulerModule {}
