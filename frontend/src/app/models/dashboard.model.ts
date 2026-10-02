export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface MentionCounts {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface DashboardCompany {
  id: number;
  name: string;
  lastMentionedAt: string | null;
  daysSinceLastMention: number | null;
  mentions: MentionCounts;
}

export interface DashboardResponse {
  quarter: string;
  companies: DashboardCompany[];
}
