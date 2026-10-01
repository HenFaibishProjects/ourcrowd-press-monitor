import { BadRequestException } from '@nestjs/common';

export interface CompanySeed {
  name: string;
  domain?: string | null;
  sector?: string | null;
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

export function validateCompanySeed(value: unknown): CompanySeed[] {
  if (!Array.isArray(value)) throw new BadRequestException('Company seed must be a JSON array');
  const names = new Set<string>();
  const domains = new Set<string>();
  return value.map((entry: unknown, index: number) => {
    const label = `Company seed row ${index + 1}`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new BadRequestException(`${label} must be an object`);
    }
    const row = entry as Record<string, unknown>;
    if (Object.keys(row).some((key) => !['name', 'domain', 'sector'].includes(key))) {
      throw new BadRequestException(`${label} has unsupported fields; use name, domain and sector only`);
    }
    if (typeof row['name'] !== 'string' || !row['name'].trim()) {
      throw new BadRequestException(`${label} requires a non-blank string name`);
    }
    const seed: CompanySeed = { name: row['name'].trim() };
    for (const field of ['domain', 'sector'] as const) {
      if (!Object.hasOwn(row, field)) continue;
      const input = row[field];
      if (input !== null && typeof input !== 'string') {
        throw new BadRequestException(`${label} ${field} must be a string or null`);
      }
      seed[field] = typeof input === 'string' ? input.trim() || null : null;
    }
    seed.domain = Object.hasOwn(row, 'domain') ? companyDomainKey(seed.domain) : undefined;
    if (seed.domain !== undefined && seed.domain !== null &&
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(seed.domain)) {
      throw new BadRequestException(`${label} domain must be a plain hostname, without protocol, path or port`);
    }
    const nameKey = companyNameKey(seed.name);
    const domainKey = companyDomainKey(seed.domain);
    if (names.has(nameKey) || (domainKey !== null && domains.has(domainKey))) {
      throw new BadRequestException(`${label} duplicates a company name or domain in the seed file`);
    }
    names.add(nameKey);
    if (domainKey !== null) domains.add(domainKey);
    return seed;
  });
}
