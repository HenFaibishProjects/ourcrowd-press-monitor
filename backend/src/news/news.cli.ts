import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { CompanySearchService } from '../companies/company-search.service';
import { parseCollectionOptions } from '../collection/collection-options';
import { NEWS_PROVIDER, NewsProvider } from './news-provider';
import { NewsCliModule } from './news-cli.module';

async function run(): Promise<void> {
  const options = parseCollectionOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(NewsCliModule, { logger: ['warn', 'error'], abortOnError: false });
  try {
    const scope = app.get(CompanySearchService); const metadata = await scope.readMetadata();
    const companies = await scope.select(options.companies); const news = app.get<NewsProvider>(NEWS_PROVIDER);
    let failures = 0;
    for (const company of companies) {
      const queryName = scope.queryName(company, metadata);
      console.info(`${company.name}: query="${queryName}"; ${options.from.toISOString()} <= seenAt < ${options.to.toISOString()}`);
      try {
        const articles = await news.search({ companyName: company.name, queryName, ...options,
          onDiagnostics: (details) => console.info(`cache=${details.cache}; invalid=${details.invalidArticles}; limitReached=${details.resultLimitReached}`) });
        console.info(`articles=${articles.length}`);
        for (const article of articles.slice(0, 3)) console.info(`  ${article.title}\n  ${article.url}`);
      } catch (error: unknown) {
        failures++; console.error(error instanceof Error ? error.message : 'News search failed');
      }
    }
    if (failures) process.exitCode = 1;
  } finally { await app.close(); }
}
void run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'News command failed'); process.exitCode = 1; });
