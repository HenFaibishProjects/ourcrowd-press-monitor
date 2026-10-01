import { Controller, Get, Param } from '@nestjs/common';
import { CompanyIdDto, companyId } from '../common/company-id.dto';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  findAll(): Promise<Company[]> {
    return this.companies.findAll();
  }

  @Get(':id')
  findOne(@Param() params: CompanyIdDto): Promise<Company> {
    return this.companies.findOne(companyId(params.id));
  }
}
