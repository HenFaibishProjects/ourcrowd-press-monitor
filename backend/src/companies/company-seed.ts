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

export function isCompanyDomain(domain: string): boolean {
  return (
    domain.length <= 253 &&
    domain.split('.').every((domainLabel) => domainLabel.length <= 63) &&
    /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(domain)
  );
}

export function validateCompanySeed(seedContent: unknown): StructuredCompanySeed[] {
  if (!Array.isArray(seedContent)) {
    throw new BadRequestException('Company seed must be a JSON array');
  }

  const seenNameKeys = new Set<string>();
  const seenDomains = new Set<string>();

  return seedContent.map((seedEntry: unknown, companyIndex: number) => {
    const entryLabel = `Company seed row ${companyIndex + 1}`;

    if (typeof seedEntry !== 'object' || seedEntry === null || Array.isArray(seedEntry)) {
      throw new BadRequestException(`${entryLabel} must be an object`);
    }

    const companyFields = seedEntry as Record<string, unknown>;
    const requiredFields = ['name', 'rawName', 'domain', 'aliases', 'sector'];

    if (
      Object.keys(companyFields).some((fieldName) => !requiredFields.includes(fieldName)) ||
      requiredFields.some((fieldName) => !Object.hasOwn(companyFields, fieldName))
    ) {
      throw new BadRequestException(
        `${entryLabel} requires exactly name, rawName, domain, aliases and sector`,
      );
    }

    for (const field of ['name', 'rawName'] as const) {
      if (typeof companyFields[field] !== 'string' || !companyFields[field].trim()) {
        throw new BadRequestException(`${entryLabel} requires a non-blank string ${field}`);
      }
    }

    for (const field of ['domain', 'sector'] as const) {
      if (
        companyFields[field] !== null &&
        (typeof companyFields[field] !== 'string' || !companyFields[field].trim())
      ) {
        throw new BadRequestException(`${entryLabel} ${field} must be a non-blank string or null`);
      }
    }

    const name = (companyFields['name'] as string).trim();
    const domain = companyDomainKey(companyFields['domain'] as string | null);

    if (domain !== null && !isCompanyDomain(domain)) {
      throw new BadRequestException(
        `${entryLabel} domain must be a plain hostname, without protocol, path or port`,
      );
    }

    if (!Array.isArray(companyFields['aliases'])) {
      throw new BadRequestException(`${entryLabel} aliases must be a string array`);
    }

    const aliasKeys = new Set<string>();
    const aliases = companyFields['aliases'].map((alias: unknown) => {
      if (typeof alias !== 'string' || !alias.trim()) {
        throw new BadRequestException(`${entryLabel} aliases must be non-blank strings`);
      }

      const aliasKey = companyNameKey(alias);

      if (aliasKey === companyNameKey(name) || aliasKeys.has(aliasKey)) {
        throw new BadRequestException(
          `${entryLabel} aliases must be unique and different from the primary name`,
        );
      }

      aliasKeys.add(aliasKey);

      return alias.trim();
    });
    const nameKey = companyNameKey(name);

    if (seenNameKeys.has(nameKey) || (domain !== null && seenDomains.has(domain))) {
      throw new BadRequestException(
        `${entryLabel} duplicates a company name or domain in the seed file`,
      );
    }

    seenNameKeys.add(nameKey);

    if (domain !== null) {
      seenDomains.add(domain);
    }

    return {
      name,
      rawName: (companyFields['rawName'] as string).trim(),
      domain,
      aliases,
      sector: companyFields['sector'] === null ? null : (companyFields['sector'] as string).trim(),
    };
  });
}
