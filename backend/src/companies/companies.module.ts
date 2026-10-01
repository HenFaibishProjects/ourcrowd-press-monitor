import { CompanySeedService } from './company-seed.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { CompaniesService } from './companies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [CompaniesController],
  providers: [CompaniesRepository, CompaniesService, CompanySeedService],
  exports: [CompaniesService, CompanySeedService],
})
export class CompaniesModule {}
