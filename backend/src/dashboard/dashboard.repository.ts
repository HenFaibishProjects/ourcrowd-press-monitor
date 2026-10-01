import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { sqliteDate } from '../common/dates';
import { Mention } from '../mentions/mention.entity';
import { Sentiment } from '../mentions/sentiment.enum';

export interface DashboardRow {
  id: number;
  name: string;
  lastMentionedAt: string | null;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

@Injectable()
export class DashboardRepository {
  constructor(@InjectRepository(Company) private readonly companies: Repository<Company>) {}

  summarize(start: Date, end: Date): Promise<DashboardRow[]> {
    // Four-digit dates end at year 9999; Q4's exclusive boundary is year 10000.
    const inQuarter = 'mention.publishedAt >= :start AND (:endBeyondSupportedYears = 1 OR mention.publishedAt < :end)';
    return this.companies.createQueryBuilder('company')
      .leftJoin(Mention, 'mention', 'mention.companyId = company.id')
      .select('company.id', 'id')
      .addSelect('company.name', 'name')
      .addSelect('MAX(mention.publishedAt)', 'lastMentionedAt')
      .addSelect(`SUM(CASE WHEN ${inQuarter} THEN 1 ELSE 0 END)`, 'total')
      .addSelect(`SUM(CASE WHEN ${inQuarter} AND mention.sentiment = :positive THEN 1 ELSE 0 END)`, 'positive')
      .addSelect(`SUM(CASE WHEN ${inQuarter} AND mention.sentiment = :neutral THEN 1 ELSE 0 END)`, 'neutral')
      .addSelect(`SUM(CASE WHEN ${inQuarter} AND mention.sentiment = :negative THEN 1 ELSE 0 END)`, 'negative')
      .setParameters({ start: sqliteDate(start), end: sqliteDate(end), endBeyondSupportedYears: end.getUTCFullYear() > 9999 ? 1 : 0, positive: Sentiment.POSITIVE, neutral: Sentiment.NEUTRAL, negative: Sentiment.NEGATIVE })
      .groupBy('company.id').addGroupBy('company.name')
      .orderBy('company.name', 'ASC').addOrderBy('company.id', 'ASC')
      .getRawMany<DashboardRow>();
  }
}
