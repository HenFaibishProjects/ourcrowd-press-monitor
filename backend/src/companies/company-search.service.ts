import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { companyJsonPath } from './company-preparation';
import { companyNameKey, StructuredCompanySeed, validateCompanySeed } from './company-seed';
import { Company } from './company.entity';
import { CompaniesService } from './companies.service';

export const DEVELOPMENT_COMPANIES = ['SpaceX', 'BioCatch', 'ZutaCore'] as const;

@Injectable()
export class CompanySearchService {

  constructor(private readonly companiesService: CompaniesService) {}

  async select(companyNames?: string[]): Promise<Company[]> {
    const trackedCompanies = await this.companiesService.findAll();

    if (trackedCompanies.length === 0) {
      throw new BadRequestException('No tracked companies; run npm run companies:setup first');
    }

    if (companyNames === undefined) {
      return trackedCompanies;
    }

    if (!companyNames.length || companyNames.some((name) => !name.trim())) {
      throw new BadRequestException('Company selection must not be empty');
    }

    const companyNameKeys = companyNames.map(companyNameKey);

    if (new Set(companyNameKeys).size !== companyNameKeys.length) {
      throw new BadRequestException('Company selection contains duplicate names');
    }

    return companyNames.map((name) => {
      const matchingCompanies = trackedCompanies.filter(
        (company) => companyNameKey(company.name) === companyNameKey(name),
      );

      if (matchingCompanies.length !== 1) {
        throw new BadRequestException(
          `Company "${name}" is missing or ambiguous; run company setup or resolve its identity`,
        );
      }

      return matchingCompanies[0]!;
    });
  }

  async readMetadata(): Promise<StructuredCompanySeed[]> {
    try {
      return validateCompanySeed(JSON.parse(await readFile(companyJsonPath, 'utf8')));
    } catch {
      throw new InternalServerErrorException(
        'Cannot load company search metadata; run npm run companies:prepare and validate backend/src/data/companies.json',
      );
    }
  }

  queryName(company: Company, companyMetadata: StructuredCompanySeed[]): string {
    const domainMatches = company.domain
      ? companyMetadata.filter(
          (companyMetadataEntry) =>
            companyMetadataEntry.domain?.toLowerCase() === company.domain!.toLowerCase(),
        )
      : [];
    const nameMatches = companyMetadata.filter(
      (companyMetadataEntry) =>
        companyNameKey(companyMetadataEntry.name) === companyNameKey(company.name),
    );

    if (
      domainMatches.length > 1 ||
      nameMatches.length > 1 ||
      (domainMatches[0] && nameMatches[0] && domainMatches[0] !== nameMatches[0])
    ) {
      throw new InternalServerErrorException(`Ambiguous search metadata for ${company.name}`);
    }

    const companyMetadataEntry = domainMatches[0] ?? nameMatches[0];

    // Use only an explicit expanded alias for an uppercase acronym of 2–6 letters.
    // Former aliases are deliberately excluded; no semantic or fuzzy name inference.
    if (
      companyMetadataEntry &&
      /^[A-Z]{2,6}$/.test(company.name) &&
      companyMetadataEntry.aliases.length === 1 &&
      !/\(\s*formerly\b/i.test(companyMetadataEntry.rawName) &&
      companyMetadataEntry.aliases[0]!.split(/\s+/).length > 1 &&
      companyMetadataEntry.aliases[0]!.replace(/[^\p{L}\p{N}]/gu, '').length > company.name.length
    ) {
      return companyMetadataEntry.aliases[0]!;
    }

    return company.name;
  }
}
