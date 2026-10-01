import { BadRequestException } from '@nestjs/common';

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}

// Check calendar components before Date parsing, which otherwise rolls February 30 forward.
export function isValidApiDate(value: unknown): value is string {
  if (typeof value !== 'string' || (!DATE_ONLY.test(value) && !TIMESTAMP.test(value))) return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined || year < 1) return false;
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) return false;
  if (!DATE_ONLY.test(value)) {
    const hour = Number(value.slice(11, 13));
    const minute = Number(value.slice(14, 16));
    const second = Number(value.slice(17, 19));
    if (hour > 23 || minute > 59 || second > 59) return false;
    const offset = /[+-](\d{2}):(\d{2})$/.exec(value);
    if (offset && (Number(offset[1]) > 23 || Number(offset[2]) > 59)) return false;
  }
  return Number.isFinite(Date.parse(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value));
}

export function parseApiDate(value: string): Date {
  if (!isValidApiDate(value)) throw new BadRequestException('Dates must be valid YYYY-MM-DD or ISO timestamps with timezone');
  return new Date(isDateOnly(value) ? `${value}T00:00:00.000Z` : value);
}

export function daysSinceLastMention(lastMentionedAt: Date | null, now = new Date()): number | null {
  return lastMentionedAt === null ? null : Math.max(0, Math.floor((now.getTime() - lastMentionedAt.getTime()) / DAY_MS));
}

export function nextUtcDay(date: Date): Date {
  return new Date(date.getTime() + DAY_MS);
}

// Match TypeORM's SQLite datetime serialization for parameterized range comparisons.
export function sqliteDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

export function fromSqliteDate(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}
