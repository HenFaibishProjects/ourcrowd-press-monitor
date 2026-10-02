import { Injectable, Logger } from '@nestjs/common';
import { AlertService, NewMentionAlert } from './alert-service';

@Injectable()
export class ConsoleAlertService implements AlertService {
  private readonly logger = new Logger(ConsoleAlertService.name);

  async sendNewMentions(mentions: NewMentionAlert[]): Promise<void> {
    if (!mentions.length) {
      return;
    }

    this.logger.log(
      `${mentions.length} new press mentions\n` +
        mentions
          .map(
            ({ companyName, mention }) =>
              `${companyName} | ${mention.title} | ${mention.source} | ${mention.publishedAt.toISOString()} | ${mention.sentiment}\n${mention.url}`,
          )
          .join('\n'),
    );
  }
}
