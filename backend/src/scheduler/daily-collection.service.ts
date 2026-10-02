import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectionService } from '../collection/collection.service';
import { CollectionResult } from '../collection/collection-result';
import { dailyConfig, DailyConfig } from './daily.config';
@Injectable()
export class DailyCollectionService {
  readonly settings: DailyConfig;
  private running = false;
  private readonly logger = new Logger(DailyCollectionService.name);
  constructor(private readonly collectionService: CollectionService, configService: ConfigService) { this.settings = dailyConfig(configService); }
  async runOnce(now = new Date()): Promise<{ skipped: boolean; result?: CollectionResult }> {
    if (this.running) { this.logger.warn('Daily collection skipped: previous run still active'); return { skipped: true }; }
    this.running = true;
    try {
      const to = new Date(Math.floor(now.getTime() / 1000) * 1000);
      this.logger.log(`Starting daily collection for all tracked companies; range ${new Date(to.getTime() - this.settings.lookbackHours * 3600000).toISOString()} to ${to.toISOString()} (exclusive end); live news`);
      const collectionResult = await this.collectionService.collect({ from: new Date(to.getTime() - this.settings.lookbackHours * 3600000), to, cacheMode: 'live' });
      this.logger.log(`Daily collection ${collectionResult.aborted ? 'aborted' : 'completed'}: ${collectionResult.companiesProcessed} companies, ${collectionResult.mentionsInserted} new mentions, ${collectionResult.errors.length} recorded errors`);
      return { skipped: false, result: collectionResult };
    } finally { this.running = false; }
  }
  async scheduledTick(): Promise<void> {
    if (!this.settings.enabled) return;
    this.logger.log('Daily collection schedule triggered');
    try { await this.runOnce(); }
    catch (error: unknown) { this.logger.error(`Scheduled daily collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`); }
  }
}
