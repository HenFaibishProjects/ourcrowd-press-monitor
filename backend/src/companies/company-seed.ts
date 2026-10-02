import { BadRequestException } from '@nestjs/common';

// Persistence input intentionally excludes source-only search metadata.
export interface CompanySeed {
  name: string;
  domain?: string | null;
  sector?: string | null;
}
export interface StructuredCompanySeed {
  name: string;
  rawName: string;
  domain: string | null;
  aliases: string[];
  sector: string | null;
}
export interface CompanyImportReport {
  inserted: number;
  updated: number;
  unchanged: number;
}

export function companyNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function companyDomainKey(domain: string | null | undefined): string | null {
  return domain?.trim().toLowerCase() || null;
}

export function isCompanyDomain(value: string): boolean {
  return value.length <= 253 && value.split('.').every((label) => label.length <= 63) &&
    /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(value);
}

export function validateCompanySeed(value: unknown): StructuredCompanySeed[] {
  if (!Array.isArray(value)) throw new BadRequestException('Company seed must be a JSON array');
  const names = new Set<string>();
  const domains = new Set<string>();
  return value.map((entry: unknown, index: number) => {
    const label = `Company seed row ${index + 1}`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new BadRequestException(`${label} must be an object`);
    }
    const row = entry as Record<string, unknown>;
    const fields = ['name', 'rawName', 'domain', 'aliases', 'sector'];
    if (Object.keys(row).some((key) => !fields.includes(key)) || fields.some((key) => !Object.hasOwn(row, key))) {
      throw new BadRequestException(`${label} requires exactly name, rawName, domain, aliases and sector`);
    }
    for (const field of ['name', 'rawName'] as const) {
      if (typeof row[field] !== 'string' || !row[field].trim()) {
        throw new BadRequestException(`${label} requires a non-blank string ${field}`);
      }
    }
    for (const field of ['domain', 'sector'] as const) {
      if (row[field] !== null && (typeof row[field] !== 'string' || !row[field].trim())) {
        throw new BadRequestException(`${label} ${field} must be a non-blank string or null`);
      }
    }
    const name = (row['name'] as string).trim();
    const domain = companyDomainKey(row['domain'] as string | null);
    if (domain !== null && !isCompanyDomain(domain)) {
      throw new BadRequestException(`${label} domain must be a plain hostname, without protocol, path or port`);
    }
    if (!Array.isArray(row['aliases'])) throw new BadRequestException(`${label} aliases must be a string array`);
    const aliasKeys = new Set<string>();
    const aliases = row['aliases'].map((alias: unknown) => {
      if (typeof alias !== 'string' || !alias.trim()) throw new BadRequestException(`${label} aliases must be non-blank strings`);
      const key = companyNameKey(alias);
      if (key === companyNameKey(name) || aliasKeys.has(key)) {
        throw new BadRequestException(`${label} aliases must be unique and different from the primary name`);
      }
      aliasKeys.add(key);
      return alias.trim();
    });
    const nameKey = companyNameKey(name);
    if (names.has(nameKey) || (domain !== null && domains.has(domain))) {
      throw new BadRequestException(`${label} duplicates a company name or domain in the seed file`);
    }
    names.add(nameKey);
    if (domain !== null) domains.add(domain);
    return { name, rawName: (row['rawName'] as string).trim(), domain, aliases,
      sector: row['sector'] === null ? null : (row['sector'] as string).trim() };
  });
}
