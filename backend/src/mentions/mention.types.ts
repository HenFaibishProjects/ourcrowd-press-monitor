import { Mention } from './mention.entity';
import { Sentiment } from './sentiment.enum';

export interface MentionFilter {
  from?: Date;
  to?: Date;
  toExclusive?: boolean;
  sentiment?: Sentiment;
}

export type NewMention = Pick<Mention, 'companyId' | 'title' | 'url' | 'source' | 'publishedAt' | 'sentiment'> & {
  description?: string | null;
};
