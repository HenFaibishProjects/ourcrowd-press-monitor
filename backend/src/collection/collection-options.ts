import { BadRequestException } from '@nestjs/common';
import { parseArgs } from 'node:util';
import { isDateOnly, nextUtcDay, parseApiDate } from '../common/dates';
import { parseQuarter } from '../dashboard/quarter';
import { NewsCacheMode } from '../news/news-provider';

export interface CollectionOptions {
  companies?: string[]; // undefined means all tracked companies
  from: Date;
  to: Date; // exclusive
  cacheMode: NewsCacheMode;
}
export function collectionRange(argumentValues: { quarter?: string; from?: string; to?: string }, now = new Date()) {
  if (argumentValues.quarter !== undefined && (argumentValues.from !== undefined || argumentValues.to !== undefined)) {
    throw new BadRequestException('Use quarter OR from/to, not both');
  }
  let from: Date; let to: Date;
  if (argumentValues.from !== undefined || argumentValues.to !== undefined) {
    if (!argumentValues.from || !argumentValues.to) throw new BadRequestException('Both from and to are required');
    from = parseApiDate(argumentValues.from); const end = parseApiDate(argumentValues.to);
    to = isDateOnly(argumentValues.to) ? nextUtcDay(end) : end;
  } else {
    const currentQuarter = parseQuarter(undefined, now);
    const quarterRange = argumentValues.quarter === 'current' ? currentQuarter :
      argumentValues.quarter === undefined || argumentValues.quarter === 'previous' ? parseQuarter(undefined, new Date(currentQuarter.start.getTime() - 1)) : parseQuarter(argumentValues.quarter);
    from = quarterRange.start; to = new Date(Math.min(quarterRange.end.getTime(), now.getTime()));
  }
  if (from >= to || to > now) throw new BadRequestException('Range must have from before exclusive to; future dates are unsupported');
  return { from, to };
}
export function parseCollectionOptions(args: string[], now = new Date()): CollectionOptions {
  let argumentValues: { companies?: string; all?: boolean; quarter?: string; from?: string; to?: string; refresh?: boolean; live?: boolean };
  try {
    const parsedArguments = parseArgs({ args, strict: true, allowPositionals: false, options: {
      companies: { type: 'string' }, all: { type: 'boolean' }, quarter: { type: 'string' },
      from: { type: 'string' }, to: { type: 'string' }, refresh: { type: 'boolean' }, live: { type: 'boolean' },
    }, tokens: true });
    const optionNames = parsedArguments.tokens.filter((token) => token.kind === 'option').map((token) => token.name);
    if (new Set(optionNames).size !== optionNames.length) throw Error('Repeated options are not allowed');
    argumentValues = parsedArguments.values;
  } catch (error: unknown) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid CLI arguments'); }
  if ((argumentValues.companies !== undefined) === Boolean(argumentValues.all)) throw new BadRequestException('Select --companies=Name,Name OR --all explicitly');
  if (argumentValues.refresh && argumentValues.live) throw new BadRequestException('Use --refresh OR --live, not both');
  const companyNames = argumentValues.companies?.split(',').map((name) => name.trim());
  if (companyNames?.some((name) => !name)) throw new BadRequestException('Company names must not be blank');
  return { companies: companyNames, ...collectionRange(argumentValues, now), cacheMode: argumentValues.live ? 'live' : argumentValues.refresh ? 'refresh' : 'cached' };
}
