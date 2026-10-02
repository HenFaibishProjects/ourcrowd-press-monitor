import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MentionsService } from '../mentions/mentions.service';
import { DashboardService } from '../dashboard/dashboard.service';
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  constructor(private readonly mentions: MentionsService, private readonly dashboard: DashboardService) {}
  async build(quarter?: string, now = new Date()) {
    const status = await this.dashboard.getDashboard(quarter, now);
    const stored = await this.mentions.findAll();
    const mentions = stored.map((mention) => ({ id: mention.id, company: { id: mention.companyId, name: mention.company.name },
      title: mention.title, description: mention.description, source: mention.source, url: mention.url,
      publishedAt: mention.publishedAt.toISOString(), sentiment: mention.sentiment, discoveredAt: mention.discoveredAt.toISOString() }));
    return { mentions, status };
  }
  async export(quarter?: string, now = new Date(), directory = resolve(__dirname, '../../../data/output')) {
    this.logger.log(`Starting data export for quarter ${quarter ?? 'current'}, evaluation time ${now.toISOString()}; reading stored data only`);
    const output = await this.build(quarter, now);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'mentions.json'), JSON.stringify(output.mentions, null, 2) + '\n');
    await writeFile(resolve(directory, 'company-status.json'), JSON.stringify(output.status, null, 2) + '\n');
    this.logger.log(`Data export completed: ${output.mentions.length} mentions, ${output.status.companies.length} companies, quarter ${output.status.quarter}; output=${directory}`);
    return { mentions: output.mentions.length, companies: output.status.companies.length, quarter: output.status.quarter, directory };
  }
}
