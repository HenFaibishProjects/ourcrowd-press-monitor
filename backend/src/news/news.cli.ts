import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CompanySearchService } from '../companies/company-search.service';
import { parseCollectionOptions } from '../collection/collection-options';
import { NEWS_PROVIDER, NewsProvider } from './news-provider';
import { NewsCliModule } from './news-cli.module';

const logger = new Logger('NewsCommand');

async function run(): Promise<void> {
  const options = parseCollectionOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(NewsCliModule, {
    logger: ['log', 'warn', 'error'],
    abortOnError: false,
  });

  try {
    const companySearchService = app.get(CompanySearchService);
    const companyMetadata = await companySearchService.readMetadata();
    const selectedCompanies = await companySearchService.select(options.companies);
    const newsProvider = app.get<NewsProvider>(NEWS_PROVIDER);
    logger.log(
      `Starting news-only collection for ${selectedCompanies.length} companies, range ${options.from.toISOString()} to ${options.to.toISOString()} (exclusive end); no inference or Mention writes`,
    );
    let failures = 0;

    for (const company of selectedCompanies) {
      const queryName = companySearchService.queryName(company, companyMetadata);
      logger.log(`Searching news for ${company.name}: query="${queryName}"`);

      try {
        const articles = await newsProvider.search({
          companyName: company.name,
          queryName,
          ...options,
          onDiagnostics: (newsDiagnostics) =>
            logger.debug(
              `cache=${newsDiagnostics.cache}; invalid=${newsDiagnostics.invalidArticles}; limitReached=${newsDiagnostics.resultLimitReached}`,
            ),
        });
        logger.debug(
          `News preview for ${company.name}: showing up to 3 of ${articles.length} articles`,
        );

        for (const article of articles.slice(0, 3)) {
          logger.log(`  ${article.title}\n  ${article.url}`);
        }
      } catch (error: unknown) {
        failures++;
        logger.error(
          `News search failed for ${company.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    logger.log(
      `News-only collection completed: ${selectedCompanies.length} companies, ${failures} failures`,
    );

    if (failures) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  logger.error(`News command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
