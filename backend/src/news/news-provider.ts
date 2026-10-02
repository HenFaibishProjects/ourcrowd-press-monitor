export const NEWS_PROVIDER = Symbol('NEWS_PROVIDER');
export type NewsCacheMode = 'cached' | 'refresh' | 'live';
export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  description: string | null;
}
export interface NewsDiagnostics {
  query: string;
  requestUrl: string;
  cache: 'hit' | 'miss' | 'bypassed';
  invalidArticles: number;
  resultLimitReached: boolean;
}
export interface NewsSearchInput {
  companyName: string;
  queryName: string;
  from: Date;
  to: Date; // exclusive UTC boundary
  cacheMode?: NewsCacheMode;
  onDiagnostics?: (details: NewsDiagnostics) => void;
}
export interface NewsProvider {
  search(input: NewsSearchInput): Promise<NewsArticle[]>;
}
