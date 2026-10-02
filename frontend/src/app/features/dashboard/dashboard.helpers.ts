import { DateRange } from '../../services/companies.service';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export function quarterDateRange(quarter: string): DateRange {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!match) {
    throw new Error('Invalid quarter');
  }
  const year = Number(match[1]);
  const startMonth = (Number(match[2]) - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const lastDay = new Date(Date.UTC(year, startMonth + 3, 0));
  // The API includes the entire `to` day when passed a date-only value.
  return { from: start.toISOString().slice(0, 10), to: lastDay.toISOString().slice(0, 10) };
}

export function readableDate(date: string | null): string {
  return date ? dateFormatter.format(new Date(date)) : 'Never';
}

export function coverageStatus(days: number | null): string {
  if (days === null) {
    return 'No mentions';
  }
  if (days <= 30) {
    return 'Recent';
  }
  if (days <= 90) {
    return 'Active';
  }
  return 'Quiet';
}

export function daysDisplay(days: number | null): string {
  if (days === null) {
    return '–';
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
