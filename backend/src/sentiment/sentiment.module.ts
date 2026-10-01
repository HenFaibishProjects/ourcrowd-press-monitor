import { Module } from '@nestjs/common';
import { environmentModule } from '../config/environment';
import { OllamaSentimentClassifier } from './ollama-sentiment.classifier';
import { SENTIMENT_CLASSIFIER } from './sentiment-classifier';

@Module({
  imports: [environmentModule],
  providers: [OllamaSentimentClassifier, { provide: SENTIMENT_CLASSIFIER, useExisting: OllamaSentimentClassifier }],
  exports: [SENTIMENT_CLASSIFIER],
})
export class SentimentModule {}
