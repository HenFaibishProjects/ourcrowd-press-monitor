import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { OllamaSentimentClassifier } from './ollama-sentiment.classifier';
import { SENTIMENT_CLASSIFIER, SentimentClassifier } from './sentiment-classifier';
import { SentimentModule } from './sentiment.module';

async function run(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { company: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
    strict: true,
    allowPositionals: false,
  });
  if (!values.company?.trim() || !values.title?.trim()) {
    throw new Error('Usage: npm run sentiment -- --company "Company name" --title "Article title" [--description "Excerpt"]');
  }
  const app = await NestFactory.createApplicationContext(SentimentModule, { logger: false, abortOnError: false });
  try {
    console.info(`Model: ${app.get(OllamaSentimentClassifier).settings.model}`);
    const classifier = app.get<SentimentClassifier>(SENTIMENT_CLASSIFIER);
    const sentiment = await classifier.classify({ companyName: values.company, title: values.title, description: values.description });
    console.info(`Sentiment: ${sentiment}`);
  } finally { await app.close(); }
}

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Sentiment classification failed');
  process.exitCode = 1;
});
