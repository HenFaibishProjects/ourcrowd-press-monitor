import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronTime } from 'cron';

export interface DailyConfig {
  enabled: boolean;
  cron: string;
  timezone: string;
  lookbackHours: number;
}

export function dailyConfig(configService: ConfigService): DailyConfig {
  const enabled = String(configService.get('DAILY_COLLECTION_ENABLED') ?? 'false');
  const cron = configService.get<string>('DAILY_COLLECTION_CRON') ?? '0 8 * * *';
  const timezone = configService.get<string>('DAILY_COLLECTION_TIMEZONE') ?? 'Asia/Jerusalem';
  const lookbackHoursText = String(configService.get('DAILY_COLLECTION_LOOKBACK_HOURS') ?? '48');
  const lookbackHours = Number(lookbackHoursText);

  if (
    !['true', 'false'].includes(enabled) ||
    !/^\d+$/.test(lookbackHoursText) ||
    !Number.isSafeInteger(lookbackHours) ||
    lookbackHours < 1 ||
    lookbackHours > 2160
  ) {
    throw new InternalServerErrorException(
      'DAILY_COLLECTION_ENABLED must be true/false and LOOKBACK_HOURS an integer 1–2160',
    );
  }

  try {
    new CronTime(cron, timezone);
  } catch {
    throw new InternalServerErrorException(
      'Invalid DAILY_COLLECTION_CRON or DAILY_COLLECTION_TIMEZONE',
    );
  }

  return {
    enabled: enabled === 'true',
    cron,
    timezone,
    lookbackHours,
  };
}
