import { Injectable } from '@nestjs/common';
import { daysSinceLastMention, fromSqliteDate } from '../common/dates';
import { DashboardRepository } from './dashboard.repository';
import { DashboardResponse } from './dashboard-response.dto';
import { parseQuarter } from './quarter';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  async getDashboard(quarter?: string): Promise<DashboardResponse> {
    const now = new Date();
    const range = parseQuarter(quarter, now);
    const rows = await this.dashboard.summarize(range.start, range.end);
    return {
      quarter: range.quarter,
      companies: rows.map((row) => {
        const lastMentionedAt = row.lastMentionedAt === null ? null : fromSqliteDate(row.lastMentionedAt);
        return {
          id: row.id,
          name: row.name,
          lastMentionedAt: lastMentionedAt?.toISOString() ?? null,
          daysSinceLastMention: daysSinceLastMention(lastMentionedAt, now),
          mentions: { total: row.total, positive: row.positive, neutral: row.neutral, negative: row.negative },
        };
      }),
    };
  }
}
