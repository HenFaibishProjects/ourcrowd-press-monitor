import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqliteDate } from '../common/dates';
import { Mention } from './mention.entity';
import { MentionFilter, NewMention } from './mention.types';

@Injectable()
export class MentionsRepository {
  constructor(@InjectRepository(Mention) private readonly mentions: Repository<Mention>) {}

  findByCompany(companyId: number, filter: MentionFilter): Promise<Mention[]> {
    const query = this.mentions.createQueryBuilder('mention')
      .where('mention.companyId = :companyId', { companyId });
    if (filter.from) query.andWhere('mention.publishedAt >= :from', { from: sqliteDate(filter.from) });
    if (filter.to && filter.to.getUTCFullYear() <= 9999) query.andWhere(`mention.publishedAt ${filter.toExclusive ? '<' : '<='} :to`, { to: sqliteDate(filter.to) });
    if (filter.sentiment) query.andWhere('mention.sentiment = :sentiment', { sentiment: filter.sentiment });
    return query.orderBy('mention.publishedAt', 'DESC').addOrderBy('mention.id', 'DESC').getMany();
  }

  exists(companyId: number, url: string): Promise<boolean> {
    return this.mentions.existsBy({ companyId, url });
  }

  save(input: NewMention): Promise<Mention> {
    return this.mentions.save(this.mentions.create({ ...input, description: input.description ?? null }));
  }
}
