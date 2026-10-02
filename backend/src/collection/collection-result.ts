export interface CollectionError {
  company?: string;
  url?: string;
  stage: 'provider' | 'article' | 'enrichment' | 'classification' | 'persistence' | 'alert';
  message: string;
}
export interface CollectionResult {
  companiesProcessed: number;
  companiesFailed: number;
  articlesFetched: number;
  invalidArticlesSkipped: number;
  duplicatesSkipped: number;
  articlesEnriched: number;
  enrichmentFailures: number;
  classificationFailures: number;
  irrelevantArticlesSkipped: number;
  mentionsInserted: number;
  resultLimitCompanies: string[];
  aborted: boolean;
  errors: CollectionError[];
}
