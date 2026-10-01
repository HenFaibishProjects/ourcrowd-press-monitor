import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from './company.entity';
import { CompanyImportReport, CompanySeed, companyDomainKey, companyNameKey } from './company-seed';

@Injectable()
export class CompaniesRepository {
  constructor(@InjectRepository(Company) private readonly companies: Repository<Company>, private readonly database: DataSource) {}

  findAll(): Promise<Company[]> {
    return this.companies.find({ order: { name: 'ASC', id: 'ASC' } });
  }

  findById(id: number): Promise<Company | null> {
    return this.companies.findOneBy({ id });
  }

  async importSeed(seeds: CompanySeed[]): Promise<CompanyImportReport> {
    return this.database.transaction(async (manager) => {
      const repository = manager.getRepository(Company);
      const companies = await repository.find();
      const claimedIds = new Set<number>();
      const report: CompanyImportReport = { inserted: 0, updated: 0, unchanged: 0 };
      for (const seed of seeds) {
        const domain = companyDomainKey(seed.domain);
        const domainMatches = domain ? companies.filter((company) => companyDomainKey(company.domain) === domain) : [];
        const nameMatches = companies.filter((company) => companyNameKey(company.name) === companyNameKey(seed.name));
        if (domainMatches.length > 1 || nameMatches.length > 1 ||
            (domainMatches[0] && nameMatches[0] && domainMatches[0].id !== nameMatches[0].id)) {
          throw new ConflictException(`Ambiguous company identity for "${seed.name}"; resolve duplicate/conflicting names or domains before importing`);
        }
        const existing = domainMatches[0] ?? nameMatches[0];
        if (!existing) {
          const company = await repository.save(repository.create({ name: seed.name, domain: domain ?? null, sector: seed.sector ?? null }));
          companies.push(company);
          claimedIds.add(company.id);
          report.inserted++;
          continue;
        }
        if (claimedIds.has(existing.id)) {
          throw new ConflictException(`Multiple seed rows match company ${existing.id}; import cancelled`);
        }
        claimedIds.add(existing.id);
        if (domain && companyDomainKey(existing.domain) && companyDomainKey(existing.domain) !== domain) {
          throw new ConflictException(`Conflicting domain for "${seed.name}"; existing non-empty domains are not reassigned by name`);
        }
        const next = {
          name: seed.name,
          domain: seed.domain === undefined ? existing.domain : domain,
          sector: seed.sector === undefined ? existing.sector : seed.sector,
        };
        if (existing.name === next.name && existing.domain === next.domain && existing.sector === next.sector) {
          report.unchanged++;
        } else {
          // Keep original identities for the whole transaction so alias rows cannot match twice.
          await repository.save({ ...existing, ...next });
          report.updated++;
        }
      }
      return report;
    });
  }
}
