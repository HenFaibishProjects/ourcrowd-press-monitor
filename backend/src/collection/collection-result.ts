export interface CollectionError {
  company?: string;
  url?: string;
  stage: 'provider' | 'article' | 'classification' | 'persistence' | 'alert';
  message: string;
}
export interface CollectionResult {
  companiesProcessed: number;
  companiesFailed: number;
  articlesFetched: number;
  invalidArticlesSkipped: number;
  duplicatesSkipped: number;
  classificationFailures: number;
  mentionsInserted: number;
  resultLimitCompanies: string[];
  aborted: boolean;
  errors: CollectionError[];
}
