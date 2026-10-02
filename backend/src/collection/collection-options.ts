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
export function collectionRange(values: { quarter?: string; from?: string; to?: string }, now = new Date()) {
  if (values.quarter !== undefined && (values.from !== undefined || values.to !== undefined)) {
    throw new BadRequestException('Use quarter OR from/to, not both');
  }
  let from: Date; let to: Date;
  if (values.from !== undefined || values.to !== undefined) {
    if (!values.from || !values.to) throw new BadRequestException('Both from and to are required');
    from = parseApiDate(values.from); const end = parseApiDate(values.to);
    to = isDateOnly(values.to) ? nextUtcDay(end) : end;
  } else {
    const current = parseQuarter(undefined, now);
    const range = values.quarter === 'current' ? current :
      values.quarter === undefined || values.quarter === 'previous' ? parseQuarter(undefined, new Date(current.start.getTime() - 1)) : parseQuarter(values.quarter);
    from = range.start; to = new Date(Math.min(range.end.getTime(), now.getTime()));
  }
  if (from >= to || to > now) throw new BadRequestException('Range must have from before exclusive to; future dates are unsupported');
  return { from, to };
}
export function parseCollectionOptions(args: string[], now = new Date()): CollectionOptions {
  let values: { companies?: string; all?: boolean; quarter?: string; from?: string; to?: string; refresh?: boolean; live?: boolean };
  try {
    const result = parseArgs({ args, strict: true, allowPositionals: false, options: {
      companies: { type: 'string' }, all: { type: 'boolean' }, quarter: { type: 'string' },
      from: { type: 'string' }, to: { type: 'string' }, refresh: { type: 'boolean' }, live: { type: 'boolean' },
    }, tokens: true });
    const names = result.tokens.filter((token) => token.kind === 'option').map((token) => token.name);
    if (new Set(names).size !== names.length) throw Error('Repeated options are not allowed');
    values = result.values;
  } catch (error: unknown) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid CLI arguments'); }
  if ((values.companies !== undefined) === Boolean(values.all)) throw new BadRequestException('Select --companies=Name,Name OR --all explicitly');
  if (values.refresh && values.live) throw new BadRequestException('Use --refresh OR --live, not both');
  const companies = values.companies?.split(',').map((name) => name.trim());
  if (companies?.some((name) => !name)) throw new BadRequestException('Company names must not be blank');
  return { companies, ...collectionRange(values, now), cacheMode: values.live ? 'live' : values.refresh ? 'refresh' : 'cached' };
}
