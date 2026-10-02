import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { OllamaSentimentClassifier } from './ollama-sentiment.classifier';
import { SENTIMENT_CLASSIFIER, SentimentClassifier } from './sentiment-classifier';
import { SentimentModule } from './sentiment.module';

const logger = new Logger('SentimentCommand');

async function run(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      company: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (!values.company?.trim() || !values.title?.trim()) {
    throw new Error(
      'Usage: npm run sentiment -- --company "Company name" --title "Article title" [--description "Excerpt"]',
    );
  }

  const app = await NestFactory.createApplicationContext(SentimentModule, {
    logger: ['log', 'warn', 'error'],
    abortOnError: false,
  });

  try {
    console.info(`Model: ${app.get(OllamaSentimentClassifier).settings.model}`);
    const sentimentClassifier = app.get<SentimentClassifier>(SENTIMENT_CLASSIFIER);
    const sentiment = await sentimentClassifier.classify({
      companyName: values.company,
      title: values.title,
      description: values.description,
    });
    console.info(
  `Relevant: ${sentiment.relevant}, Sentiment: ${sentiment.sentiment}`,
);
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  logger.error(
    `Sentiment classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
  process.exitCode = 1;
});
