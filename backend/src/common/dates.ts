import { BadRequestException } from '@nestjs/common';

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isDateOnly(dateText: string): boolean {
  return DATE_ONLY.test(dateText);
}

// Check calendar components before Date parsing, which otherwise rolls February 30 forward.
export function isValidApiDate(dateText: unknown): dateText is string {
  if (typeof dateText !== 'string' || (!DATE_ONLY.test(dateText) && !TIMESTAMP.test(dateText))) return false;
  const [year, month, day] = dateText.slice(0, 10).split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined || year < 1) return false;
  const calendarDate = new Date(`${dateText.slice(0, 10)}T00:00:00.000Z`);
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() + 1 !== month || calendarDate.getUTCDate() !== day) return false;
  if (!DATE_ONLY.test(dateText)) {
    const hour = Number(dateText.slice(11, 13));
    const minute = Number(dateText.slice(14, 16));
    const second = Number(dateText.slice(17, 19));
    if (hour > 23 || minute > 59 || second > 59) return false;
    const timezoneOffsetMatch = /[+-](\d{2}):(\d{2})$/.exec(dateText);
    if (timezoneOffsetMatch && (Number(timezoneOffsetMatch[1]) > 23 || Number(timezoneOffsetMatch[2]) > 59)) return false;
  }
  return Number.isFinite(Date.parse(DATE_ONLY.test(dateText) ? `${dateText}T00:00:00.000Z` : dateText));
}

export function parseApiDate(dateText: string): Date {
  if (!isValidApiDate(dateText)) throw new BadRequestException('Dates must be valid YYYY-MM-DD or ISO timestamps with timezone');
  return new Date(isDateOnly(dateText) ? `${dateText}T00:00:00.000Z` : dateText);
}

export function daysSinceLastMention(lastMentionedAt: Date | null, now = new Date()): number | null {
  return lastMentionedAt === null ? null : Math.max(0, Math.floor((now.getTime() - lastMentionedAt.getTime()) / DAY_MS));
}

export function nextUtcDay(date: Date): Date {
  return new Date(date.getTime() + DAY_MS);
}

