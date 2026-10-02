import { Sentiment } from '../mentions/sentiment.enum';

export const SENTIMENT_CLASSIFIER = Symbol('SentimentClassifier');

export interface SentimentInput {
  companyName: string;
  title: string;
  description?: string | null;
}

export interface SentimentResult {
  relevant: boolean;
  sentiment: Sentiment | null;
}

export interface SentimentClassifier {
  classify(input: SentimentInput): Promise<SentimentResult>;
}
