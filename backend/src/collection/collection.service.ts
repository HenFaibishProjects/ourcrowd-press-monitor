import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ALERT_SERVICE, AlertService, NewMentionAlert } from '../alerts/alert-service';
import { CompaniesService } from '../companies/companies.service';
import { CompanySearchService } from '../companies/company-search.service';
import { Sentiment } from '../mentions/sentiment.enum';
import { MentionsService } from '../mentions/mentions.service';
import { NEWS_PROVIDER, NewsArticle, NewsProvider } from '../news/news-provider';
import { normalizeArticleUrl } from '../news/url-normalization';
import { SENTIMENT_CLASSIFIER, SentimentClassifier } from '../sentiment/sentiment-classifier';
import { CollectionOptions } from './collection-options';
import { CollectionResult } from './collection-result';
import { ArticleEnricher } from './article-enricher';

function validatedArticle(article: NewsArticle, options: CollectionOptions): NewsArticle {
  if (
    !article ||
    typeof article.title !== 'string' ||
    !article.title.trim() ||
    typeof article.url !== 'string' ||
    typeof article.source !== 'string' ||
    !article.source.trim() ||
    !(article.publishedAt instanceof Date) ||
    !Number.isFinite(article.publishedAt.getTime()) ||
    article.publishedAt < options.from ||
    article.publishedAt >= options.to ||
    (article.description !== null && typeof article.description !== 'string')
  ) {
    throw new BadRequestException(
      'Invalid article title, URL, source, timestamp, range or description',
    );
  }

  return {
    ...article,
    title: article.title.trim(),
    source: article.source.trim(),
    url: normalizeArticleUrl(article.url),
    description: article.description?.trim() || null,
  };
}

const processingErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown processing failure';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly companiesService: CompaniesService,
    private readonly companySearchService: CompanySearchService,
    private readonly mentionsService: MentionsService,
    @Inject(NEWS_PROVIDER) private readonly newsProvider: NewsProvider,
    @Inject(SENTIMENT_CLASSIFIER) private readonly sentimentClassifier: SentimentClassifier,
    @Inject(ALERT_SERVICE) private readonly alertService: AlertService,
    private readonly articleEnricher: ArticleEnricher,
  ) {}

  async collect(options: CollectionOptions): Promise<CollectionResult> {
    if (
      !(options.from instanceof Date) ||
      !(options.to instanceof Date) ||
      !Number.isFinite(options.from.getTime()) ||
      !Number.isFinite(options.to.getTime()) ||
      options.from >= options.to
    ) {
      throw new BadRequestException('Invalid collection range');
    }

    const companyMetadata = await this.companySearchService.readMetadata();
    const selectedCompanies = await this.companySearchService.select(options.companies);
    const companyQueryNames = selectedCompanies.map((company) =>
      this.companySearchService.queryName(company, companyMetadata),
    );
    this.logger.log(
      `Starting press collection for ${selectedCompanies.length} companies, range ${options.from.toISOString()} to ${options.to.toISOString()} (exclusive end); news mode=${options.cacheMode}`,
    );
    const collectionResult: CollectionResult = {
      companiesProcessed: 0,
      companiesFailed: 0,
      articlesFetched: 0,
      invalidArticlesSkipped: 0,
      duplicatesSkipped: 0,
      articlesEnriched: 0,
      enrichmentFailures: 0,
      classificationFailures: 0,
      irrelevantArticlesSkipped: 0,
      mentionsInserted: 0,
      resultLimitCompanies: [],
      aborted: false,
      errors: [],
    };
    const newMentionAlerts: NewMentionAlert[] = [];
    let consecutiveTimeouts = 0;
    companies: for (let companyIndex = 0; companyIndex < selectedCompanies.length; companyIndex++) {
      const company = selectedCompanies[companyIndex]!;
      // Ensure the selected company still exists via the feature boundary, never TypeORM here.
      await this.companiesService.findOne(company.id);
      this.logger.log(`Processing company ${company.name}`);
      const countsBeforeCompany = {
        duplicates: collectionResult.duplicatesSkipped,
        inserted: collectionResult.mentionsInserted,
        classificationFailures: collectionResult.classificationFailures,
        irrelevant: collectionResult.irrelevantArticlesSkipped,
      };
      collectionResult.companiesProcessed++;
      let articles: NewsArticle[];

      try {
        articles = await this.newsProvider.search({
          companyName: company.name,
          queryName: companyQueryNames[companyIndex]!,
          from: options.from,
          to: options.to,
          cacheMode: options.cacheMode,
          onDiagnostics: (newsDiagnostics) => {
            collectionResult.invalidArticlesSkipped += newsDiagnostics.invalidArticles;

            if (newsDiagnostics.resultLimitReached) {
              collectionResult.resultLimitCompanies.push(company.name);
            }
          },
        });

        if (!Array.isArray(articles)) {
          throw new BadRequestException('Provider must return an article array');
        }
      } catch (error: unknown) {
        collectionResult.companiesFailed++;
        collectionResult.errors.push({
          company: company.name,
          stage: 'provider',
          message: processingErrorMessage(error),
        });
        this.logger.error(
          `News collection failed for ${company.name}: ${processingErrorMessage(error)}`,
        );

        if (error instanceof InternalServerErrorException) {
          this.logger.warn('Aborting press collection because news configuration is invalid');
          collectionResult.aborted = true;
          break;
        }

        continue;
      }

      this.logger.debug(`Received ${articles.length} articles for ${company.name}`);
      collectionResult.articlesFetched += articles.length;
      const seenArticleUrls = new Set<string>();

      for (const providerArticle of articles) {
        let article: NewsArticle;

        try {
          article = validatedArticle(providerArticle, options);
        } catch (error: unknown) {
          this.logger.warn(
            `Skipping invalid article for ${company.name}: ${processingErrorMessage(error)}`,
          );
          collectionResult.invalidArticlesSkipped++;
          collectionResult.errors.push({
            company: company.name,
            stage: 'article',
            message: processingErrorMessage(error),
          });
          continue;
        }

        if (seenArticleUrls.has(article.url)) {
          collectionResult.duplicatesSkipped++;
          continue;
        }

        seenArticleUrls.add(article.url);

        try {
          if (await this.mentionsService.exists(company.id, article.url)) {
            collectionResult.duplicatesSkipped++;
            continue;
          }
        } catch (error: unknown) {
          collectionResult.errors.push({
            company: company.name,
            url: article.url,
            stage: 'persistence',
            message: processingErrorMessage(error),
          });
          this.logger.error(
            `Mention lookup failed for ${company.name}; aborting collection: ${processingErrorMessage(error)}`,
          );
          collectionResult.aborted = true;
          break companies;
        }

        let enrichedData = null;
        try {
          enrichedData = await this.articleEnricher.fetchAndEnrich(article.url);
          if (enrichedData) {
            collectionResult.articlesEnriched++;
          } else {
            collectionResult.enrichmentFailures++;
          }
        } catch (error: unknown) {
          collectionResult.enrichmentFailures++;
          collectionResult.errors.push({
            company: company.name,
            url: article.url,
            stage: 'enrichment',
            message: processingErrorMessage(error),
          });
          this.logger.warn(
            `Article enrichment failed for ${article.url}: ${processingErrorMessage(error)}`,
          );
        }

        let sentiment: Sentiment | null = null;
        let isRelevant = false;

        try {
          const combinedDescription = enrichedData
            ? [enrichedData.description, enrichedData.content].filter(Boolean).join('\n\n').substring(0, 4000)
            : article.description;

          const classificationResult = await this.sentimentClassifier.classify({
            companyName: company.name,
            title: enrichedData?.title || article.title,
            description: combinedDescription || null,
          });
          
          isRelevant = classificationResult.relevant;
          sentiment = classificationResult.sentiment;
          consecutiveTimeouts = 0;
        } catch (error: unknown) {
          collectionResult.classificationFailures++;
          collectionResult.errors.push({
            company: company.name,
            url: article.url,
            stage: 'classification',
            message: processingErrorMessage(error),
          });
          this.logger.warn(
            `Sentiment classification failed for ${company.name}, source=${article.source}: ${processingErrorMessage(error)}`,
          );

          if (error instanceof GatewayTimeoutException) {
            consecutiveTimeouts++;
          } else {
            consecutiveTimeouts = 0;
          }

          if (
            error instanceof ServiceUnavailableException ||
            error instanceof InternalServerErrorException ||
            consecutiveTimeouts >= 2
          ) {
            this.logger.error(
              `Aborting press collection: sentiment service unavailable, invalid configuration or repeated timeouts for ${company.name}`,
            );
            collectionResult.aborted = true;
            break companies;
          }

          continue;
        }

        if (!isRelevant) {
          collectionResult.irrelevantArticlesSkipped++;
          continue;
        }

        try {
          const mention = await this.mentionsService.create({
            companyId: company.id,
            ...article,
            sentiment: sentiment as Sentiment,
          });
          newMentionAlerts.push({
            companyName: company.name,
            mention,
          });
          collectionResult.mentionsInserted++;
        } catch (error: unknown) {
          if (error instanceof ConflictException) {
            collectionResult.duplicatesSkipped++;
          } else {
            this.logger.error(
              `Mention persistence failed for ${company.name}, source=${article.source}: ${processingErrorMessage(error)}`,
            );
            collectionResult.errors.push({
              company: company.name,
              url: article.url,
              stage: 'persistence',
              message: processingErrorMessage(error),
            });
          }
        }
      }

      this.logger.log(
        `Company collection completed for ${company.name}: ${collectionResult.mentionsInserted - countsBeforeCompany.inserted} new mentions, ${collectionResult.duplicatesSkipped - countsBeforeCompany.duplicates} duplicate URLs skipped, ${collectionResult.classificationFailures - countsBeforeCompany.classificationFailures} classification failures, ${collectionResult.irrelevantArticlesSkipped - countsBeforeCompany.irrelevant} irrelevant skipped`,
      );
    }

    if (newMentionAlerts.length) {
      try {
        await this.alertService.sendNewMentions(newMentionAlerts);
        this.logger.log(`New-mention alert sent for ${newMentionAlerts.length} persisted mentions`);
      } catch (error: unknown) {
        this.logger.error(
          `New-mention alert failed for ${newMentionAlerts.length} persisted mentions; stored data is retained: ${processingErrorMessage(error)}`,
        );
        collectionResult.errors.push({
          stage: 'alert',
          message: processingErrorMessage(error),
        });
      }
    }

    this.logger.log(
      `Collection ${collectionResult.aborted ? 'aborted' : 'completed'}: ${collectionResult.companiesProcessed}/${selectedCompanies.length} companies processed, ${collectionResult.companiesFailed} provider failures, ${collectionResult.articlesFetched} articles, ${collectionResult.mentionsInserted} new mentions, ${collectionResult.duplicatesSkipped} duplicates skipped, ${collectionResult.invalidArticlesSkipped} invalid articles, ${collectionResult.classificationFailures} classification failures, ${collectionResult.articlesEnriched} enriched, ${collectionResult.enrichmentFailures} enrichment failures, ${collectionResult.irrelevantArticlesSkipped} irrelevant, ${collectionResult.errors.length} recorded errors`,
    );

    return collectionResult;
  }
}
