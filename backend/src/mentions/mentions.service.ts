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
  constructor(private readonly mentionsRepository: MentionsRepository, private readonly companiesService: CompaniesService) {}

  async findByCompany(companyId: number, query: MentionsQueryDto): Promise<Mention[]> {
    const mentionFilter: MentionFilter = { sentiment: query.sentiment };
    if (query.from !== undefined) mentionFilter.from = parseApiDate(query.from);
    if (query.to !== undefined) {
      mentionFilter.toExclusive = isDateOnly(query.to);
      const endDate = parseApiDate(query.to);
      mentionFilter.to = mentionFilter.toExclusive ? nextUtcDay(endDate) : endDate;
    }
    if (mentionFilter.from && mentionFilter.to && (mentionFilter.toExclusive ? mentionFilter.from >= mentionFilter.to : mentionFilter.from > mentionFilter.to)) {
      throw new BadRequestException('from must not be after to');
    }
    await this.companiesService.findOne(companyId);
    return this.mentionsRepository.findByCompany(companyId, mentionFilter);
  }

  findAll(): Promise<Mention[]> { return this.mentionsRepository.findAll(); }

  exists(companyId: number, url: string): Promise<boolean> {
    return this.mentionsRepository.exists(companyId, url);
  }

  // Internal collection entry point only; there is deliberately no write controller.
  async create(newMention: NewMention): Promise<Mention> {
    await this.companiesService.findOne(newMention.companyId);
    try {
      return await this.mentionsRepository.save(newMention);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError &&
          (error.driverError as { code?: string }).code === '23505') {
        throw new ConflictException('This URL is already stored for this company');
      }
      throw error;
    }
  }
}
