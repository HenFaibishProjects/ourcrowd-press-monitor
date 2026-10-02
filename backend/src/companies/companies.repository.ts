import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from './company.entity';
import { CompanyImportReport, CompanySeed, companyDomainKey, companyNameKey } from './company-seed';

@Injectable()
export class CompaniesRepository {

  constructor(
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    private readonly database: DataSource,
  ) {}

  findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      order: {
        name: 'ASC',
        id: 'ASC',
      },
    });
  }

  findById(id: number): Promise<Company | null> {
    return this.companyRepository.findOneBy({ id });
  }

  async importSeed(companySeeds: CompanySeed[]): Promise<CompanyImportReport> {
    return this.database.transaction(async (transactionManager) => {
      const companyRepository = transactionManager.getRepository(Company);
      const storedCompanies = await companyRepository.find();
      const matchedCompanyIds = new Set<number>();
      const importReport: CompanyImportReport = {
        inserted: 0,
        updated: 0,
        unchanged: 0,
      };

      for (const companySeed of companySeeds) {
        const domain = companyDomainKey(companySeed.domain);
        const domainMatches = domain
          ? storedCompanies.filter((company) => companyDomainKey(company.domain) === domain)
          : [];
        const nameMatches = storedCompanies.filter(
          (company) => companyNameKey(company.name) === companyNameKey(companySeed.name),
        );

        if (
          domainMatches.length > 1 ||
          nameMatches.length > 1 ||
          (domainMatches[0] && nameMatches[0] && domainMatches[0].id !== nameMatches[0].id)
        ) {
          throw new ConflictException(
            `Ambiguous company identity for "${companySeed.name}"; resolve duplicate/conflicting names or domains before importing`,
          );
        }

        const existingCompany = domainMatches[0] ?? nameMatches[0];

        if (!existingCompany) {
          const company = await companyRepository.save(
            companyRepository.create({
              name: companySeed.name,
              domain: domain ?? null,
              sector: companySeed.sector ?? null,
            }),
          );
          storedCompanies.push(company);
          matchedCompanyIds.add(company.id);
          importReport.inserted++;
          continue;
        }

        if (matchedCompanyIds.has(existingCompany.id)) {
          throw new ConflictException(
            `Multiple seed rows match company ${existingCompany.id}; import cancelled`,
          );
        }

        matchedCompanyIds.add(existingCompany.id);

        if (
          domain &&
          companyDomainKey(existingCompany.domain) &&
          companyDomainKey(existingCompany.domain) !== domain
        ) {
          throw new ConflictException(
            `Conflicting domain for "${companySeed.name}"; existing non-empty domains are not reassigned by name`,
          );
        }

        const updatedCompanyFields = {
          name: companySeed.name,
          domain: companySeed.domain === undefined ? existingCompany.domain : domain,
          sector: companySeed.sector === undefined ? existingCompany.sector : companySeed.sector,
        };

        if (
          existingCompany.name === updatedCompanyFields.name &&
          existingCompany.domain === updatedCompanyFields.domain &&
          existingCompany.sector === updatedCompanyFields.sector
        ) {
          importReport.unchanged++;
        } else {
          // Keep original identities for the whole transaction so alias rows cannot match twice.
          await companyRepository.save({
            ...existingCompany,
            ...updatedCompanyFields,
          });
          importReport.updated++;
        }
      }

      return importReport;
    });
  }
}
