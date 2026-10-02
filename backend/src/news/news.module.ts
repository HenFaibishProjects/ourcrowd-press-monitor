import { InternalServerErrorException, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { environmentModule } from '../config/environment';
import { GdeltNewsProvider } from './gdelt-news.provider';
import { FileNewsProvider } from './file-news.provider';
import { NEWS_PROVIDER } from './news-provider';

@Module({
  imports: [environmentModule],
  providers: [
    {
      provide: NEWS_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const providerName = configService.get<string>('NEWS_PROVIDER') ?? 'file';
        const logger = new Logger('NewsModule');

        if (providerName === 'file') {
          const newsProvider = new FileNewsProvider(configService);
          logger.log('News provider: file');
          return newsProvider;
        }

        if (providerName === 'gdelt') {
          const newsProvider = new GdeltNewsProvider(configService);
          logger.log('News provider: gdelt');
          return newsProvider;
        }

        throw new InternalServerErrorException('NEWS_PROVIDER must be file or gdelt');
      },
    },
  ],
  exports: [NEWS_PROVIDER],
})
export class NewsModule {}
