import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Mention } from './mention.entity';
import { MentionFilter, NewMention } from './mention.types';

@Injectable()
export class MentionsRepository {
  constructor(@InjectRepository(Mention) private readonly mentionRepository: Repository<Mention>) {}

  findByCompany(companyId: number, filter: MentionFilter): Promise<Mention[]> {
    const mentionQuery = this.mentionRepository.createQueryBuilder('mention')
      .where('mention.companyId = :companyId', { companyId });
    if (filter.from) mentionQuery.andWhere('mention.publishedAt >= :from', { from: filter.from });
    if (filter.to && filter.to.getUTCFullYear() <= 9999) mentionQuery.andWhere(`mention.publishedAt ${filter.toExclusive ? '<' : '<='} :to`, { to: filter.to });
    if (filter.sentiment) mentionQuery.andWhere('mention.sentiment = :sentiment', { sentiment: filter.sentiment });
    return mentionQuery.orderBy('mention.publishedAt', 'DESC').addOrderBy('mention.id', 'DESC').getMany();
  }

  findAll(): Promise<Mention[]> {
    return this.mentionRepository.find({ relations: { company: true }, order: { companyId: 'ASC', publishedAt: 'ASC', id: 'ASC' } });
  }

  exists(companyId: number, url: string): Promise<boolean> {
    return this.mentionRepository.existsBy({ companyId, url });
  }

  save(newMention: NewMention): Promise<Mention> {
    return this.mentionRepository.save(this.mentionRepository.create({ ...newMention, description: newMention.description ?? null }));
  }
}
