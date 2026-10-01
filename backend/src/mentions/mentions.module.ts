import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module';
import { Mention } from './mention.entity';
import { MentionsController } from './mentions.controller';
import { MentionsRepository } from './mentions.repository';
import { MentionsService } from './mentions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mention]), CompaniesModule],
  controllers: [MentionsController],
  providers: [MentionsRepository, MentionsService],
  exports: [MentionsService],
})
export class MentionsModule {}
