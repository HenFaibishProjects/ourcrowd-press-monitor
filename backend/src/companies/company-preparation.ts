import { BadRequestException } from '@nestjs/common';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  companyNameKey,
  isCompanyDomain,
  StructuredCompanySeed,
  validateCompanySeed,
} from './company-seed';

// These source paths work from src and dist, independently of the CLI working directory.
export const companySourcePath = resolve(__dirname, '../..', 'src/data/ourcrowd_companies.txt');

export const companyJsonPath = resolve(__dirname, '../..', 'src/data/companies.json');

export type ParsingCategory = 'plain' | 'domain' | 'expandedAlias' | 'formerAlias' | 'fallback';

export function parseCompanyLine(line: string): {
  company: StructuredCompanySeed;
  category: ParsingCategory;
} {
  const rawName = line.trim();

  if (!rawName) {
    throw new BadRequestException('Company source line must be non-blank');
  }

  const company: StructuredCompanySeed = {
    name: rawName,
    rawName,
    domain: null,
    aliases: [],
    sector: null,
  };

  if (!/[()]/.test(rawName)) {
    return {
      company,
      category: 'plain',
    };
  }

  const fallback = {
    company,
    category: 'fallback' as const,
  };
  // Exactly one trailing, non-nested parenthetical with an explicit separating space.
  const parentheticalMatch = /^([^()]+?)\s+\(([^()]+)\)$/.exec(rawName);

  if (!parentheticalMatch) {
    return fallback;
  }

  const name = parentheticalMatch[1]!.trim();
  const parentheticalText = parentheticalMatch[2]!.trim();

  if (!name || !parentheticalText) {
    return fallback;
  }

  const domain = parentheticalText.toLowerCase();

  if (isCompanyDomain(domain)) {
    return {
      company: {
        ...company,
        name,
        domain,
      },
      category: 'domain',
    };
  }

  const formerAliasMatch = /^formerly\s+(?:known\s+as\s+)?(.+)$/i.exec(parentheticalText);
  const alias = formerAliasMatch ? formerAliasMatch[1]!.trim() : parentheticalText;

  // Incomplete former markers and URL-like/symbol-only contents are not company names.
  if (
    /^formerly(?:\s+known(?:\s+as)?)?$/i.test(parentheticalText) ||
    !/[\p{L}\p{N}]/u.test(alias) ||
    /[:/\\]/.test(alias) ||
    companyNameKey(alias) === companyNameKey(name)
  ) {
    return fallback;
  }

  return {
    company: {
      ...company,
      name,
      aliases: [alias],
    },
    category: formerAliasMatch ? 'formerAlias' : 'expandedAlias',
  };
}

export function prepareCompanyText(sourceText: string): {
  companies: StructuredCompanySeed[];
  counts: Record<ParsingCategory, number>;
  fallbackLines: string[];
} {
  const counts: Record<ParsingCategory, number> = {
    plain: 0,
    domain: 0,
    expandedAlias: 0,
    formerAlias: 0,
    fallback: 0,
  };
  const fallbackLines: string[] = [];
  const companies = sourceText
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const preparationResult = parseCompanyLine(line);
      counts[preparationResult.category]++;

      if (preparationResult.category === 'fallback') {
        fallbackLines.push(preparationResult.company.rawName);
      }

      return preparationResult.company;
    });

  return {
    companies: validateCompanySeed(companies),
    counts,
    fallbackLines,
  };
}

export function serializeCompanies(companies: StructuredCompanySeed[]): string {
  return `${JSON.stringify(companies, null, 2)}\n`;
}

export async function prepareCompanyFile(
  sourcePath = companySourcePath,
  outputPath = companyJsonPath,
) {
  if (resolve(sourcePath) === resolve(outputPath)) {
    throw new BadRequestException('Source and generated paths must differ');
  }

  let sourceText: string;

  try {
    sourceText = await readFile(sourcePath, 'utf8');
  } catch {
    throw new BadRequestException(
      `Cannot read OurCrowd source: ${sourcePath}. Restore the supplied TXT file; do not invent company entries.`,
    );
  }

  const preparationResult = prepareCompanyText(sourceText);
  // Validate the complete source before touching the generated file.
  await writeFile(outputPath, serializeCompanies(preparationResult.companies), 'utf8');

  return preparationResult;
}
