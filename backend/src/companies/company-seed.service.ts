import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CompaniesRepository } from './companies.repository';
import { CompanyImportReport, validateCompanySeed } from './company-seed';

@Injectable()
export class CompanySeedService {
  constructor(private readonly companies: CompaniesRepository) {}

  async importFile(path = resolve(__dirname, '../../../data/companies.json')): Promise<CompanyImportReport> {
    let text: string;
    try {
      text = await readFile(path, 'utf8');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new BadRequestException(`Company seed file not found: ${path}. Create data/companies.json using the real OurCrowd list; see data/README.md for the format.`);
      }
      throw new BadRequestException(`Cannot read company seed file: ${path}`);
    }
    let value: unknown;
    try { value = JSON.parse(text); }
    catch { throw new BadRequestException('Company seed file contains invalid JSON'); }
    return this.companies.importSeed(validateCompanySeed(value));
  }
}
