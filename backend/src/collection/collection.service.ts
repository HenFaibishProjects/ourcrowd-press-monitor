import { BadRequestException, ConflictException, GatewayTimeoutException, Inject, Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
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

function validatedArticle(article: NewsArticle, options: CollectionOptions): NewsArticle {
  if (!article || typeof article.title !== 'string' || !article.title.trim() || typeof article.url !== 'string' ||
      typeof article.source !== 'string' || !article.source.trim() || !(article.publishedAt instanceof Date) ||
      !Number.isFinite(article.publishedAt.getTime()) || article.publishedAt < options.from || article.publishedAt >= options.to ||
      (article.description !== null && typeof article.description !== 'string')) throw new BadRequestException('Invalid article title, URL, source, timestamp, range or description');
  return { ...article, title: article.title.trim(), source: article.source.trim(), url: normalizeArticleUrl(article.url), description: article.description?.trim() || null };
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Unknown processing failure';

@Injectable()
export class CollectionService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly searchMetadata: CompanySearchService,
    private readonly mentions: MentionsService,
    @Inject(NEWS_PROVIDER) private readonly news: NewsProvider,
    @Inject(SENTIMENT_CLASSIFIER) private readonly classifier: SentimentClassifier,
    @Inject(ALERT_SERVICE) private readonly alerts: AlertService,
  ) {}
  async collect(options: CollectionOptions): Promise<CollectionResult> {
    if (!(options.from instanceof Date) || !(options.to instanceof Date) || !Number.isFinite(options.from.getTime()) ||
        !Number.isFinite(options.to.getTime()) || options.from >= options.to) throw new BadRequestException('Invalid collection range');
    const metadata = await this.searchMetadata.readMetadata();
    const selected = await this.searchMetadata.select(options.companies);
    const queries = selected.map((company) => this.searchMetadata.queryName(company, metadata));
    const result: CollectionResult = { companiesProcessed: 0, companiesFailed: 0, articlesFetched: 0,
      invalidArticlesSkipped: 0, duplicatesSkipped: 0, classificationFailures: 0, mentionsInserted: 0,
      resultLimitCompanies: [], aborted: false, errors: [] };
    const inserted: NewMentionAlert[] = [];
    let consecutiveTimeouts = 0;
    companies: for (let index = 0; index < selected.length; index++) {
      const company = selected[index]!;
      // Ensure the selected company still exists via the feature boundary, never TypeORM here.
      await this.companies.findOne(company.id);
      result.companiesProcessed++;
      let articles: NewsArticle[];
      try {
        articles = await this.news.search({ companyName: company.name, queryName: queries[index]!, from: options.from, to: options.to,
          cacheMode: options.cacheMode, onDiagnostics: (details) => {
            result.invalidArticlesSkipped += details.invalidArticles;
            if (details.resultLimitReached) result.resultLimitCompanies.push(company.name);
          } });
        if (!Array.isArray(articles)) throw new BadRequestException('Provider must return an article array');
      } catch (error: unknown) {
        result.companiesFailed++; result.errors.push({ company: company.name, stage: 'provider', message: message(error) });
        if (error instanceof InternalServerErrorException) { result.aborted = true; break; }
        continue;
      }
      result.articlesFetched += articles.length;
      const seen = new Set<string>();
      for (const input of articles) {
        let article: NewsArticle;
        try { article = validatedArticle(input, options); }
        catch (error: unknown) { result.invalidArticlesSkipped++; result.errors.push({ company: company.name, stage: 'article', message: message(error) }); continue; }
        if (seen.has(article.url)) { result.duplicatesSkipped++; continue; }
        seen.add(article.url);
        try {
          if (await this.mentions.exists(company.id, article.url)) { result.duplicatesSkipped++; continue; }
        } catch (error: unknown) {
          result.errors.push({ company: company.name, url: article.url, stage: 'persistence', message: message(error) });
          result.aborted = true; break companies;
        }
        let sentiment: Sentiment;
        try {
          sentiment = await this.classifier.classify({ companyName: company.name, title: article.title, description: article.description });
          consecutiveTimeouts = 0;
        } catch (error: unknown) {
          result.classificationFailures++;
          result.errors.push({ company: company.name, url: article.url, stage: 'classification', message: message(error) });
          if (error instanceof GatewayTimeoutException) consecutiveTimeouts++; else consecutiveTimeouts = 0;
          if (error instanceof ServiceUnavailableException || error instanceof InternalServerErrorException || consecutiveTimeouts >= 2) {
            result.aborted = true; break companies;
          }
          continue;
        }
        try {
          const mention = await this.mentions.create({ companyId: company.id, ...article, sentiment });
          inserted.push({ companyName: company.name, mention }); result.mentionsInserted++;
        } catch (error: unknown) {
          if (error instanceof ConflictException) result.duplicatesSkipped++;
          else result.errors.push({ company: company.name, url: article.url, stage: 'persistence', message: message(error) });
        }
      }
    }
    if (inserted.length) {
      try { await this.alerts.sendNewMentions(inserted); }
      catch (error: unknown) { result.errors.push({ stage: 'alert', message: message(error) }); }
    }
    return result;
  }
}
