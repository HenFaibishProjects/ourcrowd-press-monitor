import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { companyJsonPath } from './company-preparation';
import { companyNameKey, StructuredCompanySeed, validateCompanySeed } from './company-seed';
import { Company } from './company.entity';
import { CompaniesService } from './companies.service';

export const DEVELOPMENT_COMPANIES = ['SpaceX', 'BioCatch', 'ZutaCore'] as const;
@Injectable()
export class CompanySearchService {
  constructor(private readonly companies: CompaniesService) {}
  async select(names?: string[]): Promise<Company[]> {
    const companies = await this.companies.findAll();
    if (companies.length === 0) throw new BadRequestException('No tracked companies; run npm run companies:setup first');
    if (names === undefined) return companies;
    if (!names.length || names.some((name) => !name.trim())) throw new BadRequestException('Company selection must not be empty');
    const keys = names.map(companyNameKey);
    if (new Set(keys).size !== keys.length) throw new BadRequestException('Company selection contains duplicate names');
    return names.map((name) => {
      const matches = companies.filter((company) => companyNameKey(company.name) === companyNameKey(name));
      if (matches.length !== 1) throw new BadRequestException(`Company "${name}" is missing or ambiguous; run company setup or resolve its identity`);
      return matches[0]!;
    });
  }
  async readMetadata(): Promise<StructuredCompanySeed[]> {
    try { return validateCompanySeed(JSON.parse(await readFile(companyJsonPath, 'utf8'))); }
    catch { throw new InternalServerErrorException('Cannot load company search metadata; run npm run companies:prepare and validate backend/src/data/companies.json'); }
  }
  queryName(company: Company, metadata: StructuredCompanySeed[]): string {
    const byDomain = company.domain ? metadata.filter((row) => row.domain?.toLowerCase() === company.domain!.toLowerCase()) : [];
    const byName = metadata.filter((row) => companyNameKey(row.name) === companyNameKey(company.name));
    if (byDomain.length > 1 || byName.length > 1 || (byDomain[0] && byName[0] && byDomain[0] !== byName[0])) {
      throw new InternalServerErrorException(`Ambiguous search metadata for ${company.name}`);
    }
    const row = byDomain[0] ?? byName[0];
    // Use only an explicit expanded alias for an uppercase acronym of 2–6 letters.
    // Former aliases are deliberately excluded; no semantic or fuzzy name inference.
    if (row && /^[A-Z]{2,6}$/.test(company.name) && row.aliases.length === 1 &&
        !/\(\s*formerly\b/i.test(row.rawName) && row.aliases[0]!.split(/\s+/).length > 1 &&
        row.aliases[0]!.replace(/[^\p{L}\p{N}]/gu, '').length > company.name.length) return row.aliases[0]!;
    return company.name;
  }
}
