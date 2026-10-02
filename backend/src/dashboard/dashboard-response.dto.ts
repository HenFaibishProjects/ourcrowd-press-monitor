export interface DashboardCompany {
  id: number;
  name: string;
  lastMentionedAt: string | null;
  daysSinceLastMention: number | null;
  mentions: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface DashboardResponse {
  quarter: string;
  companies: DashboardCompany[];
}
