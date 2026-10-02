import { Injectable } from '@nestjs/common';
import { daysSinceLastMention } from '../common/dates';
import { DashboardRepository } from './dashboard.repository';
import { DashboardResponse } from './dashboard-response.dto';
import { parseQuarter } from './quarter';

@Injectable()
export class DashboardService {

  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getDashboard(quarter?: string, now = new Date()): Promise<DashboardResponse> {
    const quarterRange = parseQuarter(quarter, now);
    const companySummaries = await this.dashboardRepository.summarize(
      quarterRange.start,
      quarterRange.end,
    );

    return {
      quarter: quarterRange.quarter,
      companies: companySummaries.map((companySummary) => {
        const lastMentionedAt =
          companySummary.lastMentionedAt === null ? null : new Date(companySummary.lastMentionedAt);

        return {
          id: companySummary.id,
          name: companySummary.name,
          lastMentionedAt: lastMentionedAt?.toISOString() ?? null,
          daysSinceLastMention: daysSinceLastMention(lastMentionedAt, now),
          mentions: {
            total: Number(companySummary.total),
            positive: Number(companySummary.positive),
            neutral: Number(companySummary.neutral),
            negative: Number(companySummary.negative),
          },
        };
      }),
    };
  }
}
