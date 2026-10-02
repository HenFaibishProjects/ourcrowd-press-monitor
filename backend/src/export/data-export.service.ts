import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MentionsService } from '../mentions/mentions.service';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    private readonly mentionsService: MentionsService,
    private readonly dashboardService: DashboardService,
  ) {}

  async build(quarter?: string, now = new Date()) {
    const dashboardStatus = await this.dashboardService.getDashboard(quarter, now);
    const storedMentions = await this.mentionsService.findAll();
    const mentions = storedMentions.map((mention) => ({
      id: mention.id,
      company: {
        id: mention.companyId,
        name: mention.company.name,
      },
      title: mention.title,
      description: mention.description,
      source: mention.source,
      url: mention.url,
      publishedAt: mention.publishedAt.toISOString(),
      sentiment: mention.sentiment,
      discoveredAt: mention.discoveredAt.toISOString(),
    }));

    return {
      mentions,
      status: dashboardStatus,
    };
  }

  async export(
    quarter?: string,
    now = new Date(),
    directory = resolve(__dirname, '../../../data/output'),
  ) {
    this.logger.log(
      `Starting data export for quarter ${quarter ?? 'current'}, evaluation time ${now.toISOString()}; reading stored data only`,
    );
    const exportData = await this.build(quarter, now);
    await mkdir(directory, { recursive: true });
    await writeFile(
      resolve(directory, 'mentions.json'),
      JSON.stringify(exportData.mentions, null, 2) + '\n',
    );
    await writeFile(
      resolve(directory, 'company-status.json'),
      JSON.stringify(exportData.status, null, 2) + '\n',
    );
    this.logger.log(
      `Data export completed: ${exportData.mentions.length} mentions, ${exportData.status.companies.length} companies, quarter ${exportData.status.quarter}; output=${directory}`,
    );

    return {
      mentions: exportData.mentions.length,
      companies: exportData.status.companies.length,
      quarter: exportData.status.quarter,
      directory,
    };
  }
}
