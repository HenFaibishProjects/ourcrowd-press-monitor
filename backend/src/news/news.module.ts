import { Module } from '@nestjs/common';
import { environmentModule } from '../config/environment';
import { GdeltNewsProvider } from './gdelt-news.provider';
import { NEWS_PROVIDER } from './news-provider';

@Module({
  imports: [environmentModule],
  providers: [GdeltNewsProvider, { provide: NEWS_PROVIDER, useExisting: GdeltNewsProvider }],
  exports: [NEWS_PROVIDER],
})
export class NewsModule {}
