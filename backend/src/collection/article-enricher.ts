import { Injectable, Logger } from '@nestjs/common';

export interface EnrichedArticleContent {
  title?: string;
  description?: string;
  content: string;
}

@Injectable()
export class ArticleEnricher {
  private readonly logger = new Logger(ArticleEnricher.name);

  async fetchAndEnrich(url: string): Promise<EnrichedArticleContent | null> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10000); // 10s timeout
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OurCrowdPressMonitor/1.0',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: abortController.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch article ${url}, status: ${response.status}`);
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/html')) {
        this.logger.warn(`Skipping non-HTML content for ${url}: ${contentType}`);
        return null;
      }

      const html = await response.text();
      
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"[^>]*>/i);
      const title = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"[^>]*>/i) || html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"[^>]*>/i);
      const description = descMatch && descMatch[1] ? descMatch[1].trim() : undefined;

      const paragraphs: string[] = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(html)) !== null) {
        if (pMatch[1]) {
          const text = pMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (text.length > 20) {
            paragraphs.push(text);
          }
        }
      }

      let content = paragraphs.join('\n\n');
      if (content.length > 5000) {
        content = content.substring(0, 5000); // Cap to 5000 characters
      }

      return {
        title: title || undefined, // handle empty string gracefully
        description: description || undefined,
        content,
      };

    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        this.logger.warn(`Timeout fetching article ${url}`);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Error fetching article ${url}: ${msg}`);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
