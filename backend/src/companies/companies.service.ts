import { Injectable, NotFoundException } from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(private readonly companiesRepository: CompaniesRepository) {}

  findAll(): Promise<Company[]> {
    return this.companiesRepository.findAll();
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companiesRepository.findById(id);
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }
}
