import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';

@Injectable()
export class CompaniesRepository {
  constructor(@InjectRepository(Company) private readonly companies: Repository<Company>) {}

  findAll(): Promise<Company[]> {
    return this.companies.find({ order: { name: 'ASC', id: 'ASC' } });
  }

  findById(id: number): Promise<Company | null> {
    return this.companies.findOneBy({ id });
  }
}
