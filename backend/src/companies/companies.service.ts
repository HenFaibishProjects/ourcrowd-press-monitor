import { Injectable, NotFoundException } from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(private readonly companies: CompaniesRepository) {}

  findAll(): Promise<Company[]> {
    return this.companies.findAll();
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companies.findById(id);
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }
}
