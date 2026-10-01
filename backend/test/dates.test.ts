import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { daysSinceLastMention, isValidApiDate } from '../src/common/dates';
import { parseQuarter } from '../src/dashboard/quarter';

test('quarter parsing produces inclusive/exclusive UTC boundaries, including year rollover', () => {
  for (const [quarter, start, end] of [
    ['2026-Q1', '2026-01-01', '2026-04-01'],
    ['2026-Q2', '2026-04-01', '2026-07-01'],
    ['2026-Q3', '2026-07-01', '2026-10-01'],
    ['2026-Q4', '2026-10-01', '2027-01-01'],
    ['2024-Q1', '2024-01-01', '2024-04-01'],
    ['0099-Q4', '0099-10-01', '0100-01-01'],
    ['9999-Q4', '9999-10-01', '+010000-01-01'],
  ]) {
    const range = parseQuarter(quarter);
    assert.equal(range.start.toISOString(), `${start}T00:00:00.000Z`);
    assert.equal(range.end.toISOString(), `${end}T00:00:00.000Z`);
  }
  assert.equal(parseQuarter(undefined, new Date('2026-10-01T00:00:00Z')).quarter, '2026-Q4');
});

test('invalid quarter inputs are rejected', () => {
  for (const value of ['', '2026-Q0', '2026-Q5', '2026-q3', '26-Q3', '2026-Q3 ', '2026-Q3junk', '0000-Q1']) {
    assert.throws(() => parseQuarter(value), BadRequestException);
  }
});

test('days since mention uses elapsed full days and handles null, same-day and future dates', () => {
  const now = new Date('2026-10-01T10:00:00Z');
  assert.equal(daysSinceLastMention(null, now), null);
  assert.equal(daysSinceLastMention(new Date('2026-09-28T10:00:00Z'), now), 3);
  assert.equal(daysSinceLastMention(new Date('2026-09-30T10:00:01Z'), now), 0);
  assert.equal(daysSinceLastMention(new Date('2026-10-02T10:00:00Z'), now), 0);
});

test('date validation rejects calendar rollover, missing timezone and invalid clock values', () => {
  for (const value of ['2026-02-30', '2026-02-29', '2026-13-01', '0000-01-01', '2026-09-01T10:00:00', '2026-09-01T24:00:00Z', '2026-09-01T10:60:00Z', '', ['2026-01-01']]) {
    assert.equal(isValidApiDate(value), false);
  }
  for (const value of ['2024-02-29', '2026-09-30', '2026-09-30T23:59:59.999Z', '2026-10-01T03:00:00+03:00']) {
    assert.equal(isValidApiDate(value), true);
  }
});
