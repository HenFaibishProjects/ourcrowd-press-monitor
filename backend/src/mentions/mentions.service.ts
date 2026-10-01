import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CompaniesService } from '../companies/companies.service';
import { isDateOnly, nextUtcDay, parseApiDate } from '../common/dates';
import { Mention } from './mention.entity';
import { MentionFilter, NewMention } from './mention.types';
import { MentionsQueryDto } from './mentions-query.dto';
import { MentionsRepository } from './mentions.repository';

@Injectable()
export class MentionsService {
  constructor(private readonly mentions: MentionsRepository, private readonly companies: CompaniesService) {}

  async findByCompany(companyId: number, query: MentionsQueryDto): Promise<Mention[]> {
    const filter: MentionFilter = { sentiment: query.sentiment };
    if (query.from !== undefined) filter.from = parseApiDate(query.from);
    if (query.to !== undefined) {
      filter.toExclusive = isDateOnly(query.to);
      const to = parseApiDate(query.to);
      filter.to = filter.toExclusive ? nextUtcDay(to) : to;
    }
    if (filter.from && filter.to && (filter.toExclusive ? filter.from >= filter.to : filter.from > filter.to)) {
      throw new BadRequestException('from must not be after to');
    }
    await this.companies.findOne(companyId);
    return this.mentions.findByCompany(companyId, filter);
  }

  exists(companyId: number, url: string): Promise<boolean> {
    return this.mentions.exists(companyId, url);
  }

  // Internal collection entry point only; there is deliberately no write controller.
  async create(input: NewMention): Promise<Mention> {
    await this.companies.findOne(input.companyId);
    try {
      return await this.mentions.save(input);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError &&
          (error.driverError as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictException('This URL is already stored for this company');
      }
      throw error;
    }
  }
}
