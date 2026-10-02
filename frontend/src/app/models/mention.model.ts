import { Sentiment } from './dashboard.model';

export interface Mention {
  id: number;
  companyId: number;
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  discoveredAt: string;
  sentiment: Sentiment;
}
