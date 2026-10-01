import { BadRequestException } from '@nestjs/common';

export interface QuarterRange {
  quarter: string;
  start: Date;
  end: Date;
}

export function parseQuarter(value?: string, now = new Date()): QuarterRange {
  const quarter = value ?? `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!match || Number(match[1]) === 0) throw new BadRequestException('quarter must be YYYY-Q1, YYYY-Q2, YYYY-Q3, or YYYY-Q4 (year 0001–9999)');
  const year = Number(match[1]);
  const month = (Number(match[2]) - 1) * 3;
  // setUTCFullYear avoids Date.UTC's special treatment of years 0–99.
  const start = new Date(0);
  start.setUTCFullYear(year, month, 1);
  const end = new Date(start);
  end.setUTCMonth(month + 3);
  return { quarter, start, end };
}
