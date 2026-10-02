import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { companyJsonPath } from './company-preparation';
import { CompaniesRepository } from './companies.repository';
import { CompanyImportReport, validateCompanySeed } from './company-seed';

@Injectable()
export class CompanySeedService {
  private readonly logger = new Logger(CompanySeedService.name);
  constructor(private readonly companiesRepository: CompaniesRepository) {}

  async importFile(path = companyJsonPath): Promise<CompanyImportReport> {
    this.logger.log(`Starting company import from ${path}`);
    let seedJson: string;
    try {
      seedJson = await readFile(path, 'utf8');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new BadRequestException(`Company seed file not found: ${path}. Run npm run companies:prepare to generate backend/src/data/companies.json from the supplied OurCrowd TXT; see backend/src/data/README.md.`);
      }
      throw new BadRequestException(`Cannot read company seed file: ${path}`);
    }
    let parsedSeed: unknown;
    try { parsedSeed = JSON.parse(seedJson); }
    catch { throw new BadRequestException('Company seed file contains invalid JSON'); }
    const companySeeds = validateCompanySeed(parsedSeed);
    const importReport = await this.companiesRepository.importSeed(companySeeds.map(({ name, domain, sector }) => ({ name, domain, sector })));
    this.logger.log(`Company import completed: ${importReport.inserted} inserted, ${importReport.updated} updated, ${importReport.unchanged} unchanged`);
    return importReport;
  }
}
